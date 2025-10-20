import { NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { hashPassword } from '../../../lib/authUtils';
import { sendPasswordResetEmail } from '../../../lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password } = body;

    if (action === 'testEmail') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      console.log(`[TEST] Email test for: ${email}`);
      await sendPasswordResetEmail(email, 'Test User', 'test_token_123');
      return NextResponse.json({ success: true, message: `Test email sent to ${email}` });
    }

    if (action === 'addUser') {
      if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
      const { role, firstName, lastName, employeeId, branchId, position, department } = body;
      const userRole = role || 'GUEST';
      const hashedPassword = await hashPassword(password);
      
      let result, tableName = '';
      
      if (userRole === 'ADMIN') {
        if (!email) return NextResponse.json({ error: 'Email required for admin' }, { status: 400 });
        tableName = 'admins';
        
        // Check if email already exists
        const existingAdmin = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) {
          return NextResponse.json({ 
            error: 'Email already exists', 
            details: 'An admin with this email already exists. Use a different email or update the existing admin.' 
          }, { status: 409 });
        }
        
        result = await pool.query(
          `INSERT INTO admins (email, password_hash, first_name, last_name, branch_id, position, is_verified, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING id, email, first_name, last_name`,
          [email, hashedPassword, firstName || 'Test', lastName || 'Admin', branchId || 1, position || 'System Administrator', true, true]
        );
      } else if (userRole === 'STAFF') {
        if (!employeeId || !branchId) return NextResponse.json({ error: 'Employee ID and Branch ID required' }, { status: 400 });
        tableName = 'staff';
        result = await pool.query(
          `INSERT INTO staff (employee_id, password_hash, first_name, last_name, email, branch_id, position, department, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           RETURNING id, employee_id, first_name, last_name`,
          [employeeId, hashedPassword, firstName || 'Staff', lastName || 'Member', email || null, branchId, position || 'Staff', department || 'General', true]
        );
      } else {
        if (!email) return NextResponse.json({ error: 'Email required for guest' }, { status: 400 });
        tableName = 'guests';
        
        // Check if email already exists
        const existingGuest = await pool.query('SELECT id FROM guests WHERE email = $1', [email]);
        if (existingGuest.rows.length > 0) {
          return NextResponse.json({ 
            error: 'Email already exists', 
            details: 'A guest with this email already exists. Use a different email or update the existing guest.' 
          }, { status: 409 });
        }
        
        result = await pool.query(
          `INSERT INTO guests (email, password_hash, first_name, last_name, is_verified, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING id, email, first_name, last_name`,
          [email, hashedPassword, firstName || 'Guest', lastName || 'User', false, true]
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Added ${userRole} to ${tableName}`,
        details: { 
          id: result.rows[0].id, 
          role: userRole, 
          table: tableName,
          user: result.rows[0]
        }
      });
    }

    if (action === 'healthCheck') {
      const connection = await pool.query('SELECT NOW() as time, VERSION() as version, CURRENT_DATABASE() as database');
      
      const [
        admins, staff, guests, branches, rooms, roomTypes,
        bookings, payments, serviceRequests, maintenanceLogs,
        serviceUsage, reviews
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM admins WHERE is_active = true'),
        pool.query('SELECT COUNT(*) as total FROM staff WHERE is_active = true'),
        pool.query('SELECT COUNT(*) as total FROM guests WHERE is_active = true'),
        pool.query('SELECT COUNT(*) as total FROM branches WHERE is_active = true'),
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status = \'Available\' THEN 1 END) as available FROM rooms'),
        pool.query('SELECT COUNT(*) as total FROM room_types WHERE status = \'active\''),
        pool.query(`SELECT 
          COUNT(*) as total, 
          SUM(total_amount) as revenue,
          COUNT(CASE WHEN status = 'Confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'CheckedIn' THEN 1 END) as checked_in,
          COUNT(CASE WHEN status = 'CheckedOut' THEN 1 END) as checked_out,
          COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled
        FROM bookings`),
        pool.query(`SELECT 
          payment_status, 
          COUNT(*) as count, 
          SUM(amount) as total_amount 
        FROM payments 
        GROUP BY payment_status`),
        pool.query(`SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'InProgress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
        FROM service_requests`),
        pool.query(`SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'InProgress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed
        FROM maintenance_logs`),
        pool.query('SELECT COUNT(*) as total, SUM(quantity * price_at_time) as revenue FROM service_usage'),
        pool.query('SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews')
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'V2 Schema Health Check Complete',
        connection: connection.rows[0],
        users: {
          admins: parseInt(admins.rows[0].total),
          staff: parseInt(staff.rows[0].total),
          guests: parseInt(guests.rows[0].total)
        },
        property: {
          branches: parseInt(branches.rows[0].total),
          rooms: parseInt(rooms.rows[0].total),
          available_rooms: parseInt(rooms.rows[0].available || 0),
          room_types: parseInt(roomTypes.rows[0].total)
        },
        bookings: {
          total: parseInt(bookings.rows[0].total),
          revenue: parseFloat(bookings.rows[0].revenue || 0),
          confirmed: parseInt(bookings.rows[0].confirmed || 0),
          checked_in: parseInt(bookings.rows[0].checked_in || 0),
          checked_out: parseInt(bookings.rows[0].checked_out || 0),
          cancelled: parseInt(bookings.rows[0].cancelled || 0)
        },
        payments: payments.rows,
        services: {
          requests: serviceRequests.rows[0],
          usage_revenue: parseFloat(serviceUsage.rows[0].revenue || 0),
          usage_count: parseInt(serviceUsage.rows[0].total)
        },
        maintenance: maintenanceLogs.rows[0],
        reviews: {
          total: parseInt(reviews.rows[0].total),
          average_rating: parseFloat(reviews.rows[0].avg_rating || 0).toFixed(2)
        }
      });
    }

    if (action === 'lookupUser') {
      const { lookupEmail } = body;
      
      if (!lookupEmail) {
        return NextResponse.json({ error: 'Email required for lookup' }, { status: 400 });
      }
      
      const results = {
        admin: null,
        staff: null,
        guest: null,
        found: false,
        userType: null as string | null
      };
      
      // Check admins
      const adminResult = await pool.query(
        'SELECT id, email, first_name, last_name, position, branch_id, is_verified, is_active, created_at FROM admins WHERE email = $1',
        [lookupEmail]
      );
      if (adminResult.rows.length > 0) {
        results.admin = adminResult.rows[0];
        results.found = true;
        results.userType = 'ADMIN';
      }
      
      // Check staff
      const staffResult = await pool.query(
        'SELECT id, employee_id, email, first_name, last_name, position, department, branch_id, is_active, created_at FROM staff WHERE email = $1',
        [lookupEmail]
      );
      if (staffResult.rows.length > 0) {
        results.staff = staffResult.rows[0];
        results.found = true;
        if (!results.userType) results.userType = 'STAFF';
      }
      
      // Check guests
      const guestResult = await pool.query(
        'SELECT id, email, first_name, last_name, phone, nationality, is_verified, is_active, loyalty_points, created_at FROM guests WHERE email = $1',
        [lookupEmail]
      );
      if (guestResult.rows.length > 0) {
        results.guest = guestResult.rows[0];
        results.found = true;
        if (!results.userType) results.userType = 'GUEST';
      }
      
      return NextResponse.json({
        success: true,
        message: results.found ? `Found user: ${results.userType}` : 'User not found',
        ...results
      });
    }

    if (action === 'getDatabaseStats') {
      // Get comprehensive table statistics
      const tableStats = await pool.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      // Get row counts for all tables
      const rowCounts = await pool.query(`
        SELECT 
          'admins' as table_name, COUNT(*) as row_count FROM admins
        UNION ALL SELECT 'staff', COUNT(*) FROM staff
        UNION ALL SELECT 'guests', COUNT(*) FROM guests
        UNION ALL SELECT 'branches', COUNT(*) FROM branches
        UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
        UNION ALL SELECT 'room_types', COUNT(*) FROM room_types
        UNION ALL SELECT 'amenities', COUNT(*) FROM amenities
        UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
        UNION ALL SELECT 'payments', COUNT(*) FROM payments
        UNION ALL SELECT 'service_catalog', COUNT(*) FROM service_catalog
        UNION ALL SELECT 'service_requests', COUNT(*) FROM service_requests
        UNION ALL SELECT 'service_usage', COUNT(*) FROM service_usage
        UNION ALL SELECT 'maintenance_logs', COUNT(*) FROM maintenance_logs
        UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
        UNION ALL SELECT 'room_availability', COUNT(*) FROM room_availability
        UNION ALL SELECT 'otps', COUNT(*) FROM otps
        UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
        ORDER BY row_count DESC
      `);
      
      // Get function list
      const functions = await pool.query(`
        SELECT 
          routine_name,
          routine_type,
          data_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        ORDER BY routine_name
      `);
      
      // Get trigger list
      const triggers = await pool.query(`
        SELECT 
          trigger_name,
          event_manipulation,
          event_object_table,
          action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `);
      
      return NextResponse.json({
        success: true,
        message: 'Database statistics retrieved',
        tableStats: tableStats.rows,
        rowCounts: rowCounts.rows,
        functions: functions.rows,
        triggers: triggers.rows,
        summary: {
          totalTables: tableStats.rows.length,
          totalFunctions: functions.rows.length,
          totalTriggers: triggers.rows.length,
          totalRows: rowCounts.rows.reduce((sum: number, row: any) => sum + parseInt(row.row_count), 0)
        }
      });
    }

    if (action === 'testReportingFunctions') {
      // Test all 5 reporting functions
      const results: any = {};
      
      try {
        // 1. Room Occupancy Report
        const occupancy = await pool.query(
          'SELECT * FROM report_room_occupancy($1, $2, $3) LIMIT 5',
          [new Date().toISOString().split('T')[0], 
           new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], 
           null]
        );
        results.roomOccupancy = {
          success: true,
          rowCount: occupancy.rows.length,
          sample: occupancy.rows
        };
      } catch (error) {
        results.roomOccupancy = {
          success: false,
          error: (error as Error).message
        };
      }
      
      try {
        // 2. Guest Billing Report
        const billing = await pool.query(
          'SELECT * FROM report_guest_billing($1, $2) LIMIT 5',
          [null, false]
        );
        results.guestBilling = {
          success: true,
          rowCount: billing.rows.length,
          sample: billing.rows
        };
      } catch (error) {
        results.guestBilling = {
          success: false,
          error: (error as Error).message
        };
      }
      
      try {
        // 3. Service Usage Report
        const serviceUsage = await pool.query(
          'SELECT * FROM report_service_usage($1, $2, $3, $4) LIMIT 5',
          [new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
           new Date().toISOString().split('T')[0],
           null, null]
        );
        results.serviceUsage = {
          success: true,
          rowCount: serviceUsage.rows.length,
          sample: serviceUsage.rows
        };
      } catch (error) {
        results.serviceUsage = {
          success: false,
          error: (error as Error).message
        };
      }
      
      try {
        // 4. Monthly Revenue Report
        const revenue = await pool.query(
          'SELECT * FROM report_monthly_revenue($1, $2, $3)',
          [new Date().getFullYear(), new Date().getMonth() + 1, null]
        );
        results.monthlyRevenue = {
          success: true,
          rowCount: revenue.rows.length,
          sample: revenue.rows
        };
      } catch (error) {
        results.monthlyRevenue = {
          success: false,
          error: (error as Error).message
        };
      }
      
      try {
        // 5. Top Services Report
        const topServices = await pool.query(
          'SELECT * FROM report_top_services($1, $2, $3)',
          [new Date(Date.now() - 90*24*60*60*1000).toISOString().split('T')[0],
           new Date().toISOString().split('T')[0],
           10]
        );
        results.topServices = {
          success: true,
          rowCount: topServices.rows.length,
          sample: topServices.rows
        };
      } catch (error) {
        results.topServices = {
          success: false,
          error: (error as Error).message
        };
      }
      
      const allSuccess = Object.values(results).every((r: any) => r.success);
      
      return NextResponse.json({
        success: allSuccess,
        message: allSuccess ? 'All 5 reporting functions working!' : 'Some functions failed',
        results
      });
    }

    if (action === 'checkFunctions') {
      // Check if the 5 reporting functions exist
      try {
        const result = await pool.query(`
          SELECT routine_name, routine_type, data_type
          FROM information_schema.routines
          WHERE routine_schema = 'public'
            AND routine_name LIKE 'report_%'
          ORDER BY routine_name
        `);

        return NextResponse.json({
          success: true,
          count: result.rows.length,
          functions: result.rows,
          message: result.rows.length === 5 ? 'All 5 functions exist' : `Only ${result.rows.length} of 5 functions found`
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: (error as Error).message,
          message: 'Failed to check functions'
        }, { status: 500 });
      }
    }

    if (action === 'createFunctions') {
      // Create all 5 reporting functions by executing SQL statements
      const results: any[] = [];
      let successCount = 0;
      let errorCount = 0;

      // Define all 5 functions as SQL strings
      const functions = [
        {
          name: 'report_room_occupancy',
          sql: `
            CREATE OR REPLACE FUNCTION report_room_occupancy(
              p_start_date DATE DEFAULT CURRENT_DATE,
              p_end_date DATE DEFAULT CURRENT_DATE,
              p_branch_id INT DEFAULT NULL
            )
            RETURNS TABLE (
              branch_name VARCHAR,
              room_number VARCHAR,
              room_type VARCHAR,
              total_days INT,
              occupied_days BIGINT,
              occupancy_rate NUMERIC,
              total_revenue NUMERIC
            ) AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                b.name AS branch_name,
                r.room_number,
                rt.name AS room_type,
                (p_end_date - p_start_date + 1)::INT AS total_days,
                COUNT(DISTINCT bk.id) AS occupied_days,
                ROUND((COUNT(DISTINCT bk.id)::NUMERIC / (p_end_date - p_start_date + 1)) * 100, 2) AS occupancy_rate,
                COALESCE(SUM(bk.total_amount), 0) AS total_revenue
              FROM rooms r
              JOIN branches b ON r.branch_id = b.id
              JOIN room_types rt ON r.room_type_id = rt.id
              LEFT JOIN bookings bk ON r.id = bk.room_id 
                AND bk.status IN ('Confirmed', 'CheckedIn', 'CheckedOut')
                AND daterange(bk.check_in_date, bk.check_out_date, '[]') && 
                    daterange(p_start_date, p_end_date, '[]')
              WHERE (p_branch_id IS NULL OR r.branch_id = p_branch_id)
              GROUP BY b.name, r.room_number, rt.name, p_start_date, p_end_date
              ORDER BY b.name, r.room_number;
            END;
            $$ LANGUAGE plpgsql STABLE;
          `
        },
        {
          name: 'report_guest_billing',
          sql: `
            CREATE OR REPLACE FUNCTION report_guest_billing(
              p_guest_id INT DEFAULT NULL,
              p_include_paid BOOLEAN DEFAULT false
            )
            RETURNS TABLE (
              guest_name TEXT,
              guest_email VARCHAR,
              booking_reference VARCHAR,
              room_number VARCHAR,
              check_in_date DATE,
              check_out_date DATE,
              room_charges NUMERIC,
              service_charges NUMERIC,
              total_amount NUMERIC,
              paid_amount NUMERIC,
              payment_status TEXT
            ) AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                g.first_name || ' ' || g.last_name AS guest_name,
                g.email AS guest_email,
                bk.booking_reference,
                r.room_number,
                bk.check_in_date,
                bk.check_out_date,
                bk.total_amount AS room_charges,
                COALESCE(SUM(su.total_price), 0) AS service_charges,
                bk.total_amount + COALESCE(SUM(su.total_price), 0) AS total_amount,
                COALESCE(
                  (SELECT SUM(amount) FROM payments WHERE booking_id = bk.id AND payment_status = 'Paid'),
                  0
                ) AS paid_amount,
                CASE 
                  WHEN EXISTS (SELECT 1 FROM payments WHERE booking_id = bk.id AND payment_status = 'Paid') THEN 'Paid'
                  WHEN EXISTS (SELECT 1 FROM payments WHERE booking_id = bk.id AND payment_status = 'Pending') THEN 'Pending'
                  ELSE 'Unpaid'
                END AS payment_status
              FROM bookings bk
              JOIN guests g ON bk.guest_id = g.id
              JOIN rooms r ON bk.room_id = r.id
              LEFT JOIN service_usage su ON bk.id = su.booking_id
              WHERE (p_guest_id IS NULL OR g.id = p_guest_id)
                AND bk.status IN ('Confirmed', 'CheckedIn', 'CheckedOut')
                AND (p_include_paid OR NOT EXISTS (
                  SELECT 1 FROM payments WHERE booking_id = bk.id AND payment_status = 'Paid'
                ))
              GROUP BY g.first_name, g.last_name, g.email, bk.id, bk.booking_reference, 
                       r.room_number, bk.check_in_date, bk.check_out_date, bk.total_amount
              ORDER BY bk.check_in_date DESC;
            END;
            $$ LANGUAGE plpgsql STABLE;
          `
        },
        {
          name: 'report_service_usage',
          sql: `
            CREATE OR REPLACE FUNCTION report_service_usage(
              p_start_date DATE DEFAULT CURRENT_DATE - 30,
              p_end_date DATE DEFAULT CURRENT_DATE,
              p_guest_id INT DEFAULT NULL,
              p_service_id INT DEFAULT NULL
            )
            RETURNS TABLE (
              usage_date TIMESTAMP,
              guest_name TEXT,
              service_name VARCHAR,
              category service_category_enum,
              quantity INT,
              unit_price NUMERIC,
              total_price NUMERIC
            ) AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                su.usage_date,
                g.first_name || ' ' || g.last_name AS guest_name,
                sc.name AS service_name,
                sc.category,
                su.quantity,
                su.unit_price,
                su.total_price
              FROM service_usage su
              JOIN bookings bk ON su.booking_id = bk.id
              JOIN guests g ON bk.guest_id = g.id
              JOIN service_catalog sc ON su.service_id = sc.id
              WHERE su.usage_date::DATE BETWEEN p_start_date AND p_end_date
                AND (p_guest_id IS NULL OR g.id = p_guest_id)
                AND (p_service_id IS NULL OR sc.id = p_service_id)
              ORDER BY su.usage_date DESC;
            END;
            $$ LANGUAGE plpgsql STABLE;
          `
        },
        {
          name: 'report_monthly_revenue',
          sql: `
            CREATE OR REPLACE FUNCTION report_monthly_revenue(
              p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
              p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT,
              p_branch_id INT DEFAULT NULL
            )
            RETURNS TABLE (
              branch_name VARCHAR,
              room_revenue NUMERIC,
              service_revenue NUMERIC,
              total_revenue NUMERIC,
              booking_count BIGINT
            ) AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                b.name AS branch_name,
                COALESCE(SUM(bk.total_amount), 0) AS room_revenue,
                COALESCE(SUM(su.total_price), 0) AS service_revenue,
                COALESCE(SUM(bk.total_amount), 0) + COALESCE(SUM(su.total_price), 0) AS total_revenue,
                COUNT(DISTINCT bk.id) AS booking_count
              FROM branches b
              LEFT JOIN rooms r ON b.id = r.branch_id
              LEFT JOIN bookings bk ON r.id = bk.room_id
                AND EXTRACT(YEAR FROM bk.created_at) = p_year
                AND EXTRACT(MONTH FROM bk.created_at) = p_month
                AND bk.status IN ('Confirmed', 'CheckedIn', 'CheckedOut')
              LEFT JOIN service_usage su ON bk.id = su.booking_id
                AND EXTRACT(YEAR FROM su.usage_date) = p_year
                AND EXTRACT(MONTH FROM su.usage_date) = p_month
              WHERE (p_branch_id IS NULL OR b.id = p_branch_id)
              GROUP BY b.name
              ORDER BY total_revenue DESC;
            END;
            $$ LANGUAGE plpgsql STABLE;
          `
        },
        {
          name: 'report_top_services',
          sql: `
            CREATE OR REPLACE FUNCTION report_top_services(
              p_start_date DATE DEFAULT CURRENT_DATE - 90,
              p_end_date DATE DEFAULT CURRENT_DATE,
              p_limit INT DEFAULT 10
            )
            RETURNS TABLE (
              service_name VARCHAR,
              category service_category_enum,
              usage_count BIGINT,
              total_quantity BIGINT,
              total_revenue NUMERIC,
              avg_price NUMERIC
            ) AS $$
            BEGIN
              RETURN QUERY
              SELECT 
                sc.name AS service_name,
                sc.category,
                COUNT(su.id) AS usage_count,
                SUM(su.quantity)::BIGINT AS total_quantity,
                SUM(su.total_price) AS total_revenue,
                ROUND(AVG(su.unit_price), 2) AS avg_price
              FROM service_catalog sc
              JOIN service_usage su ON sc.id = su.service_id
              WHERE su.usage_date::DATE BETWEEN p_start_date AND p_end_date
              GROUP BY sc.name, sc.category
              ORDER BY usage_count DESC, total_revenue DESC
              LIMIT p_limit;
            END;
            $$ LANGUAGE plpgsql STABLE;
          `
        }
      ];

      // Execute each function creation
      for (const func of functions) {
        try {
          await pool.query(func.sql);
          results.push({ type: 'function', name: func.name, status: 'created' });
          successCount++;
        } catch (error) {
          results.push({ 
            type: 'error', 
            name: func.name, 
            status: 'failed',
            error: (error as Error).message 
          });
          errorCount++;
        }
      }

      return NextResponse.json({
        success: errorCount === 0,
        message: errorCount === 0 
          ? `Successfully created all ${successCount} functions!` 
          : `Created ${successCount} functions, ${errorCount} failed`,
        results,
        successCount,
        errorCount
      });
    }

    if (action === 'checkOTPs') {
      const { userEmail, userType } = body;
      
      let query = 'SELECT user_email, user_type, otp_code, expires_at, created_at, expires_at > NOW() as is_valid FROM otps';
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (userEmail) {
        conditions.push('user_email = $' + (params.length + 1));
        params.push(userEmail);
      }
      
      if (userType) {
        conditions.push('user_type = $' + (params.length + 1));
        params.push(userType.toUpperCase());
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT 20';
      
      const result = await pool.query(query, params);
      
      // Also get summary stats
      const stats = await pool.query(`
        SELECT 
          user_type,
          COUNT(*) as total,
          SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as valid,
          SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired
        FROM otps
        GROUP BY user_type
      `);
      
      return NextResponse.json({
        success: true,
        message: `Found ${result.rows.length} OTP(s)`,
        otps: result.rows,
        stats: stats.rows,
        filters: { userEmail, userType }
      });
    }

    if (action === 'checkResetTokens') {
      const { userEmail, userType } = body;
      
      let query = 'SELECT user_email, user_type, reset_token, expires_at, created_at, used, expires_at > NOW() as is_valid FROM password_reset_tokens';
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (userEmail) {
        conditions.push('user_email = $' + (params.length + 1));
        params.push(userEmail);
      }
      
      if (userType) {
        conditions.push('user_type = $' + (params.length + 1));
        params.push(userType.toUpperCase());
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT 20';
      
      const result = await pool.query(query, params);
      
      // Also get summary stats
      const stats = await pool.query(`
        SELECT 
          user_type,
          COUNT(*) as total,
          SUM(CASE WHEN expires_at > NOW() AND NOT used THEN 1 ELSE 0 END) as valid,
          SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN used THEN 1 ELSE 0 END) as used
        FROM password_reset_tokens
        GROUP BY user_type
      `);
      
      return NextResponse.json({
        success: true,
        message: `Found ${result.rows.length} reset token(s)`,
        tokens: result.rows,
        stats: stats.rows,
        filters: { userEmail, userType }
      });
    }

    if (action === 'cleanExpiredOTPs') {
      const result = await pool.query('DELETE FROM otps WHERE expires_at <= NOW() RETURNING *');
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.rowCount} expired OTP(s)`,
        deleted: result.rows
      });
    }

    if (action === 'cleanExpiredResetTokens') {
      const result = await pool.query('DELETE FROM password_reset_tokens WHERE expires_at <= NOW() RETURNING *');
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.rowCount} expired reset token(s)`,
        deleted: result.rows
      });
    }

    if (action === 'generateTestOTP') {
      const { userEmail, userType } = body;
      
      if (!userEmail || !userType) {
        return NextResponse.json({ error: 'userEmail and userType required' }, { status: 400 });
      }
      
      const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      await pool.query(
        'INSERT INTO otps (user_email, user_type, otp_code, expires_at) VALUES ($1, $2, $3, $4)',
        [userEmail, userType.toUpperCase(), testOTP, expiresAt]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Test OTP generated',
        otp: {
          userEmail,
          userType: userType.toUpperCase(),
          otpCode: testOTP,
          expiresAt
        }
      });
    }

    if (action === 'generateTestResetToken') {
      const { userEmail, userType } = body;
      
      if (!userEmail || !userType) {
        return NextResponse.json({ error: 'userEmail and userType required' }, { status: 400 });
      }
      
      const crypto = require('crypto');
      const testToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      await pool.query(
        'INSERT INTO password_reset_tokens (user_email, user_type, reset_token, expires_at, used) VALUES ($1, $2, $3, $4, $5)',
        [userEmail, userType.toUpperCase(), testToken, expiresAt, false]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Test reset token generated',
        token: {
          userEmail,
          userType: userType.toUpperCase(),
          resetToken: testToken,
          expiresAt
        }
      });
    }

    if (action === 'migratePasswordResetTable') {
      console.log('[MIGRATION] Starting password_reset_tokens table migration...');
      
      try {
        // Drop old table
        await pool.query('DROP TABLE IF EXISTS password_reset_tokens CASCADE');
        console.log('[MIGRATION] Dropped old table');
        
        // Create new table with correct structure
        await pool.query(`
          CREATE TABLE password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('ADMIN', 'STAFF', 'GUEST')),
            reset_token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('[MIGRATION] Created new table');
        
        // Create indexes
        await pool.query('CREATE INDEX idx_reset_token ON password_reset_tokens(reset_token)');
        await pool.query('CREATE INDEX idx_user_email_type ON password_reset_tokens(user_email, user_type)');
        await pool.query('CREATE INDEX idx_expires_at ON password_reset_tokens(expires_at)');
        console.log('[MIGRATION] Created indexes');
        
        // Verify structure
        const columns = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'password_reset_tokens'
          ORDER BY ordinal_position
        `);
        
        return NextResponse.json({
          success: true,
          message: 'password_reset_tokens table migrated successfully!',
          columns: columns.rows,
          details: 'Table now has: reset_token (not token_hash) and used (boolean) columns'
        });
        
      } catch (migrationError) {
        console.error('[MIGRATION ERROR]:', migrationError);
        return NextResponse.json({
          success: false,
          error: 'Migration failed',
          details: (migrationError as Error).message
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    console.error('[API ERROR]:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal error', 
      details: (err as Error).message 
    }, { status: 500 });
  }
}
