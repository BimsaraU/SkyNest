import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// Force dynamic to avoid build-time evaluation/caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const branchId = searchParams.get('branchId') || null;

    // Calculate total days in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Get room occupancy data with calculated metrics
    const result = await pool.query(`
      SELECT 
        b.name AS branch_name,
        r.room_number,
        rt.name AS room_type,
        $1::INT AS total_days,
        COUNT(DISTINCT bk.id) AS occupied_days,
        CASE 
          WHEN $1::INT > 0 THEN ROUND((COUNT(DISTINCT bk.id)::NUMERIC / $1::NUMERIC) * 100, 1)
          ELSE 0
        END AS occupancy_rate,
        COALESCE(SUM(
          CASE 
            WHEN bk.id IS NOT NULL THEN 
              rt.base_price * LEAST(
                (bk.check_out_date - bk.check_in_date)::INT,
                ($2::DATE - GREATEST(bk.check_in_date, $3::DATE))::INT + 1
              )
            ELSE 0
          END
        ), 0) AS total_revenue
      FROM rooms r
      JOIN branches b ON r.branch_id = b.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN bookings bk ON r.id = bk.room_id 
        AND bk.status IN ('Confirmed', 'CheckedIn', 'CheckedOut')
        AND bk.check_in_date <= $2::DATE
        AND bk.check_out_date >= $3::DATE
      WHERE ($4::INT IS NULL OR r.branch_id = $4)
      GROUP BY b.name, r.room_number, rt.name, r.id
      ORDER BY b.name, r.room_number
    `, [totalDays, endDate, startDate, branchId ? parseInt(branchId) : null]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      filters: { startDate, endDate, branchId, totalDays }
    });
  } catch (error) {
    console.error('[OCCUPANCY REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate occupancy report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
