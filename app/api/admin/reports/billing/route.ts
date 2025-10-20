import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId') || null;
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const branchId = searchParams.get('branchId') || null;

    console.log('[BILLING REPORT] Fetching with params:', { guestId, includeHistory, branchId });

    // Ultra-simplified query - just get ALL bookings first
    let result;
    try {
      result = await pool.query(`
        SELECT 
          g.first_name || ' ' || g.last_name AS guest_name,
          g.email AS guest_email,
          g.phone AS guest_phone,
          bk.id AS booking_id,
          bk.booking_reference,
          bk.check_in_date,
          bk.check_out_date,
          bk.total_amount AS room_charges,
          bk.status AS booking_status,
          COALESCE(r.room_number, 'N/A') AS room_number,
          COALESCE(b.name, 'N/A') AS branch_name,
          COALESCE(rt.name, 'N/A') AS room_type
        FROM bookings bk
        JOIN guests g ON bk.guest_id = g.id
        LEFT JOIN rooms r ON bk.room_id = r.id
        LEFT JOIN branches b ON r.branch_id = b.id
        LEFT JOIN room_types rt ON r.room_type_id = rt.id
        ORDER BY bk.check_out_date DESC
      `);
      
      console.log('[BILLING REPORT] Found rows:', result.rows.length);
      
      if (result.rows.length === 0) {
        console.log('[BILLING REPORT] No bookings found in database!');
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          summary: {
            totalOutstanding: 0,
            totalRevenue: 0,
            totalPaid: 0,
            outstandingCount: 0,
            paidCount: 0
          },
          filters: { guestId, includeHistory, branchId },
          message: 'No bookings found in database'
        });
      }
    } catch (queryError) {
      console.error('[BILLING REPORT] Query error:', queryError);
      throw queryError;
    }

    console.log('[BILLING REPORT] Sample booking:', result.rows[0]);

    // Calculate service charges and payments for each booking
    const enrichedData = await Promise.all(result.rows.map(async (booking: any) => {
      let service_charges = 0;
      let paid_amount = 0;

      try {
        // Get service charges
        const serviceResult = await pool.query(`
          SELECT COALESCE(SUM(quantity * price_at_time), 0) AS service_charges
          FROM service_usage
          WHERE booking_id = $1
        `, [booking.booking_id]);
        service_charges = parseFloat(serviceResult.rows[0]?.service_charges || 0);
      } catch (err) {
        console.warn('[BILLING REPORT] Error fetching service charges for booking', booking.booking_id, err);
      }

      try {
        // Get paid amount
        const paymentResult = await pool.query(`
          SELECT COALESCE(SUM(amount), 0) AS paid_amount
          FROM payments
          WHERE booking_id = $1 AND payment_status = 'Completed'
        `, [booking.booking_id]);
        paid_amount = parseFloat(paymentResult.rows[0]?.paid_amount || 0);
      } catch (err) {
        console.warn('[BILLING REPORT] Error fetching payments for booking', booking.booking_id, err);
      }

      const total_amount = parseFloat(booking.room_charges || 0) + service_charges;
      const outstanding_balance = total_amount - paid_amount;

      return {
        ...booking,
        service_charges,
        total_amount,
        paid_amount,
        outstanding_balance,
        payment_status: outstanding_balance <= 0 ? 'Paid' : 'Outstanding'
      };
    }));

    console.log('[BILLING REPORT] Enriched data count:', enrichedData.length);

    // Calculate summary
    const totalOutstanding = enrichedData.reduce((sum, row) => sum + parseFloat(row.outstanding_balance || 0), 0);
    const totalRevenue = enrichedData.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
    const totalPaid = enrichedData.reduce((sum, row) => sum + parseFloat(row.paid_amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length,
      summary: {
        totalOutstanding,
        totalRevenue,
        totalPaid,
        outstandingCount: enrichedData.filter(r => r.payment_status === 'Outstanding').length,
        paidCount: enrichedData.filter(r => r.payment_status === 'Paid').length
      },
      filters: { guestId, includeHistory, branchId }
    });
  } catch (error) {
    console.error('[BILLING REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate billing report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
