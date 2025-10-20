// app/api/admin/maintenance/[id]/assign/route.ts
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
    const body = await request.json();
    const { assigned_to_staff_id } = body;

    if (!assigned_to_staff_id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    // Verify staff exists
    const staffCheck = await pool.query(
      'SELECT id FROM staff WHERE id = $1',
      [assigned_to_staff_id]
    );

    if (staffCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Update maintenance request with assigned staff
    const updateQuery = `
      UPDATE maintenance_logs
      SET 
        assigned_to_staff_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      assigned_to_staff_id,
      requestId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Staff assigned successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('[ASSIGN MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to assign staff', details: (error as Error).message },
      { status: 500 }
    );
  }
}
