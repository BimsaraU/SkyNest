-- MASTER SETUP SCRIPT FOR HOTEL MANAGEMENT SYSTEM
-- Run this file to set up the entire database
-- Usage: psql -U username -d database_name -f setup.sql

\echo '========================================='
\echo 'HOTEL MANAGEMENT SYSTEM DATABASE SETUP'
\echo '========================================='
\echo ''

\echo '1. Creating schema and tables...'
\i newschema.sql

\echo ''
\echo '2. Creating indexes...'
\i newindexes.sql

\echo ''
\echo '3. Creating triggers...'
\i newtriggers.sql

\echo ''
\echo '4. Creating functions...'
\i newfunctions.sql

\echo ''
\echo '5. Creating procedures...'
\i newprocedures.sql

\echo ''
\echo '6. Loading mock data...'
\i newmockdata.sql

\echo ''
\echo '========================================='
\echo 'DATABASE SETUP COMPLETE!'
\echo '========================================='
\echo ''
\echo 'Quick verification queries:'
\echo ''
\echo 'Count tables:'
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

\echo ''
\echo 'Count users:'
SELECT role, COUNT(*) FROM users GROUP BY role;

\echo ''
\echo 'Count bookings by status:'
SELECT status, COUNT(*) FROM bookings GROUP BY status;

\echo ''
\echo '========================================='
\echo 'Setup complete! Database is ready to use.'
\echo '========================================='
