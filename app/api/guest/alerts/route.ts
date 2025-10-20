import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify guest token
async function verifyGuest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'guest') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

interface Alert {
  id: string;
  type: 'maintenance';
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  title: string;
  message: string;
  status: string;
  created_at: string;
  reference: string;
  booking_reference?: string;
  room_info?: string;
  is_read: boolean;
  assigned_to?: string;
}

// GET - Get all alerts for guest (maintenance only)
export async function GET(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, unread
    const statusFilter = searchParams.get('status'); // InProgress, Pending, Completed, Cancelled

    const alerts: Alert[] = [];

    // Maintenance Alerts - Fetch maintenance requests for this guest
    // Check if approval_status column exists by trying a safer query
    let maintenanceQuery = `
      SELECT 
        ml.id,
        ml.log_reference,
        ml.issue_description,
        ml.priority,
        ml.status,
        ml.created_at,
        COALESCE(assigned_staff.first_name || ' ' || assigned_staff.last_name, 'Unassigned') as assigned_to_name,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      LEFT JOIN staff assigned_staff ON ml.assigned_to_staff_id = assigned_staff.id
      WHERE ml.reported_by_guest_id = $1`;
    
    // Add status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      maintenanceQuery += ` AND ml.status = $2`;
    }
    
    maintenanceQuery += ` ORDER BY ml.created_at DESC LIMIT 50`;

    console.log('[ALERTS API] Query params:', { guestId, statusFilter });

    const maintenanceResults = statusFilter && statusFilter !== 'all'
      ? await pool.query(maintenanceQuery, [guestId, statusFilter])
      : await pool.query(maintenanceQuery, [guestId]);
    
    console.log('[ALERTS API] Maintenance results:', maintenanceResults.rows.length);
      
    maintenanceResults.rows.forEach(row => {
      alerts.push({
        id: `maintenance-${row.id}`,
        type: 'maintenance',
        priority: row.priority,
        title: `Maintenance Request ${row.log_reference}`,
        message: row.issue_description,
        status: row.status,
        created_at: row.created_at,
        reference: row.log_reference,
        room_info: `${row.room_type} - Room ${row.room_number}, ${row.branch_name}`,
        assigned_to: row.assigned_to_name,
        is_read: row.status === 'Completed' || row.status === 'Cancelled'
      });
    });

    // Sort alerts by priority and date
    alerts.sort((a, b) => {
      const priorityOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Filter unread if requested
    const filteredAlerts = filter === 'unread' ? alerts.filter(a => !a.is_read) : alerts;

    console.log('[ALERTS API] Successfully fetched alerts:', {
      totalAlerts: alerts.length,
      filteredAlerts: filteredAlerts.length,
      unreadCount: alerts.filter(a => !a.is_read).length,
      statusFilter
    });

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      total_count: alerts.length,
      unread_count: alerts.filter(a => !a.is_read).length
    });
  } catch (error) {
    console.error('[ALERTS API] Error:', error);
    console.error('[ALERTS API] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', details: (error as Error).message },
      { status: 500 }
    );
  }
}
