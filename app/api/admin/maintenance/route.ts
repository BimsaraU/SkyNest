// app/api/admin/maintenance/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get all maintenance requests with filtering
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let whereClause = '1=1';
    
    if (filter === 'pending') {
      whereClause = "ml.status = 'Pending'";
    } else if (filter === 'approved') {
      whereClause = "ml.status = 'InProgress'";
    } else if (filter === 'in-progress') {
      whereClause = "ml.status = 'InProgress'";
    } else if (filter === 'completed') {
      whereClause = "ml.status = 'Completed'";
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
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        reporter.first_name || ' ' || reporter.last_name as reported_by_name,
        assigned_staff.first_name || ' ' || assigned_staff.last_name as assigned_to_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN staff reporter ON ml.reported_by_staff_id = reporter.id
      LEFT JOIN staff assigned_staff ON ml.assigned_to_staff_id = assigned_staff.id
      WHERE ${whereClause}
      ORDER BY 
        CASE ml.status 
          WHEN 'Pending' THEN 0 
          ELSE 1 
        END,
        CASE ml.priority 
          WHEN 'Urgent' THEN 0 
          WHEN 'High' THEN 1 
          WHEN 'Normal' THEN 2 
          ELSE 3 
        END,
        ml.created_at DESC
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      requests: result.rows
    });
  } catch (error) {
    console.error('[ADMIN MAINTENANCE API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests', details: (error as Error).message },
      { status: 500 }
    );
  }
}
