import { NextResponse, NextRequest } from 'next/server';
import pool from '../../../../lib/db';
import { verifyAdmin } from '../../../../lib/adminAuth';

// Admin Reports API - Provides comprehensive analytics and reporting data
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || 'month'; // day, week, month, year
    const branchId = searchParams.get('branchId') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    let dateGrouping = '';
    let paymentDateFilter = '';
    
    // Use custom date range if provided
    if (startDate && endDate) {
      dateFilter = `AND b.created_at BETWEEN '${startDate}'::date AND '${endDate}'::date + INTERVAL '1 day'`;
      paymentDateFilter = `AND p.paid_at BETWEEN '${startDate}'::date AND '${endDate}'::date + INTERVAL '1 day'`;
    } else {
      // Fallback to period-based filtering
      switch (period) {
        case 'day':
          dateFilter = "AND b.created_at >= CURRENT_DATE - INTERVAL '7 days'";
          paymentDateFilter = "AND p.paid_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'week':
          dateFilter = "AND b.created_at >= CURRENT_DATE - INTERVAL '8 weeks'";
          paymentDateFilter = "AND p.paid_at >= CURRENT_DATE - INTERVAL '8 weeks'";
          break;
        case 'year':
          dateFilter = "AND b.created_at >= CURRENT_DATE - INTERVAL '12 months'";
          paymentDateFilter = "AND p.paid_at >= CURRENT_DATE - INTERVAL '12 months'";
          break;
        case 'month':
        default:
          dateFilter = "AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'";
          paymentDateFilter = "AND p.paid_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
    }
    
    // Date grouping based on period type
    switch (period) {
      case 'day':
        dateGrouping = "TO_CHAR(p.paid_at, 'Mon DD')";
        break;
      case 'week':
        dateGrouping = "TO_CHAR(DATE_TRUNC('week', p.paid_at), 'Mon DD') || ' - ' || TO_CHAR(DATE_TRUNC('week', p.paid_at) + INTERVAL '6 days', 'Mon DD')";
        break;
      case 'year':
        dateGrouping = "TO_CHAR(DATE_TRUNC('month', p.paid_at), 'Mon YYYY')";
        break;
      case 'month':
      default:
        dateGrouping = "TO_CHAR(DATE_TRUNC('month', p.paid_at), 'Mon YYYY')";
        break;
    }

    const branchFilter = branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : '';

    if (reportType === 'overview' || reportType === 'revenue') {
      // Revenue Report with comprehensive statistics
      const [
        revenueDataRes,
        overallStatsRes,
        branchRevenueRes,
        paymentMethodsRes,
        topRoomTypesRes,
        bookingStatusRes
      ] = await Promise.all([
        // 1. Revenue over time
        pool.query(`
          SELECT 
            ${dateGrouping} as period,
            COUNT(DISTINCT p.booking_id) as bookings,
            COALESCE(SUM(p.amount), 0) as revenue,
            COALESCE(SUM(p.amount), 0) as collected_revenue,
            AVG(p.amount) as avg_booking_value
          FROM payments p
          JOIN bookings b ON p.booking_id = b.id
          JOIN rooms r ON b.room_id = r.id
          WHERE p.payment_status = 'Completed' ${paymentDateFilter}
          ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
          GROUP BY ${dateGrouping}
          ORDER BY MIN(p.paid_at) ASC
        `),
        // 2. Overall statistics - Properly filtering revenue AND bookings by payment dates
        pool.query(`
          WITH payment_totals AS (
            SELECT 
              p.booking_id,
              SUM(p.amount) as total_paid
            FROM payments p
            JOIN bookings b ON p.booking_id = b.id
            JOIN rooms r ON b.room_id = r.id
            WHERE p.payment_status = 'Completed' 
            ${paymentDateFilter}
            ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
            GROUP BY p.booking_id
          )
          SELECT
            COUNT(DISTINCT pt.booking_id) as total_bookings,
            COALESCE(SUM(b.total_amount), 0) as total_revenue,
            COALESCE(SUM(pt.total_paid), 0) as collected_revenue,
            COUNT(DISTINCT CASE WHEN b.status = 'Confirmed' OR b.status = 'CheckedIn' THEN pt.booking_id END) as confirmed_bookings,
            COUNT(DISTINCT CASE WHEN b.status = 'Cancelled' THEN pt.booking_id END) as cancelled_bookings,
            COUNT(DISTINCT b.guest_id) as unique_guests,
            AVG(b.total_amount) as avg_booking_value,
            (
              SELECT COUNT(*) 
              FROM rooms r2 
              WHERE r2.status = 'Occupied' 
              ${branchId !== 'all' ? `AND r2.branch_id = ${parseInt(branchId)}` : ''}
            ) as occupied_rooms,
            (
              SELECT COUNT(*) 
              FROM rooms r2 
              ${branchId !== 'all' ? `WHERE r2.branch_id = ${parseInt(branchId)}` : ''}
            ) as total_rooms
          FROM payment_totals pt
          JOIN bookings b ON pt.booking_id = b.id
          JOIN rooms r ON b.room_id = r.id
          WHERE 1=1
          ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
        `),
        // 3. Revenue by branch
        pool.query(`
          SELECT 
            br.id,
            br.name as branch_name,
            br.location,
            COUNT(DISTINCT b.id) as bookings,
            COALESCE(SUM(b.total_amount), 0) as revenue,
            COALESCE(SUM(p.amount), 0) as collected,
            (
              SELECT COUNT(*) 
              FROM rooms r2 
              WHERE r2.branch_id = br.id AND r2.status = 'Occupied'
            ) as occupied_rooms,
            (
              SELECT COUNT(*) 
              FROM rooms r2 
              WHERE r2.branch_id = br.id
            ) as total_rooms
          FROM branches br
          LEFT JOIN rooms r ON br.id = r.branch_id
          LEFT JOIN bookings b ON r.id = b.room_id AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
          LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'Completed'
          ${branchId !== 'all' ? `WHERE br.id = ${parseInt(branchId)}` : 'WHERE 1=1'}
          GROUP BY br.id, br.name, br.location
          ORDER BY revenue DESC
        `),
        // 4. Payment methods breakdown
        pool.query(`
          SELECT 
            payment_method,
            COUNT(*) as count,
            SUM(amount) as total_amount
          FROM payments p
          JOIN bookings b ON p.booking_id = b.id
          JOIN rooms r ON b.room_id = r.id
          WHERE p.payment_status = 'Completed' ${paymentDateFilter}
          ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
          GROUP BY payment_method
          ORDER BY total_amount DESC
        `),
        // 5. Top performing room types
        pool.query(`
          SELECT 
            rt.id,
            rt.name as room_type,
            rt.base_price,
            COUNT(b.id) as bookings,
            SUM(b.total_amount) as revenue,
            AVG(b.total_amount) as avg_revenue
          FROM room_types rt
          JOIN rooms r ON rt.id = r.room_type_id
          JOIN bookings b ON r.id = b.room_id
          WHERE 1=1 ${dateFilter}
          ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
          GROUP BY rt.id, rt.name, rt.base_price
          ORDER BY revenue DESC
          LIMIT 10
        `),
        // 6. Booking status distribution
        pool.query(`
          SELECT 
            b.status,
            COUNT(*) as count,
            SUM(b.total_amount) as revenue
          FROM bookings b
          JOIN rooms r ON b.room_id = r.id
          WHERE 1=1 ${dateFilter}
          ${branchId !== 'all' ? `AND r.branch_id = ${parseInt(branchId)}` : ''}
          GROUP BY b.status
          ORDER BY count DESC
        `)
      ]);

      const overallStats = overallStatsRes.rows[0];
      
      // Debug logging
      console.log('[REPORTS API] Date Filters:', { startDate, endDate, dateFilter, paymentDateFilter });
      console.log('[REPORTS API] Overall Stats:', overallStats);
      console.log('[REPORTS API] Collected Revenue:', overallStats.collected_revenue);
      
      const occupancyRate = overallStats.total_rooms > 0 
        ? Math.round((overallStats.occupied_rooms / overallStats.total_rooms) * 100) 
        : 0;
      
      const cancellationRate = overallStats.total_bookings > 0
        ? Math.round((overallStats.cancelled_bookings / overallStats.total_bookings) * 100)
        : 0;

      // Calculate average rating (if reviews exist)
      const ratingsRes = await pool.query(`
        SELECT 
          COALESCE(AVG(rating), 0) as avg_rating, 
          COUNT(*) as review_count
        FROM reviews r
        JOIN bookings b ON r.booking_id = b.id
        JOIN rooms rm ON b.room_id = rm.id
        WHERE r.rating IS NOT NULL
        ${dateFilter}
        ${branchId !== 'all' ? `AND rm.branch_id = ${parseInt(branchId)}` : ''}
      `);

      const avgRating = parseFloat(ratingsRes.rows[0]?.avg_rating) || 0;
      const reviewCount = parseInt(ratingsRes.rows[0]?.review_count) || 0;

      console.log('[REPORTS API] Ratings:', { avgRating, reviewCount });

      const reportData = {
        type: reportType,
        period,
        branchId,
        stats: {
          totalRevenue: parseFloat(overallStats.collected_revenue) || 0, // Use collected revenue as main revenue
          collectedRevenue: parseFloat(overallStats.collected_revenue) || 0,
          pendingRevenue: (parseFloat(overallStats.total_revenue) - parseFloat(overallStats.collected_revenue)) || 0,
          totalBookings: parseInt(overallStats.total_bookings) || 0,
          confirmedBookings: parseInt(overallStats.confirmed_bookings) || 0,
          cancelledBookings: parseInt(overallStats.cancelled_bookings) || 0,
          cancellationRate,
          uniqueGuests: parseInt(overallStats.unique_guests) || 0,
          avgBookingValue: parseFloat(overallStats.avg_booking_value) || 0,
          occupancyRate,
          occupiedRooms: parseInt(overallStats.occupied_rooms) || 0,
          totalRooms: parseInt(overallStats.total_rooms) || 0,
          avgRating: avgRating,
          reviewCount: reviewCount
        },
        revenueData: revenueDataRes.rows.map(row => ({
          name: row.period,
          revenue: parseFloat(row.revenue) || 0,
          collected: parseFloat(row.collected_revenue) || 0,
          bookings: parseInt(row.bookings) || 0,
          avgValue: parseFloat(row.avg_booking_value) || 0
        })),
        branchRevenue: branchRevenueRes.rows.map(row => ({
          id: row.id,
          branchName: row.branch_name,
          location: row.location,
          bookings: parseInt(row.bookings) || 0,
          revenue: parseFloat(row.revenue) || 0,
          collected: parseFloat(row.collected) || 0,
          occupancy: row.total_rooms > 0 
            ? Math.round((row.occupied_rooms / row.total_rooms) * 100) 
            : 0
        })),
        paymentMethods: paymentMethodsRes.rows.map(row => ({
          method: row.payment_method,
          count: parseInt(row.count) || 0,
          amount: parseFloat(row.total_amount) || 0
        })),
        topRoomTypes: topRoomTypesRes.rows.map(row => ({
          id: row.id,
          name: row.room_type,
          basePrice: parseFloat(row.base_price),
          bookings: parseInt(row.bookings),
          revenue: parseFloat(row.revenue),
          avgRevenue: parseFloat(row.avg_revenue)
        })),
        bookingStatus: bookingStatusRes.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count),
          revenue: parseFloat(row.revenue)
        }))
      };

      return NextResponse.json(reportData);
    }

    // Default fallback
    return NextResponse.json({
      error: 'Invalid report type',
      availableTypes: ['overview', 'revenue']
    }, { status: 400 });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: (error as Error).message },
      { status: 500 }
    );
  }
}
