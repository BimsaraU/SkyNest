import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const limit = searchParams.get('limit') || '10';

    console.log('[TOP SERVICES] Fetching with params:', { startDate, endDate, limit });

    // Query service_usage table for actual usage data
    const result = await pool.query(`
      SELECT 
        COALESCE(sc.name, 'Unknown Service') AS service_name,
        COALESCE(sc.category, 'General') AS category,
        COUNT(su.id) AS usage_count,
        SUM(su.quantity) AS total_quantity,
        SUM(su.quantity * su.price_at_time) AS total_revenue,
        COUNT(DISTINCT su.booking_id) AS unique_bookings
      FROM service_usage su
      LEFT JOIN service_catalog sc ON su.service_id = sc.id
      WHERE su.service_date BETWEEN $1 AND $2
      GROUP BY sc.name, sc.category
      ORDER BY total_revenue DESC, usage_count DESC
      LIMIT $3
    `, [startDate, endDate, parseInt(limit)]);

    console.log('[TOP SERVICES] Found rows:', result.rows.length);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      filters: { startDate, endDate, limit }
    });
  } catch (error) {
    console.error('[TOP SERVICES REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate top services report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
