// app/api/staff/maintenance/[id]/update-status/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify staff token
async function verifyStaff(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'staff') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// POST - Update task status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const taskId = parseInt(id);
    const staffId = staff.userId as number;
    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    if (!['Pending', 'InProgress', 'Completed', 'Cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify this task is assigned to this staff member
    const checkQuery = `
      SELECT id, status 
      FROM maintenance_logs 
      WHERE id = $1 AND assigned_to_staff_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [taskId, staffId]);
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Task not found or not assigned to you' },
        { status: 404 }
      );
    }

    const currentStatus = checkResult.rows[0].status;

    // Validate status transition
    if (currentStatus === 'Completed') {
      return NextResponse.json(
        { error: 'Cannot modify completed task' },
        { status: 400 }
      );
    }

    // Build update query based on new status
    let updateQuery = '';
    let queryParams: any[] = [];

    if (status === 'Completed') {
      // Completing task requires notes
      if (!notes || !notes.trim()) {
        return NextResponse.json(
          { error: 'Completion notes are required' },
          { status: 400 }
        );
      }
      
      updateQuery = `
        UPDATE maintenance_logs
        SET 
          status = $1,
          notes = $2,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      queryParams = [status, notes, taskId];
    } else {
      // Starting task or other status changes
      updateQuery = `
        UPDATE maintenance_logs
        SET 
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      queryParams = [status, taskId];
    }

    const result = await pool.query(updateQuery, queryParams);

    return NextResponse.json({
      success: true,
      message: `Task ${status === 'Completed' ? 'completed' : 'updated'} successfully`,
      task: result.rows[0]
    });
  } catch (error) {
    console.error('[UPDATE TASK STATUS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update task status', details: (error as Error).message },
      { status: 500 }
    );
  }
}
