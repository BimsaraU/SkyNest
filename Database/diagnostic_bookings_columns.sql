-- Check actual bookings table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- Check if there are any constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'bookings';

-- Try a test insert with minimal data
-- INSERT INTO bookings (
--   booking_reference, guest_id, room_id, check_in_date, check_out_date,
--   number_of_guests, status, base_amount, services_amount, total_amount,
--   paid_amount, outstanding_amount, special_requests
-- ) VALUES (
--   'BK-TEST-001', 1, 1, '2025-10-22', '2025-10-26',
--   2, 'Pending', 500.00, 0.00, 500.00,
--   0.00, 500.00, null
-- );
