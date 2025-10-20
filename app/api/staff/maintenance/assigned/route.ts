// app/api/staff/maintenance/assigned/route.ts
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

// GET - Get all maintenance tasks assigned to this staff member
export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = staff.userId as number;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    // Remove approval_status check - work with core columns only
    let whereClause = 'ml.assigned_to_staff_id = $1';
    
    if (filter === 'pending') {
      whereClause += " AND ml.status = 'Pending'";
    } else if (filter === 'in-progress') {
      whereClause += " AND ml.status = 'InProgress'";
    } else if (filter === 'completed') {
      whereClause += " AND ml.status = 'Completed'";
    }

    const query = `
      SELECT 
        ml.id,
        ml.log_reference,
        ml.issue_description,
        ml.priority,
        ml.status,
        ml.notes,
        ml.created_at,
        ml.updated_at,
        ml.resolved_at,
        ml.assigned_to_staff_id,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        br.id as branch_id
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE ${whereClause}
      ORDER BY 
        CASE ml.status 
          WHEN 'Pending' THEN 0 
          WHEN 'InProgress' THEN 1
          ELSE 2 
        END,
        CASE ml.priority 
          WHEN 'Urgent' THEN 0 
          WHEN 'High' THEN 1 
          WHEN 'Normal' THEN 2 
          ELSE 3 
        END,
        ml.created_at DESC
    `;

    console.log('[STAFF MAINTENANCE] Fetching tasks for staff:', staffId);
    const result = await pool.query(query, [staffId]);
    console.log('[STAFF MAINTENANCE] Found tasks:', result.rows.length);

    return NextResponse.json({
      success: true,
      tasks: result.rows
    });
  } catch (error) {
    console.error('[STAFF ASSIGNED TASKS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned tasks', details: (error as Error).message },
      { status: 500 }
    );
  }
}
