import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { sendEmail } from '@/lib/email';

// Utilities to handle date-only values to avoid timezone shifts
function toDateOnly(value: string): string {
  if (!value) return value;
  // Accept either YYYY-MM-DD or ISO; trim to date-only
  return value.slice(0, 10);
}

function dateOnlyToUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify guest token
async function verifyGuest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'guest') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Get guest's bookings
export async function GET(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;

    const result = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.total_amount,
        b.special_requests,
        b.created_at,
        b.checked_in_at,
        b.checked_out_at,
        r.room_number,
        rt.name AS room_type,
        rt.base_price,
        rt.images,
        br.name AS branch_name,
        br.location AS branch_location,
        br.address AS branch_address,
        p.payment_status,
        p.payment_method,
        p.amount AS payment_amount
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.guest_id = $1
      ORDER BY b.check_in_date DESC`,
      [guestId]
    );

    const now = new Date();
    const bookings = result.rows.map((booking) => {
      const checkInDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);

      let category = 'upcoming';
      if (booking.status === 'Cancelled' || booking.status === 'NoShow') {
        category = 'cancelled';
      } else if (checkOutDate < now || booking.status === 'CheckedOut') {
        category = 'past';
      } else if (checkInDate <= now && checkOutDate >= now) {
        category = 'active';
      }

      return {
        ...booking,
        category,
        can_modify: category === 'upcoming' && booking.status === 'Pending',
        can_cancel: category === 'upcoming' && ['Pending', 'Confirmed'].includes(booking.status),
        image: booking.images && booking.images.length > 0 ? booking.images[0] : '/B1.avif'
      };
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('[GUEST BOOKINGS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create a new booking with flexible payment options
export async function POST(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized - Please login to book' }, { status: 401 });
    }

    const guestId = guest.userId as number;
    const body = await request.json();
    const {
      room_id,
      check_in_date,
      check_out_date,
      number_of_guests,
      special_requests,
      payment_option,
      payment_amount,
      payment_method
    } = body;

    if (!room_id || !check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, check_in_date, check_out_date' },
        { status: 400 }
      );
    }

    const checkInStr = toDateOnly(check_in_date);
    const checkOutStr = toDateOnly(check_out_date);

    // Validate date ranges using UTC midnight to avoid tz offsets
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const checkInUTC = dateOnlyToUTC(checkInStr);
    const checkOutUTC = dateOnlyToUTC(checkOutStr);
    const todayUTC = dateOnlyToUTC(todayStr);

    if (checkInUTC < todayUTC) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    if (checkOutUTC <= checkInUTC) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    let bookingRow: any;
    let paymentRow: any = null;
    let roomRow: any;
    let nights = 0;
    let baseAmount = 0;

    try {
      const roomResult = await client.query(
    `SELECT 
      r.id,
      r.room_number,
      r.status,
      rt.base_price,
      rt.capacity AS max_occupancy,
      rt.name AS room_type,
      br.name AS branch_name,
      br.address AS branch_address
         FROM rooms r
         JOIN room_types rt ON r.room_type_id = rt.id
         JOIN branches br ON r.branch_id = br.id
         WHERE r.id = $1`,
        [room_id]
      );

      if (roomResult.rows.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      roomRow = roomResult.rows[0];

      if (number_of_guests && number_of_guests > roomRow.max_occupancy) {
        return NextResponse.json(
          { error: `Maximum occupancy for this room is ${roomRow.max_occupancy} guests` },
          { status: 400 }
        );
      }

      const conflictCheck = await client.query(
        `SELECT 1
           FROM bookings
          WHERE room_id = $1
            AND status NOT IN ('Cancelled', 'CheckedOut', 'NoShow')
            AND daterange(check_in_date, check_out_date, '[]') && daterange($2::date, $3::date, '[]')
          LIMIT 1`,
        [room_id, checkInStr, checkOutStr]
      );

      if (conflictCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Room is already booked for the selected dates' },
          { status: 409 }
        );
      }

  nights = Math.ceil((checkOutUTC - checkInUTC) / (1000 * 60 * 60 * 24));
      baseAmount = Number(roomRow.base_price) * nights;

      const timestamp = Date.now();
      const bookingReference = `BK-${timestamp.toString().slice(-8)}-${room_id}`;

      let initialPaidAmount = 0;
      if (payment_option && payment_option !== 'pay_later' && payment_amount) {
        initialPaidAmount = Number(payment_amount);
      }

      initialPaidAmount = Math.min(
        Math.max(Number.isFinite(initialPaidAmount) ? initialPaidAmount : 0, 0),
        baseAmount
      );

      let bookingStatus: string = 'Pending';
      if (payment_option === 'full' && initialPaidAmount >= baseAmount) {
        bookingStatus = 'Confirmed';
      }

      // Calculate totals explicitly to satisfy NOT NULL constraints even if triggers are missing
      const servicesAmount = 0.0;
      const totalAmount = Number((baseAmount + servicesAmount).toFixed(2));
      const outstandingAmount = Number((totalAmount - initialPaidAmount).toFixed(2));

      await client.query('BEGIN');

      const bookingInsert = await client.query(
        `INSERT INTO bookings (
            booking_reference,
            guest_id,
            room_id,
            check_in_date,
            check_out_date,
            number_of_guests,
            status,
            total_amount,
            special_requests,
            base_amount,
            services_amount,
            paid_amount,
            outstanding_amount
         ) VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id,
                   booking_reference,
                   guest_id,
                   room_id,
                   check_in_date,
                   check_out_date,
                   number_of_guests,
                   status,
                   base_amount,
                   services_amount,
                   total_amount,
                   paid_amount,
                   outstanding_amount,
                   special_requests`,
        [
          bookingReference,
          guestId,
          room_id,
          checkInStr,
          checkOutStr,
          number_of_guests || 1,
          bookingStatus,
          totalAmount,
          special_requests || null,
          baseAmount,
          servicesAmount,
          initialPaidAmount,
          outstandingAmount
        ]
      );

      bookingRow = bookingInsert.rows[0];

      // Wrap payment recording in a non-fatal try/catch so booking creation still succeeds if payment logging fails
      try {
        if (payment_option && payment_option !== 'pay_later' && initialPaidAmount > 0 && payment_method) {
          const paymentType = payment_option === 'reservation_fee' ? 'reservation_fee' :
                              payment_option === 'full' ? 'full' : 'partial';

          const paymentInsert = await client.query(
            `INSERT INTO payments (
                booking_id,
                amount,
                payment_method,
                payment_status,
                payment_type,
                paid_at,
                notes
             ) VALUES ($1, $2, $3::payment_method_enum, 'Completed', $4, CURRENT_TIMESTAMP, $5)
             RETURNING *`,
            [
              bookingRow.id,
              initialPaidAmount,
              payment_method,
              paymentType,
              payment_option === 'reservation_fee' ? 'Reservation fee payment' : 'Booking payment'
            ]
          );

          paymentRow = paymentInsert.rows[0];

          if (payment_option === 'full' && initialPaidAmount >= baseAmount && bookingRow.status !== 'Confirmed') {
            await client.query(`UPDATE bookings SET status = 'Confirmed' WHERE id = $1`, [bookingRow.id]);
            bookingRow.status = 'Confirmed';
          }
        }
      } catch (paymentError) {
        console.error('[BOOKING CREATE] Payment error (non-fatal):', paymentError);
        // Continue - booking is created even if payment record fails
      }

      const refreshedBooking = await client.query(
        `SELECT 
            b.id,
            b.booking_reference,
            b.guest_id,
            b.room_id,
            b.check_in_date,
            b.check_out_date,
            b.number_of_guests,
            b.status,
            b.base_amount,
            b.services_amount,
            b.total_amount,
            b.paid_amount,
            b.outstanding_amount,
            b.special_requests
         FROM bookings b
         WHERE b.id = $1`,
        [bookingRow.id]
      );

      bookingRow = refreshedBooking.rows[0];

      await client.query('COMMIT');
    } catch (dbError: any) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        console.error('[BOOKING CREATE] ROLLBACK failed:', rollbackError);
      });

      console.error('[BOOKING CREATE] INSERT failed:', {
        message: dbError?.message,
        code: dbError?.code,
        detail: dbError?.detail,
        hint: dbError?.hint,
        constraint: dbError?.constraint,
        table: dbError?.table,
        column: dbError?.column
      });

      const message = (dbError?.message || '').toLowerCase();
      if (message.includes('room is already booked')) {
        return NextResponse.json(
          { error: 'Room is already booked for the selected dates' },
          { status: 409 }
        );
      }

      if (message.includes('check-out date must be after check-in date')) {
        return NextResponse.json(
          { error: 'Check-out date must be after check-in date' },
          { status: 400 }
        );
      }

      if (dbError?.code === '23505') {
        return NextResponse.json(
          { error: 'Duplicate booking detected. Please try again.' },
          { status: 409 }
        );
      }

      throw dbError;
    } finally {
      client.release();
    }

    if (!bookingRow) {
      throw new Error('Booking insert failed to return a record');
    }

    const guestResult = await pool.query(
      `SELECT first_name, last_name, email FROM guests WHERE id = $1`,
      [guestId]
    );
    const guestData = guestResult.rows[0];

    console.log('[BOOKING CREATE] Final state:', {
      id: bookingRow.id,
      reference: bookingRow.booking_reference,
      status: bookingRow.status,
      total: Number(bookingRow.total_amount || 0),
      paid: Number(bookingRow.paid_amount || 0),
      outstanding: Number(bookingRow.outstanding_amount || 0)
    });

    if (guestData?.email) {
      const totalTxt = `$${Number(bookingRow.total_amount ?? baseAmount).toFixed(2)}`;
      const html = `
        <h2>Booking Confirmed</h2>
        <p>Hi ${guestData.first_name} ${guestData.last_name},</p>
        <p>Your booking <strong>${bookingRow.booking_reference}</strong> was created successfully.</p>
        <ul>
          <li>Room: ${roomRow.room_type} (${roomRow.room_number})</li>
          <li>Branch: ${roomRow.branch_name}</li>
          <li>Check-in: ${checkInStr}</li>
          <li>Check-out: ${checkOutStr}</li>
          <li>Nights: ${nights}</li>
          <li>Guests: ${number_of_guests || 1}</li>
          <li>Total: ${totalTxt}</li>
        </ul>
      `;
      sendEmail(guestData.email, 'Your Sky Nest booking confirmation', html).catch(err => {
        console.warn('[EMAIL][BookingConfirmation] failed (soft):', err?.message || err);
      });
    }

    return NextResponse.json({
      success: true,
      message:
        payment_option === 'pay_later'
          ? 'Booking created successfully. Payment can be made later.'
          : payment_option === 'reservation_fee'
          ? 'Booking created with reservation fee paid. Remaining balance can be paid later.'
          : 'Booking confirmed with full payment.',
      booking: {
        id: bookingRow.id,
        booking_reference: bookingRow.booking_reference,
        room_number: roomRow.room_number,
        room_type: roomRow.room_type,
        check_in_date: bookingRow.check_in_date,
        check_out_date: bookingRow.check_out_date,
        number_of_guests: bookingRow.number_of_guests,
        nights,
        base_amount: Number(bookingRow.base_amount || 0),
        services_amount: Number(bookingRow.services_amount || 0),
        total_amount: Number(bookingRow.total_amount || 0),
        paid_amount: Number(bookingRow.paid_amount || 0),
        outstanding_amount: Number(bookingRow.outstanding_amount || 0),
        status: bookingRow.status,
        payment: paymentRow
          ? {
              id: paymentRow.id,
              payment_reference: paymentRow.payment_reference,
              amount: Number(paymentRow.amount),
              payment_type: paymentRow.payment_type,
              payment_method: paymentRow.payment_method
            }
          : null
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[CREATE BOOKING] Error:', error);
    console.error('[CREATE BOOKING] Error details:', {
      message: (error as any).message,
      code: (error as any).code,
      detail: (error as any).detail,
      hint: (error as any).hint,
      stack: (error as any).stack
    });
    return NextResponse.json(
      {
        error: 'Failed to create booking',
        details: (error as Error).message,
        code: (error as any).code
      },
      { status: 500 }
    );
  }
}
