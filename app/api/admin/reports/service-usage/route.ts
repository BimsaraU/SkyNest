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
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const branchId = searchParams.get('branchId') || null;

    // Query service_requests table for completed requests with all necessary details
    const result = await pool.query(`
      SELECT 
        sr.id,
        sr.request_reference,
        sr.request_type,
        sr.description,
        sr.priority,
        sr.status,
        sr.completed_at,
        sr.created_at,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email AS guest_email,
        COALESCE(sc.name, sr.request_type) AS service_name,
        COALESCE(sc.category, 'General') AS category,
        COALESCE(sc.price, 0) AS unit_price,
        1 AS quantity,
        COALESCE(sc.price, 0) AS total_price,
        b.name AS branch_name,
        r.room_number,
        bk.booking_reference,
        s.first_name || ' ' || s.last_name AS staff_name,
        DATE(sr.completed_at) AS usage_date
      FROM service_requests sr
      JOIN guests g ON sr.guest_id = g.id
      LEFT JOIN service_catalog sc ON sr.service_id = sc.id
      LEFT JOIN bookings bk ON sr.booking_id = bk.id
      LEFT JOIN rooms r ON bk.room_id = r.id
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN staff s ON sr.assigned_to_staff_id = s.id
      WHERE sr.status = 'Completed'
        AND sr.completed_at IS NOT NULL
        AND DATE(sr.completed_at) BETWEEN $1::DATE AND $2::DATE
        AND ($3::INT IS NULL OR r.branch_id = $3)
      ORDER BY sr.completed_at DESC, guest_name
    `, [startDate, endDate, branchId ? parseInt(branchId) : null]);

    // Calculate totals
    const totalRequests = result.rows.length;
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0);
    const uniqueGuests = new Set(result.rows.map(row => row.guest_name)).size;
    
    // Count by category
    const categoryBreakdown = result.rows.reduce((acc: any, row) => {
      const cat = row.category || 'General';
      if (!acc[cat]) {
        acc[cat] = { count: 0, revenue: 0 };
      }
      acc[cat].count += 1;
      acc[cat].revenue += parseFloat(row.total_price || 0);
      return acc;
    }, {});

    // Count by priority
    const priorityBreakdown = result.rows.reduce((acc: any, row) => {
      const priority = row.priority || 'Normal';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: totalRequests,
      summary: {
        totalRequests,
        totalRevenue,
        uniqueGuests,
        averageRevenuePerRequest: totalRequests > 0 ? totalRevenue / totalRequests : 0,
        categoryBreakdown,
        priorityBreakdown
      },
      filters: { startDate, endDate, branchId }
    });
  } catch (error) {
    console.error('[SERVICE USAGE REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate service usage report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
