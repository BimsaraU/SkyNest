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

// POST - Mark maintenance task as completed with resolution notes
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
    const staffId = staff.userId as number;
    const body = await request.json();
    const { resolution_notes, parts_used, cost } = body;

    if (!resolution_notes || resolution_notes.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Resolution notes are required to complete a task' 
      }, { status: 400 });
    }

    // Verify task is assigned to this staff member
    const checkResult = await pool.query(
      'SELECT id, assigned_to_staff_id, room_id FROM maintenance_logs WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (checkResult.rows[0].assigned_to_staff_id !== staffId) {
      return NextResponse.json({ 
        error: 'Unauthorized - Task not assigned to you' 
      }, { status: 403 });
    }

    const roomId = checkResult.rows[0].room_id;

    // Update task to completed with resolution notes
    const updateResult = await pool.query(
      `UPDATE maintenance_logs 
      SET 
        status = 'Completed',
        notes = COALESCE(notes || '\n\n--- RESOLUTION ---\n', '') || $1,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *`,
      [resolution_notes, id]
    );

    // Update room status back to Available
    await pool.query(
      `UPDATE rooms SET status = 'Available', last_cleaned = CURRENT_TIMESTAMP WHERE id = $1`,
      [roomId]
    );

    // Fetch complete task details
    const detailsResult = await pool.query(
      `SELECT 
        ml.*,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        s.first_name || ' ' || s.last_name as assigned_to_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN staff s ON ml.assigned_to_staff_id = s.id
      WHERE ml.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      data: detailsResult.rows[0]
    });

  } catch (error) {
    console.error('[MAINTENANCE COMPLETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
