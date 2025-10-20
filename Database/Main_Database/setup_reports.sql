-- Execute this file to create all reporting functions
-- Run with: Your database tool or psql command

-- Make sure you're connected to the hotel_management database

\echo 'Creating reporting functions...'

-- Source the functions file
\i 02_functions.sql

\echo 'Reporting functions created successfully!'
\echo 'You can now test them with:'
\echo 'SELECT * FROM report_room_occupancy(CURRENT_DATE, CURRENT_DATE + 7, NULL);'
\echo 'SELECT * FROM report_guest_billing(NULL, false);'
\echo 'SELECT * FROM report_service_usage(CURRENT_DATE - 30, CURRENT_DATE, NULL, NULL);'
\echo 'SELECT * FROM report_monthly_revenue(2025, 10, NULL);'
\echo 'SELECT * FROM report_top_services(CURRENT_DATE - 90, CURRENT_DATE, 10);'
