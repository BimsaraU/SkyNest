-- ============================================================================
-- COMPLETE MOCK DATA FOR HOTEL MANAGEMENT SYSTEM V2
-- ============================================================================
-- This file combines base mock data with comprehensive test data
-- Password for all test accounts: password123 (hashed with bcrypt, cost 10)
-- SAFE TO RUN MULTIPLE TIMES - Will clear and repopulate data
--
-- Usage:
--   psql your-db-url -f 05_mock_data.sql
-- ============================================================================

BEGIN;

-- Clear existing data first (in correct order to avoid FK violations)
DELETE FROM reviews;
DELETE FROM service_usage;
DELETE FROM maintenance_logs;
DELETE FROM service_requests;
DELETE FROM room_availability;
DELETE FROM room_images;
DELETE FROM room_amenities;
DELETE FROM payments;
DELETE FROM bookings;
DELETE FROM rooms;
DELETE FROM room_types;
DELETE FROM service_catalog;
DELETE FROM amenities;
DELETE FROM password_reset_tokens;
DELETE FROM otps;
DELETE FROM guests;
DELETE FROM staff;
DELETE FROM admins;
DELETE FROM branches;

-- Reset sequences
ALTER SEQUENCE branches_id_seq RESTART WITH 1;
ALTER SEQUENCE admins_id_seq RESTART WITH 1;
ALTER SEQUENCE staff_id_seq RESTART WITH 1;
ALTER SEQUENCE guests_id_seq RESTART WITH 1;
ALTER SEQUENCE amenities_id_seq RESTART WITH 1;
ALTER SEQUENCE room_types_id_seq RESTART WITH 1;
ALTER SEQUENCE rooms_id_seq RESTART WITH 1;
ALTER SEQUENCE service_catalog_id_seq RESTART WITH 1;
ALTER SEQUENCE bookings_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE service_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE maintenance_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE reviews_id_seq RESTART WITH 1;
ALTER SEQUENCE service_usage_id_seq RESTART WITH 1;

-- ============================================
-- BRANCHES: Hotel branch locations
-- ============================================
INSERT INTO branches (name, location, address, phone, email, manager_name, is_active) VALUES
('Sky Nest Colombo', 'Colombo', '123 Galle Road, Colombo 03', '+94112345678', 'branch.colombo@skynest.lk', 'Kamal Silva', true),
('Sky Nest Kandy', 'Kandy', '456 Peradeniya Road, Kandy', '+94812345679', 'branch.kandy@skynest.lk', 'Nimal Fernando', true),
('Sky Nest Galle', 'Galle', '789 Matara Road, Galle', '+94912345680', 'branch.galle@skynest.lk', 'Sunil Perera', true);

-- ============================================
-- ADMINS: System administrators
-- ============================================
INSERT INTO admins (email, password_hash, first_name, last_name, phone, branch_id, position, access_level, is_verified, is_active) VALUES
('admin@skynest.lk', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Admin', 'Master', '+94771234567', 1, 'System Administrator', 'SuperAdmin', true, true),
('admin.colombo@skynest.lk', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Rajitha', 'Wickramasinghe', '+94771234568', 1, 'Branch Manager', 'BranchAdmin', true, true),
('admin.kandy@skynest.lk', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Priya', 'Jayawardena', '+94771234569', 2, 'Branch Manager', 'BranchAdmin', true, true),
('admin.galle@skynest.lk', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Dinesh', 'Ratnayake', '+94771234570', 3, 'Branch Manager', 'BranchAdmin', true, true);

-- ============================================
-- STAFF: Hotel staff members
-- ============================================
INSERT INTO staff (employee_id, password_hash, first_name, last_name, phone, email, branch_id, position, department, hire_date, is_active) VALUES
('STAFF-0001', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Samantha', 'De Silva', '+94771234571', 'samantha.ds@skynest.lk', 1, 'Receptionist', 'Front Desk', '2024-01-15', true),
('STAFF-0002', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Tharindu', 'Perera', '+94771234572', 'tharindu.p@skynest.lk', 1, 'Housekeeping Manager', 'Housekeeping', '2023-06-20', true),
('STAFF-0003', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Dilini', 'Fernando', '+94771234573', 'dilini.f@skynest.lk', 2, 'Receptionist', 'Front Desk', '2024-03-10', true),
('STAFF-0004', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Kasun', 'Bandara', '+94771234574', 'kasun.b@skynest.lk', 2, 'Maintenance Technician', 'Maintenance', '2023-09-05', true),
('STAFF-0005', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Malini', 'Gunasekara', '+94771234575', 'malini.g@skynest.lk', 3, 'Front Desk Manager', 'Front Desk', '2023-11-12', true),
('STAFF-0006', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Nuwan', 'Jayasuriya', '+94771234576', 'nuwan.j@skynest.lk', 3, 'Concierge', 'Guest Services', '2024-02-18', true);

-- ============================================
-- GUESTS: Hotel guests/customers
-- ============================================
INSERT INTO guests (email, password_hash, first_name, last_name, phone, address, date_of_birth, id_number, nationality, passport_number, is_verified, is_active, loyalty_points) VALUES
('john.doe@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'John', 'Doe', '+94771234577', '123 Main St, Colombo', '1985-05-15', 'NIC12345678', 'Sri Lankan', NULL, true, true, 250),
('jane.smith@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Jane', 'Smith', '+94771234578', '456 Oak Ave, Kandy', '1990-08-22', 'NIC87654321', 'Sri Lankan', NULL, true, true, 180),
('robert.brown@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Robert', 'Brown', '+1234567890', '789 Pine Rd, New York', '1978-12-10', NULL, 'American', 'PASS123456', true, true, 500),
('emily.wilson@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Emily', 'Wilson', '+447890123456', '321 Elm St, London', '1992-03-18', NULL, 'British', 'PASS654321', false, true, 0),
('michael.jones@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Michael', 'Jones', '+94771234579', '555 Beach Road, Galle', '1988-07-25', 'NIC45678912', 'Sri Lankan', NULL, true, true, 320),
('sarah.taylor@email.com', '$2b$10$rF5fZYPZqXQYBXVz5Jl5PeQRqK7kZz0bO6n5T9WqP9KqvXqY3jXqS', 'Sarah', 'Taylor', '+61298765432', '888 Harbor St, Sydney', '1995-11-08', NULL, 'Australian', 'PASS789012', true, true, 150);

-- ============================================
-- AMENITIES: Room amenities catalog
-- ============================================
INSERT INTO amenities (name, description, icon_name) VALUES
('WiFi', 'High-speed wireless internet', 'wifi'),
('Air Conditioning', 'Individual climate control', 'snowflake'),
('TV', 'Smart TV with cable channels', 'tv'),
('Mini Bar', 'Stocked mini refrigerator', 'wine'),
('Safe', 'In-room electronic safe', 'lock'),
('Coffee Maker', 'Premium coffee and tea station', 'coffee'),
('Hair Dryer', 'Professional hair dryer', 'wind'),
('Iron & Board', 'Iron with ironing board', 'shield'),
('Bathrobe', 'Luxury bathrobes and slippers', 'shirt'),
('Room Service', '24/7 room service available', 'bell'),
('Work Desk', 'Spacious work desk with lamp', 'briefcase'),
('Balcony', 'Private balcony with seating', 'sun'),
('Swimming Pool', 'Outdoor pool access', 'waves'),
('Gym', 'Fitness center access', 'dumbbell'),
('Spa', 'Spa and wellness center', 'spa'),
('Restaurant', 'On-site dining', 'utensils'),
('Parking', 'Free parking', 'car');

-- ============================================
-- ROOM TYPES: Room category definitions
-- ============================================
INSERT INTO room_types (name, description, base_price, capacity, bed_type, size_sqm, status) VALUES
('Standard Room', 'Comfortable room with essential amenities', 100.00, 2, 'Queen Bed', 25.00, 'active'),
('Deluxe Room', 'Spacious room with premium amenities and city views', 150.00, 2, 'King Bed', 35.00, 'active'),
('Suite', 'Luxurious suite with separate living area and balcony', 250.00, 4, 'King Bed + Sofa Bed', 60.00, 'active'),
('Family Room', 'Large room perfect for families with kitchenette', 200.00, 4, 'Two Queen Beds', 50.00, 'active'),
('Executive Suite', 'Premium suite with office space and ocean view', 350.00, 2, 'King Bed', 75.00, 'active'),
('Presidential Suite', 'Ultimate luxury experience with panoramic views', 500.00, 4, 'King Bed + Living Room', 120.00, 'active');

-- ============================================
-- ROOM AMENITIES: Link room types to amenities
-- ============================================
INSERT INTO room_amenities (room_type_id, amenity_id) VALUES
-- Standard Room (1): Basic amenities
(1, 1), (1, 2), (1, 3), (1, 5), (1, 7), (1, 8),
-- Deluxe Room (2): Basic + Mini Bar, Coffee Maker, Balcony
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8), (2, 9), (2, 12),
-- Suite (3): All Deluxe + Room Service, Work Desk
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 7), (3, 8), (3, 9), (3, 10), (3, 11), (3, 12),
-- Family Room (4): Similar to Deluxe
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8),
-- Executive Suite (5): All Suite amenities + Facility access
(5, 1), (5, 2), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7), (5, 8), (5, 9), (5, 10), (5, 11), (5, 12), (5, 13), (5, 14),
-- Presidential Suite (6): All amenities
(6, 1), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (6, 7), (6, 8), (6, 9), (6, 10), (6, 11), (6, 12), (6, 13), (6, 14), (6, 15), (6, 16), (6, 17);

-- ============================================
-- ROOM IMAGES: Room photos
-- ============================================
INSERT INTO room_images (room_type_id, image_url, caption, display_order) VALUES
-- Standard Room
(1, '/uploads/rooms/standard-1.jpg', 'Standard Room - Bedroom', 1),
(1, '/uploads/rooms/standard-2.jpg', 'Standard Room - Bathroom', 2),
-- Deluxe Room
(2, '/uploads/rooms/deluxe-1.jpg', 'Deluxe Room - Bedroom', 1),
(2, '/uploads/rooms/deluxe-2.jpg', 'Deluxe Room - City View', 2),
(2, '/uploads/rooms/deluxe-3.jpg', 'Deluxe Room - Bathroom', 3),
-- Suite
(3, '/uploads/rooms/suite-1.jpg', 'Suite - Living Area', 1),
(3, '/uploads/rooms/suite-2.jpg', 'Suite - Bedroom', 2),
(3, '/uploads/rooms/suite-3.jpg', 'Suite - Balcony View', 3),
-- Family Room
(4, '/uploads/rooms/family-1.jpg', 'Family Room - Main Area', 1),
(4, '/uploads/rooms/family-2.jpg', 'Family Room - Kitchenette', 2),
-- Executive Suite
(5, '/uploads/rooms/executive-1.jpg', 'Executive Suite - Ocean View', 1),
(5, '/uploads/rooms/executive-2.jpg', 'Executive Suite - Work Area', 2),
-- Presidential Suite
(6, '/uploads/rooms/presidential-1.jpg', 'Presidential Suite - Panorama', 1),
(6, '/uploads/rooms/presidential-2.jpg', 'Presidential Suite - Master Bedroom', 2);

-- ============================================
-- ROOMS: Physical room inventory
-- ============================================
INSERT INTO rooms (room_number, room_type_id, branch_id, floor_number, status, last_cleaned) VALUES
-- Colombo Branch (C-xxx)
('C-101', 1, 1, 1, 'Available', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('C-102', 1, 1, 1, 'Available', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('C-103', 2, 1, 1, 'Occupied', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('C-201', 2, 1, 2, 'Available', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('C-202', 3, 1, 2, 'Available', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
('C-203', 4, 1, 2, 'Cleaning', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('C-301', 5, 1, 3, 'Available', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('C-401', 6, 1, 4, 'Available', CURRENT_TIMESTAMP - INTERVAL '7 hours'),

-- Kandy Branch (K-xxx)
('K-101', 1, 2, 1, 'Available', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('K-102', 2, 2, 1, 'Occupied', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('K-201', 3, 2, 2, 'Available', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('K-301', 4, 2, 3, 'Available', CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- Galle Branch (G-xxx)
('G-101', 1, 3, 1, 'Available', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('G-102', 2, 3, 1, 'Maintenance', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('G-201', 3, 3, 2, 'Available', CURRENT_TIMESTAMP - INTERVAL '6 hours');

-- ============================================
-- SERVICE CATALOG: Available hotel services
-- ============================================
INSERT INTO service_catalog (name, description, category, price, is_available) VALUES
('Room Service - Breakfast', 'Continental breakfast delivered to your room', 'Food & Beverage', 25.00, true),
('Room Service - Lunch', 'Gourmet lunch delivered to your room', 'Food & Beverage', 35.00, true),
('Room Service - Dinner', 'Fine dining dinner in your room', 'Food & Beverage', 45.00, true),
('Laundry Service', 'Same-day laundry and dry cleaning', 'Housekeeping', 20.00, true),
('Airport Transfer', 'Private car service to/from airport', 'Transportation', 50.00, true),
('Spa Treatment - Massage', '60-minute Swedish massage', 'Wellness', 80.00, true),
('Spa Treatment - Facial', 'Rejuvenating facial treatment', 'Wellness', 60.00, true),
('Mini Bar Refill', 'Restocking of mini bar items', 'Food & Beverage', 30.00, true),
('Extra Towels', 'Additional towel set', 'Housekeeping', 5.00, true),
('Late Checkout', 'Extend checkout until 2 PM', 'Concierge', 40.00, true),
('Early Checkin', 'Check in before 11 AM', 'Concierge', 30.00, true),
('City Tour', 'Guided half-day city tour', 'Entertainment', 75.00, true),
('Car Rental', 'Daily car rental service', 'Transportation', 65.00, true),
('Babysitting Service', 'Professional childcare (per hour)', 'Concierge', 15.00, true),
('Gym Access', '24-hour fitness center access', 'Wellness', 10.00, true);

-- ============================================
-- BOOKINGS: Guest reservations
-- ============================================
-- October 2025 bookings (current/recent)
INSERT INTO bookings (guest_id, room_id, check_in_date, check_out_date, number_of_guests, status, total_amount, special_requests) VALUES
(1, 3, '2025-10-15', '2025-10-20', 2, 'CheckedIn', 750.00, 'Late checkout requested'),
(2, 10, '2025-10-18', '2025-10-22', 2, 'CheckedIn', 600.00, 'Room on high floor'),
(3, 8, '2025-10-25', '2025-10-30', 2, 'Confirmed', 2500.00, 'Anniversary package'),
(4, 11, '2025-11-01', '2025-11-05', 3, 'Confirmed', 1000.00, 'Extra bed required'),
(5, 15, '2025-11-10', '2025-11-15', 2, 'Pending', 1250.00, NULL),
(6, 1, '2025-10-10', '2025-10-14', 2, 'CheckedOut', 400.00, NULL),

-- September 2025 bookings (past)
(1, 5, '2025-09-05', '2025-09-10', 2, 'CheckedOut', 1000.00, 'Ocean view preferred'),
(3, 7, '2025-09-12', '2025-09-16', 4, 'CheckedOut', 1400.00, 'Two double beds'),
(4, 13, '2025-09-18', '2025-09-22', 2, 'CheckedOut', 800.00, NULL),
(5, 2, '2025-09-25', '2025-09-28', 2, 'CheckedOut', 300.00, 'Early check-in'),

-- August 2025 bookings
(2, 8, '2025-08-03', '2025-08-08', 2, 'CheckedOut', 2500.00, 'Honeymoon package'),
(6, 11, '2025-08-10', '2025-08-15', 3, 'CheckedOut', 1250.00, 'Family room'),
(1, 4, '2025-08-17', '2025-08-20', 2, 'CheckedOut', 450.00, NULL),
(3, 9, '2025-08-22', '2025-08-27', 2, 'CheckedOut', 500.00, 'Quiet room'),
(4, 15, '2025-08-28', '2025-08-31', 2, 'CheckedOut', 750.00, NULL);

-- ============================================
-- PAYMENTS: Payment transactions
-- ============================================
INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, paid_at) VALUES
-- October 2025 payments (including partial payments)
(1, 750.00, 'CreditCard', 'Completed', 'TXN001234567', '2025-10-14 10:30:00'),
(2, 300.00, 'DebitCard', 'Completed', 'TXN001234568', '2025-10-17 14:20:00'),  -- Partial payment 1
(2, 300.00, 'Cash', 'Completed', 'TXN001234581', '2025-10-18 09:00:00'),      -- Partial payment 2 (completes booking 2)
(3, 1500.00, 'Online', 'Completed', 'TXN001234569', '2025-10-20 09:15:00'),   -- Partial payment 1
(3, 1000.00, 'CreditCard', 'Completed', 'TXN001234582', '2025-10-24 14:00:00'), -- Partial payment 2 (completes booking 3)
(4, 500.00, 'CreditCard', 'Completed', 'TXN001234570', '2025-10-28 16:45:00'), -- Partial payment (booking 4 still has balance)
(6, 400.00, 'Cash', 'Completed', 'TXN001234571', '2025-10-14 11:00:00'),

-- September 2025 payments
(7, 1000.00, 'CreditCard', 'Completed', 'TXN001234572', '2025-09-05 12:30:00'),
(8, 1400.00, 'DebitCard', 'Completed', 'TXN001234573', '2025-09-12 15:20:00'),
(9, 800.00, 'Online', 'Completed', 'TXN001234574', '2025-09-18 10:45:00'),
(10, 300.00, 'CreditCard', 'Completed', 'TXN001234575', '2025-09-25 09:30:00'),

-- August 2025 payments
(11, 2500.00, 'CreditCard', 'Completed', 'TXN001234576', '2025-08-03 11:15:00'),
(12, 1250.00, 'DebitCard', 'Completed', 'TXN001234577', '2025-08-10 14:00:00'),
(13, 450.00, 'Cash', 'Completed', 'TXN001234578', '2025-08-17 16:30:00'),
(14, 500.00, 'Online', 'Completed', 'TXN001234579', '2025-08-22 13:20:00'),
(15, 750.00, 'CreditCard', 'Completed', 'TXN001234580', '2025-08-28 10:45:00');

-- ============================================
-- SERVICE USAGE: Chargeable services during stay
-- ============================================
INSERT INTO service_usage (booking_id, service_id, quantity, price_at_time, service_date, notes) VALUES
-- Current bookings (October 2025)
(1, 1, 2, 25.00, '2025-10-16', 'Breakfast for 2 guests'),
(1, 4, 1, 20.00, '2025-10-17', 'Laundry service'),
(1, 8, 1, 30.00, '2025-10-18', 'Mini bar refill'),
(2, 1, 2, 25.00, '2025-10-19', 'Continental breakfast'),
(2, 9, 2, 5.00, '2025-10-20', 'Extra towels'),
(3, 6, 2, 80.00, '2025-10-26', 'Couples massage'),
(3, 2, 2, 35.00, '2025-10-27', 'Gourmet lunch'),
(3, 10, 1, 40.00, '2025-10-29', 'Late checkout'),

-- Past bookings (September 2025)
(7, 1, 4, 25.00, '2025-09-06', 'Daily breakfast'),
(7, 3, 2, 45.00, '2025-09-08', 'Fine dining dinner'),
(7, 12, 1, 75.00, '2025-09-09', 'City tour'),
(8, 6, 2, 80.00, '2025-09-13', 'Spa treatment'),
(8, 8, 2, 30.00, '2025-09-14', 'Mini bar refill'),
(9, 5, 1, 50.00, '2025-09-19', 'Airport transfer'),
(10, 1, 2, 25.00, '2025-09-26', 'Breakfast service'),

-- Past bookings (August 2025)
(11, 6, 4, 80.00, '2025-08-04', 'Daily spa treatments'),
(11, 3, 4, 45.00, '2025-08-05', 'Romantic dinners'),
(11, 7, 2, 60.00, '2025-08-06', 'Facial treatments'),
(12, 1, 5, 25.00, '2025-08-11', 'Family breakfast'),
(12, 14, 8, 15.00, '2025-08-12', 'Babysitting service'),
(13, 2, 2, 35.00, '2025-08-18', 'Room service lunch'),
(14, 4, 1, 20.00, '2025-08-23', 'Laundry service'),
(15, 5, 1, 50.00, '2025-08-29', 'Airport transfer');

-- ============================================
-- SERVICE REQUESTS: Guest service requests
-- ============================================
INSERT INTO service_requests (guest_id, service_id, booking_id, request_type, description, priority, status, assigned_to_staff_id, notes) VALUES
(1, 4, 1, 'Laundry', 'Need shirts cleaned by evening', 'Normal', 'Completed', 2, 'Delivered at 5 PM'),
(2, 1, 2, 'Dining', 'Breakfast for 2 at 8 AM', 'Normal', 'InProgress', 1, 'Scheduled for tomorrow'),
(3, 6, 3, 'Spa', 'Couples massage booking', 'Normal', 'Pending', NULL, NULL),
(4, 5, 4, 'Transportation', 'Airport pickup on checkout', 'High', 'InProgress', 6, 'Car booked for Nov 5th'),
(6, 9, 6, 'Housekeeping', 'Additional towels needed', 'Low', 'Completed', 2, 'Delivered');

-- ============================================
-- MAINTENANCE LOGS: Room maintenance tracking
-- ============================================
-- Updated schema with assigned_to_staff_id and reported_by_guest_id support
INSERT INTO maintenance_logs (room_id, reported_by_staff_id, reported_by_guest_id, assigned_to_staff_id, issue_description, priority, status, notes) VALUES
-- Staff reported issues
(14, 4, NULL, 4, 'Air conditioning not working properly', 'High', 'InProgress', 'Technician on site, replacement parts ordered'),
(6, 2, NULL, 4, 'Bathroom faucet leaking', 'Normal', 'Pending', NULL),
(9, 3, NULL, 4, 'TV remote not working', 'Low', 'Completed', 'Remote replaced'),
-- Guest reported issues (using reported_by_guest_id)
(3, NULL, 1, 4, 'Light bulb burnt out in bathroom', 'Normal', 'Completed', 'Replaced immediately'),
(11, NULL, 2, NULL, 'Noisy air conditioner', 'Normal', 'Pending', 'Scheduled for inspection');

-- ============================================
-- REVIEWS: Guest reviews for bookings
-- ============================================
INSERT INTO reviews (booking_id, guest_id, rating, cleanliness_rating, service_rating, amenities_rating, comment, is_verified) VALUES
(6, 6, 5, 5, 5, 5, 'Excellent stay! Very clean rooms and friendly staff.', true),
(7, 1, 4, 5, 4, 4, 'Great hotel, comfortable room. Breakfast could be improved.', true),
(8, 3, 5, 5, 5, 5, 'Perfect for our honeymoon! Beautiful suite and amazing service.', true),
(9, 4, 4, 4, 4, 4, 'Nice stay overall, good location.', true),
(10, 5, 3, 4, 3, 3, 'Room was okay but WiFi was slow.', true),
(11, 2, 5, 5, 5, 5, 'Presidential suite was absolutely stunning!', true),
(12, 6, 4, 5, 4, 4, 'Family room was spacious and clean.', true),
(13, 1, 4, 4, 4, 4, 'Good value for money.', true),
(14, 3, 5, 5, 5, 4, 'Quiet and comfortable stay.', true),
(15, 4, 4, 5, 4, 4, 'Ocean view was breathtaking!', true);

-- ============================================
-- ROOM AVAILABILITY: Sample availability data
-- ============================================
INSERT INTO room_availability (room_id, date, is_available, price, notes)
SELECT 
    r.id,
    CURRENT_DATE + (g.d || ' days')::INTERVAL,
    CASE WHEN random() > 0.3 THEN true ELSE false END,
    rt.base_price * (1 + (random() * 0.2 - 0.1)), -- ±10% price variation
    NULL
FROM 
    rooms r
    JOIN room_types rt ON r.room_type_id = rt.id
    CROSS JOIN generate_series(0, 30) AS g(d)
WHERE r.id <= 10; -- First 10 rooms

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
    'branches' as table_name, COUNT(*) as row_count FROM branches
UNION ALL SELECT 'admins', COUNT(*) FROM admins
UNION ALL SELECT 'staff', COUNT(*) FROM staff
UNION ALL SELECT 'guests', COUNT(*) FROM guests
UNION ALL SELECT 'amenities', COUNT(*) FROM amenities
UNION ALL SELECT 'room_types', COUNT(*) FROM room_types
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'room_amenities', COUNT(*) FROM room_amenities
UNION ALL SELECT 'room_images', COUNT(*) FROM room_images
UNION ALL SELECT 'service_catalog', COUNT(*) FROM service_catalog
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'service_usage', COUNT(*) FROM service_usage
UNION ALL SELECT 'service_requests', COUNT(*) FROM service_requests
UNION ALL SELECT 'maintenance_logs', COUNT(*) FROM maintenance_logs
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'room_availability', COUNT(*) FROM room_availability
ORDER BY table_name;

-- Show sample data
SELECT '=== MOCK DATA LOADED SUCCESSFULLY ===' as status;
SELECT 'Password for all test accounts: password123' as info;
