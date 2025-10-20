import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

interface Alert {
  id: string;
  type: 'maintenance' | 'service' | 'booking' | 'payment';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  title: string;
  message: string;
  status: string;
  created_at: string;
  reference: string;
  guest_name?: string;
  staff_name?: string;
  booking_reference?: string;
  room_info?: string;
  branch_name?: string;
  requires_action: boolean;
  assigned_to?: string;
  maintenance_id?: number;
  reported_by_staff?: string;
  reported_by_guest?: string;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';
    const branchId = searchParams.get('branchId') || 'all';

    const alerts: Alert[] = [];
    const branchCondition = branchId !== 'all' ? 'AND br.id = $1' : '';
    const queryParams: any[] = branchId !== 'all' ? [parseInt(branchId)] : [];

    let statusFilter = '';
    if (filter === 'pending') statusFilter = "AND ml.status = 'Pending'";
    else if (filter === 'in-progress') statusFilter = "AND ml.status = 'InProgress'";
    else if (filter === 'completed') statusFilter = "AND ml.status = 'Completed'";
    else if (filter === 'urgent') statusFilter = "AND ml.status IN ('Pending', 'InProgress') AND ml.priority IN ('Urgent', 'High')";
    else statusFilter = "AND ml.status IN ('Pending', 'InProgress')";

    const maintenanceResult = await pool.query(`
      SELECT ml.id, ml.log_reference, ml.issue_description, ml.priority, ml.status, ml.created_at,
        ml.assigned_to_staff_id, ml.reported_by_staff_id, ml.reported_by_guest_id,
        COALESCE(assigned_staff.first_name || ' ' || assigned_staff.last_name, 'Unassigned') as assigned_to,
        COALESCE(reporter_staff.first_name || ' ' || reporter_staff.last_name, '') as reported_by_staff,
        COALESCE(reporter_guest.first_name || ' ' || reporter_guest.last_name, '') as reported_by_guest,
        r.room_number, rt.name as room_type, br.name as branch_name, b.booking_reference,
        COALESCE(g.first_name || ' ' || g.last_name, '') as guest_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN staff assigned_staff ON ml.assigned_to_staff_id = assigned_staff.id
      LEFT JOIN staff reporter_staff ON ml.reported_by_staff_id = reporter_staff.id
      LEFT JOIN guests reporter_guest ON ml.reported_by_guest_id = reporter_guest.id
      LEFT JOIN bookings b ON b.room_id = r.id AND b.status IN ('Confirmed', 'CheckedIn') 
        AND b.check_in_date <= CURRENT_DATE AND b.check_out_date >= CURRENT_DATE
      LEFT JOIN guests g ON b.guest_id = g.id
      WHERE 1=1 ${branchCondition} ${statusFilter}
      ORDER BY CASE ml.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 WHEN 'Low' THEN 4 END, ml.created_at DESC
      ${filter === 'completed' ? 'LIMIT 20' : ''}
    `, queryParams);
    
    for (const row of maintenanceResult.rows) {
      alerts.push({
        id: 'maintenance-' + row.id,
        type: 'maintenance',
        priority: row.priority,
        title: 'Maintenance: ' + row.room_number,
        message: row.issue_description,
        status: row.status,
        created_at: row.created_at,
        reference: row.log_reference,
        guest_name: row.guest_name || undefined,
        assigned_to: row.assigned_to,
        reported_by_staff: row.reported_by_staff || undefined,
        reported_by_guest: row.reported_by_guest || undefined,
        booking_reference: row.booking_reference || undefined,
        room_info: row.room_number + ' (' + row.room_type + ')',
        branch_name: row.branch_name,
        requires_action: row.status === 'Pending' && !row.assigned_to_staff_id,
        maintenance_id: row.id
      });
    }

    alerts.sort((a, b) => {
      const priorityOrder: Record<string, number> = { 'Urgent': 1, 'High': 2, 'Normal': 3, 'Low': 4 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const actionRequiredCount = alerts.filter(a => a.requires_action).length;
    const urgentCount = alerts.filter(a => a.priority === 'Urgent' || a.priority === 'High').length;

    return NextResponse.json({ alerts, actionRequiredCount, urgentCount, totalCount: alerts.length });
  } catch (error) {
    console.error('[ALERTS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { maintenanceId, staffId, action } = body;

    if (!maintenanceId) {
      return NextResponse.json({ error: 'Maintenance ID required' }, { status: 400 });
    }

    let query = '';
    let params: any[] = [];

    if (action === 'assign' && staffId) {
      query = 'UPDATE maintenance_logs SET assigned_to_staff_id = $1, status = CASE WHEN status = $3 THEN $4 ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      params = [staffId, maintenanceId, 'Pending', 'InProgress'];
    } else if (action === 'unassign') {
      query = 'UPDATE maintenance_logs SET assigned_to_staff_id = NULL, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
      params = [maintenanceId, 'Pending'];
    } else if (action === 'complete') {
      query = 'UPDATE maintenance_logs SET status = $2, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
      params = [maintenanceId, 'Completed'];
    } else if (action === 'cancel') {
      query = 'UPDATE maintenance_logs SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
      params = [maintenanceId, 'Cancelled'];
    } else {
      return NextResponse.json({ error: 'Invalid action or missing staffId' }, { status: 400 });
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Maintenance log not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Maintenance ' + action + ' successful',
      maintenance: result.rows[0]
    });
  } catch (error) {
    console.error('[ALERTS API PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
