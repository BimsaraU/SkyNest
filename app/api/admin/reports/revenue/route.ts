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
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();
    const branchId = searchParams.get('branchId') || null;

    const result = await pool.query(
      'SELECT * FROM report_monthly_revenue($1, $2, $3)',
      [parseInt(year), parseInt(month), branchId ? parseInt(branchId) : null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      filters: { year, month, branchId }
    });
  } catch (error) {
    console.error('[REVENUE REPORT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate revenue report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
