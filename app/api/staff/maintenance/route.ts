// app/api/staff/maintenance/route.ts
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

// POST - Create new maintenance request (staff submission)
export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = staff.userId as number;
    const body = await request.json();
    const { room_id, issue_description, priority = 'Normal' } = body;

    // Validation
    if (!room_id || !issue_description) {
      return NextResponse.json(
        { error: 'Room ID and issue description are required' },
        { status: 400 }
      );
    }

    // Verify room exists
    const roomCheck = await pool.query(
      'SELECT id FROM rooms WHERE id = $1',
      [room_id]
    );

    if (roomCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Insert maintenance request with Pending approval status
    const insertQuery = `
      INSERT INTO maintenance_logs (
        room_id, 
        reported_by_staff_id, 
        issue_description, 
        priority, 
        status,
        approval_status
      )
      VALUES ($1, $2, $3, $4, 'Pending', 'Pending')
      RETURNING 
        id, 
        log_reference, 
        room_id, 
        issue_description, 
        priority, 
        status, 
        approval_status,
        created_at
    `;

    const result = await pool.query(insertQuery, [
      room_id,
      staffId,
      issue_description,
      priority
    ]);

    return NextResponse.json({
      success: true,
      message: 'Maintenance request submitted for approval',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('[STAFF MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance request', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET - Get all maintenance requests submitted by this staff member
export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = staff.userId as number;

    const query = `
      SELECT 
        ml.id,
        ml.log_reference,
        ml.issue_description,
        ml.priority,
        ml.status,
        ml.approval_status,
        ml.rejection_reason,
        ml.created_at,
        ml.updated_at,
        ml.resolved_at,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        assigned_staff.first_name || ' ' || assigned_staff.last_name as assigned_to_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name,
        ml.approved_at
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN staff assigned_staff ON ml.assigned_to_staff_id = assigned_staff.id
      LEFT JOIN staff approver ON ml.approved_by = approver.id
      WHERE ml.reported_by_staff_id = $1
      ORDER BY ml.created_at DESC
    `;

    const result = await pool.query(query, [staffId]);

    return NextResponse.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    console.error('[STAFF MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests', details: (error as Error).message },
      { status: 500 }
    );
  }
}
