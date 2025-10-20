import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// Admin Bookings List API - Get all bookings with filters
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    const search = searchParams.get('search'); // Search by guest name, booking reference
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_amount,
        b.status,
        b.special_requests,
        b.created_at,
        g.id as guest_id,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email as guest_email,
        g.phone as guest_phone,
        r.room_number,
        rt.name as room_type,
        br.id as branch_id,
        br.name as branch_name,
        br.location as branch_location,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE booking_id = b.id 
          AND payment_status = 'Completed'
        ) as paid_amount
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (branchId && branchId !== 'all') {
      query += ` AND br.id = $${paramCount}`;
      params.push(parseInt(branchId));
      paramCount++;
    }

    if (status && status !== 'all') {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search && search.trim()) {
      query += ` AND (
        g.first_name ILIKE $${paramCount} OR 
        g.last_name ILIKE $${paramCount} OR
        g.email ILIKE $${paramCount} OR
        b.booking_reference ILIKE $${paramCount}
      )`;
      params.push(`%${search.trim()}%`);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'CheckedIn' THEN 1 END) as checked_in,
        COUNT(CASE WHEN status = 'CheckedOut' THEN 1 END) as checked_out,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(amount), 0) 
           FROM payments 
           WHERE booking_id = bookings.id 
           AND payment_status = 'Completed')
        ), 0) as collected_revenue
      FROM bookings
      ${branchId && branchId !== 'all' ? `
        WHERE room_id IN (
          SELECT id FROM rooms WHERE branch_id = ${parseInt(branchId)}
        )
      ` : ''}
    `;

    const statsResult = await pool.query(statsQuery);

    return NextResponse.json({
      bookings: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        limit,
        offset,
        total: parseInt(statsResult.rows[0].total_bookings)
      }
    });
  } catch (error) {
    console.error('Get admin bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: (error as Error).message },
      { status: 500 }
    );
  }
}
