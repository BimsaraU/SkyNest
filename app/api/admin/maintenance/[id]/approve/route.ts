// app/api/admin/maintenance/[id]/approve/route.ts
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
    const { assigned_to_staff_id } = body;

    // Update maintenance request to approved (assign staff and set to InProgress)
    const updateQuery = `
      UPDATE maintenance_logs
      SET 
        status = $1,
        assigned_to_staff_id = $2,
        notes = COALESCE(notes || E'\n', '') || 'Approved by admin ID ' || $3 || ' at ' || CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const newStatus = assigned_to_staff_id ? 'InProgress' : 'Pending';
    
    const result = await pool.query(updateQuery, [
      newStatus,
      assigned_to_staff_id || null,
      adminId,
      requestId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Maintenance request approved',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('[APPROVE MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve request', details: (error as Error).message },
      { status: 500 }
    );
  }
}
