// app/api/admin/maintenance/[id]/reject/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const requestId = parseInt(id);
    const adminId = admin.userId as number;
    const body = await request.json();
    const { rejection_reason } = body;

    if (!rejection_reason || !rejection_reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Update maintenance request to rejected (cancelled)
    const updateQuery = `
      UPDATE maintenance_logs
      SET 
        status = 'Cancelled',
        notes = COALESCE(notes || E'\n', '') || 'Rejected by admin ID ' || $1 || ': ' || $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      adminId,
      rejection_reason,
      requestId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Maintenance request rejected',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('[REJECT MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject request', details: (error as Error).message },
      { status: 500 }
    );
  }
}
