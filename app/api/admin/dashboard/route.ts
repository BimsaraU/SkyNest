import { NextResponse, NextRequest } from 'next/server';
import pool from '../../../../lib/db';
import { verifyAdmin } from '../../../../lib/adminAuth';

// Admin Dashboard API - Updated for V2 Schema (Separated User Tables)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all data-gathering queries concurrently for performance
    const [
      statsRes,
      branchInfoRes,
      roomCountsRes,
      occupiedCountsRes,
      branchRevenueRes,
      recentActivitiesRes,
      adminInfoRes,
      pendingMaintenanceRes,
      guestCountRes,
      todayCheckInsRes,
      todayCheckOutsRes
    ] = await Promise.all([
      // 1. Get main stats: total bookings, revenue, staff count (V2 Schema)
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM bookings) AS "totalBookings",
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'Completed') AS "totalRevenue",
          (SELECT COUNT(*) FROM staff WHERE is_active = true) AS "activeStaff",
          (SELECT COUNT(*) FROM admins WHERE is_active = true) AS "activeAdmins"
      `),
      // 2. Get branch info (V2 Schema)
      pool.query('SELECT id, name, location FROM branches WHERE is_active = true ORDER BY name'),
      // 3. Get total room count for each branch
      pool.query('SELECT branch_id, COUNT(*) as total_rooms FROM rooms GROUP BY branch_id'),
      // 4. Get occupied room count for each branch (Check both Occupied status and active bookings)
      pool.query(`
        SELECT r.branch_id, COUNT(DISTINCT r.id) as occupied_rooms 
        FROM rooms r 
        LEFT JOIN bookings b ON r.id = b.room_id 
          AND b.status IN ('Confirmed', 'CheckedIn') 
          AND CURRENT_DATE BETWEEN b.check_in_date AND b.check_out_date
        WHERE r.status = 'Occupied' OR b.id IS NOT NULL
        GROUP BY r.branch_id
      `),
      // 5. Get revenue per branch from completed payments
      pool.query(`
        SELECT 
          r.branch_id,
          COALESCE(SUM(p.amount), 0) as total_revenue
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN rooms r ON b.room_id = r.id
        WHERE p.payment_status = 'Completed'
        GROUP BY r.branch_id
      `),
      // 6. Get recent booking activities (V2 Schema - joins with guests table)
      pool.query(`
        SELECT 
          b.id,
          b.booking_reference AS description,
          TO_CHAR(b.created_at, 'HH12:MI AM') as time,
          g.first_name || ' ' || g.last_name as guest_name,
          b.status
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        ORDER BY b.created_at DESC 
        LIMIT 5
      `),
      // 7. Get info for the logged-in admin (V2 Schema - separate admins table)
      pool.query(`
        SELECT first_name, last_name, access_level, email
        FROM admins 
        WHERE id = $1
      `, [admin.userId]),
      // 8. Get pending maintenance APPROVALS from maintenance_logs
      pool.query(`
        SELECT 
          m.id,
          m.log_reference,
          'Maintenance' as type,
          m.issue_description as description,
          m.priority,
          b.name as branch,
          r.room_number,
          m.created_at,
          reporter.first_name || ' ' || reporter.last_name as reported_by
        FROM maintenance_logs m
        JOIN rooms r ON m.room_id = r.id
        JOIN branches b ON r.branch_id = b.id
        LEFT JOIN staff reporter ON m.reported_by_staff_id = reporter.id
        WHERE m.status = 'Pending'
        ORDER BY 
          CASE m.priority 
            WHEN 'Urgent' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Normal' THEN 3
            WHEN 'Low' THEN 4
          END,
          m.created_at DESC
        LIMIT 6
      `),
      // 9. Get total guest count (V2 Schema)
      pool.query('SELECT COUNT(*) as guest_count FROM guests WHERE is_active = true'),
      // 10. Get today's check-ins
      pool.query(`
        SELECT COUNT(*) as today_checkins 
        FROM bookings 
        WHERE check_in_date = CURRENT_DATE 
        AND status IN ('Confirmed', 'Pending')
      `),
      // 11. Get today's check-outs
      pool.query(`
        SELECT COUNT(*) as today_checkouts 
        FROM bookings 
        WHERE check_out_date = CURRENT_DATE 
        AND status = 'CheckedIn'
      `)
    ]);

    // Process and combine the data
    const stats = statsRes.rows[0];
    const guestCount = guestCountRes.rows[0].guest_count || 0;
    const todayCheckIns = todayCheckInsRes.rows[0].today_checkins || 0;
    const todayCheckOuts = todayCheckOutsRes.rows[0].today_checkouts || 0;
    
    const totalRooms = roomCountsRes.rows.reduce((sum, row) => sum + parseInt(row.total_rooms, 10), 0);
    const totalOccupied = occupiedCountsRes.rows.reduce((sum, row) => sum + parseInt(row.occupied_rooms, 10), 0);

    const overallStats = {
      totalBookings: parseInt(stats.totalBookings, 10) || 0,
      totalRevenue: parseFloat(stats.totalRevenue) || 0,
      activeStaff: parseInt(stats.activeStaff, 10) || 0,
      activeAdmins: parseInt(stats.activeAdmins, 10) || 0,
      totalGuests: guestCount,
      occupancyRate: totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0,
      totalRooms,
      occupiedRooms: totalOccupied,
      availableRooms: totalRooms - totalOccupied,
      todayCheckIns,
      todayCheckOuts
    };
    
    // Create maps for quick lookups
    const roomCountsMap = new Map(roomCountsRes.rows.map(r => [r.branch_id, parseInt(r.total_rooms, 10)]));
    const occupiedMap = new Map(occupiedCountsRes.rows.map(r => [r.branch_id, parseInt(r.occupied_rooms, 10)]));
    const revenueMap = new Map(branchRevenueRes.rows.map(r => [r.branch_id, parseFloat(r.total_revenue)]));

    const branchStats = branchInfoRes.rows.map(branch => {
      const total = roomCountsMap.get(branch.id) || 0;
      const occupied = occupiedMap.get(branch.id) || 0;
      const revenue = revenueMap.get(branch.id) || 0;
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
      
      console.log(`[DASHBOARD] Branch: ${branch.name}, Total: ${total}, Occupied: ${occupied}, Revenue: ${revenue}, Rate: ${occupancyRate}%`);
      
      return {
        id: branch.id,
        name: branch.name,
        location: branch.location,
        totalRooms: total,
        occupiedRooms: occupied,
        availableRooms: total - occupied,
        occupancy: occupancyRate,
        revenue: revenue,
      };
    });

    console.log('[DASHBOARD] Room counts map:', Object.fromEntries(roomCountsMap));
    console.log('[DASHBOARD] Occupied map:', Object.fromEntries(occupiedMap));

    const adminInfo = adminInfoRes.rows[0];

    const dashboardData = {
      overallStats,
      branchStats,
      recentActivities: recentActivitiesRes.rows,
      admin: adminInfo 
        ? { 
            name: `${adminInfo.first_name} ${adminInfo.last_name}`, 
            role: adminInfo.access_level,
            email: adminInfo.email
          }
        : { name: 'Admin', role: 'SuperAdmin', email: '' },
      pendingApprovals: pendingMaintenanceRes.rows,
    };

    return NextResponse.json(dashboardData);

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch dashboard data', details: errorMessage }, { status: 500 });
  }
}

