-- HOTEL MANAGEMENT SYSTEM - DATABASE SCHEMA V2 (REVISED)
-- Separated User Tables for Better Data Integrity
-- Last Updated: October 19, 2024
--
-- This schema includes maintenance_logs updates for staff assignment and guest reporting
--
-- Clean start: Drop existing objects
DROP TABLE IF EXISTS service_usage,reviews,service_requests,maintenance_logs,room_images,room_instance_images,room_amenities,amenities,
					 room_availability,payments,bookings,rooms,room_types,service_catalog,
					 password_reset_tokens,otps,staff,guests,admins,branch_images,branches CASCADE;
                     
DROP TYPE IF EXISTS booking_status_enum,payment_method_enum,payment_status_enum,
					room_status_enum,service_status_enum,maintenance_status_enum,request_priority_enum,
					room_type_status_enum CASCADE;

-- ENUMS: Type definitions for data integrity
CREATE TYPE booking_status_enum AS ENUM ('Pending','Confirmed','CheckedIn','CheckedOut','Cancelled','NoShow');
CREATE TYPE payment_method_enum AS ENUM ('CreditCard','DebitCard','Cash','BankTransfer','Online');
CREATE TYPE payment_status_enum AS ENUM ('Pending','Completed','Failed','Refunded');
CREATE TYPE room_status_enum AS ENUM ('Available','Occupied','Maintenance','Cleaning');
CREATE TYPE service_status_enum AS ENUM ('Pending','InProgress','Completed','Cancelled');
CREATE TYPE maintenance_status_enum AS ENUM ('Pending','InProgress','Completed','Cancelled');
CREATE TYPE request_priority_enum AS ENUM ('Low','Normal','High','Urgent');
CREATE TYPE room_type_status_enum AS ENUM ('active','inactive','archived');

-- HELPER FUNCTION: Auto-generate unique references (BK-, PY-, SR-, MN-)
CREATE OR REPLACE FUNCTION generate_reference(prefix TEXT) RETURNS VARCHAR AS $$ 
DECLARE ref VARCHAR; 
BEGIN 
	LOOP 
		ref := prefix || '-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'); 
		IF NOT EXISTS (
			SELECT 1 FROM bookings WHERE booking_reference = ref 
			UNION SELECT 1 FROM service_requests WHERE request_reference = ref 
			UNION SELECT 1 FROM maintenance_logs WHERE log_reference = ref 
			UNION SELECT 1 FROM payments WHERE payment_reference = ref
		) THEN 
			RETURN ref; 
		END IF; 
	END LOOP; 
END; 
$$ LANGUAGE plpgsql;

-- BRANCHES: Hotel branch locations
CREATE TABLE branches (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	location VARCHAR(255),
	address TEXT,
	phone VARCHAR(20),
	email VARCHAR(100) UNIQUE,
	description TEXT,
	manager_name VARCHAR(100),
	is_active BOOLEAN DEFAULT true,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BRANCH IMAGES: Multiple images per branch
CREATE TABLE branch_images (
	id SERIAL PRIMARY KEY,
	branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
	image_url TEXT NOT NULL,
	caption TEXT,
	display_order INT DEFAULT 0,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_branch_images_branch_id ON branch_images(branch_id);
CREATE INDEX idx_branch_images_display_order ON branch_images(branch_id, display_order);

-- ADMINS: System administrators
CREATE TABLE admins (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	phone VARCHAR(20),
	profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-admin.png',
	position VARCHAR(100),
	branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
	access_level VARCHAR(50) DEFAULT 'SuperAdmin',
	is_verified BOOLEAN DEFAULT true,
	is_active BOOLEAN DEFAULT true,
	last_login TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- STAFF: Hotel staff members
CREATE TABLE staff (
	id SERIAL PRIMARY KEY,
	employee_id VARCHAR(50) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	phone VARCHAR(20),
	email VARCHAR(255),
	profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-staff.png',
	branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
	position VARCHAR(100),
	department VARCHAR(100),
	hire_date DATE,
	is_active BOOLEAN DEFAULT true,
	last_login TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GUESTS: Hotel guests/customers
CREATE TABLE guests (
	id SERIAL PRIMARY KEY,
	email VARCHAR(255) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	phone VARCHAR(20),
	profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-guest.png',
	address TEXT,
	date_of_birth DATE,
	id_number VARCHAR(50),
	nationality VARCHAR(100),
	passport_number VARCHAR(50),
	preferences TEXT,
	is_verified BOOLEAN DEFAULT false,
	is_active BOOLEAN DEFAULT true,
	loyalty_points INT DEFAULT 0,
	last_login TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTPS: Two-factor authentication codes (supports all user types)
CREATE TABLE otps (
	id SERIAL PRIMARY KEY,
	user_email VARCHAR(255) NOT NULL,
	user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('ADMIN', 'STAFF', 'GUEST')),
	otp_code VARCHAR(10) NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PASSWORD RESET TOKENS: Secure password reset functionality
CREATE TABLE password_reset_tokens (
	id SERIAL PRIMARY KEY,
	user_email VARCHAR(255) NOT NULL,
	user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('ADMIN', 'STAFF', 'GUEST')),
	reset_token VARCHAR(255) NOT NULL UNIQUE,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	used BOOLEAN DEFAULT FALSE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SERVICE CATALOG: Available hotel services
CREATE TABLE service_catalog (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	category VARCHAR(50),
	price DECIMAL(10,2),
	is_available BOOLEAN DEFAULT true,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROOM TYPES: Room category definitions with pricing
CREATE TABLE room_types (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	base_price DECIMAL(10,2) NOT NULL,
	capacity INT NOT NULL,
	bed_type VARCHAR(50),
	size_sqm DECIMAL(10,2),
	amenities TEXT[],
	images TEXT[],
	status room_type_status_enum DEFAULT 'active',
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROOMS: Physical room inventory
CREATE TABLE rooms (
	id SERIAL PRIMARY KEY,
	room_number VARCHAR(20) NOT NULL UNIQUE,
	room_type_id INT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
	branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
	floor_number INT,
	status room_status_enum DEFAULT 'Available',
	last_cleaned TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BOOKINGS: Guest reservations
CREATE TABLE bookings (
	id SERIAL PRIMARY KEY,
	booking_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_reference('BK'),
	guest_id INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
	room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
	check_in_date DATE NOT NULL,
	check_out_date DATE NOT NULL,
	number_of_guests INT NOT NULL DEFAULT 1,
	status booking_status_enum DEFAULT 'Pending',
	base_amount DECIMAL(10,2), -- Room cost only (price × nights)
	services_amount DECIMAL(10,2) DEFAULT 0.00, -- Additional services total
	total_amount DECIMAL(10,2), -- base_amount + services_amount
	paid_amount DECIMAL(10,2) DEFAULT 0.00, -- Sum of completed payments
	outstanding_amount DECIMAL(10,2), -- total_amount - paid_amount
	special_requests TEXT,
	checked_in_at TIMESTAMP WITH TIME ZONE,
	checked_out_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT check_dates CHECK (check_out_date > check_in_date)
);

-- PAYMENTS: Payment transactions
CREATE TABLE payments (
	id SERIAL PRIMARY KEY,
	payment_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_reference('PY'),
	booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
	amount DECIMAL(10,2) NOT NULL,
	payment_method payment_method_enum NOT NULL,
	payment_status payment_status_enum DEFAULT 'Pending',
	payment_type VARCHAR(50) DEFAULT 'full', -- reservation_fee, partial, full, service_payment
	transaction_id VARCHAR(255),
	paid_at TIMESTAMP WITH TIME ZONE,
	refunded_at TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROOM AVAILABILITY: Track room availability calendar
CREATE TABLE room_availability (
	id SERIAL PRIMARY KEY,
	room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
	date DATE NOT NULL,
	is_available BOOLEAN DEFAULT true,
	price DECIMAL(10,2),
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(room_id, date)
);

-- AMENITIES: Hotel amenities catalog
CREATE TABLE amenities (
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	description TEXT,
	icon_name VARCHAR(50),
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROOM AMENITIES: Link rooms to amenities
CREATE TABLE room_amenities (
	room_type_id INT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
	amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
	PRIMARY KEY (room_type_id, amenity_id)
);

-- ROOM IMAGES: Room type photos (for room categories)
CREATE TABLE room_images (
	id SERIAL PRIMARY KEY,
	room_type_id INT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
	image_url TEXT NOT NULL,
	caption TEXT,
	display_order INT DEFAULT 0,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROOM INSTANCE IMAGES: Individual room photos (for specific room instances)
CREATE TABLE room_instance_images (
	id SERIAL PRIMARY KEY,
	room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
	image_url TEXT NOT NULL,
	caption TEXT,
	display_order INT DEFAULT 0,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_room_instance_images_room_id ON room_instance_images(room_id);
CREATE INDEX idx_room_instance_images_display_order ON room_instance_images(room_id, display_order);

-- MAINTENANCE LOGS: Room maintenance tracking (UPDATED with proper foreign keys)
CREATE TABLE maintenance_logs (
	id SERIAL PRIMARY KEY,
	log_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_reference('MN'),
	room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
	reported_by_staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
	reported_by_guest_id INT REFERENCES guests(id) ON DELETE SET NULL,
	assigned_to_staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
	issue_description TEXT NOT NULL,
	priority request_priority_enum DEFAULT 'Normal',
	status maintenance_status_enum DEFAULT 'Pending',
	resolved_at TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SERVICE REQUESTS: Guest service requests
CREATE TABLE service_requests (
	id SERIAL PRIMARY KEY,
	request_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_reference('SR'),
	guest_id INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
	service_id INT REFERENCES service_catalog(id) ON DELETE SET NULL,
	booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
	request_type VARCHAR(100) NOT NULL,
	description TEXT,
	priority request_priority_enum DEFAULT 'Normal',
	status service_status_enum DEFAULT 'Pending',
	assigned_to_staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
	completed_at TIMESTAMP WITH TIME ZONE,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SERVICE USAGE: Track chargeable services used during stay
CREATE TABLE service_usage (
	id SERIAL PRIMARY KEY,
	booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
	service_id INT NOT NULL REFERENCES service_catalog(id) ON DELETE RESTRICT,
	quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
	price_at_time DECIMAL(10,2) NOT NULL,
	service_date DATE NOT NULL DEFAULT CURRENT_DATE,
	notes TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_service_usage_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
	CONSTRAINT fk_service_usage_service FOREIGN KEY (service_id) REFERENCES service_catalog(id)
);

-- REVIEWS: Guest reviews for bookings
CREATE TABLE reviews (
	id SERIAL PRIMARY KEY,
	booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
	guest_id INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
	rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
	cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
	service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
	amenities_rating INT CHECK (amenities_rating >= 1 AND amenities_rating <= 5),
	comment TEXT,
	is_verified BOOLEAN DEFAULT false,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for better query performance
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_staff_employee_id ON staff(employee_id);
CREATE INDEX idx_staff_branch ON staff(branch_id);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_rooms_branch ON rooms(branch_id);
CREATE INDEX idx_room_availability_date ON room_availability(room_id, date);
CREATE INDEX idx_otps_email_type ON otps(user_email, user_type);
CREATE INDEX idx_otps_expires ON otps(expires_at);
CREATE INDEX idx_service_requests_guest ON service_requests(guest_id);
CREATE INDEX idx_service_requests_booking ON service_requests(booking_id);
CREATE INDEX idx_service_usage_booking ON service_usage(booking_id);
CREATE INDEX idx_service_usage_service ON service_usage(service_id);
CREATE INDEX idx_service_usage_date ON service_usage(service_date);
CREATE INDEX idx_maintenance_logs_room ON maintenance_logs(room_id);
CREATE INDEX idx_maintenance_assigned_staff ON maintenance_logs(assigned_to_staff_id);
CREATE INDEX idx_maintenance_reported_by_guest ON maintenance_logs(reported_by_guest_id);
CREATE INDEX idx_maintenance_reported_by_staff ON maintenance_logs(reported_by_staff_id);
CREATE INDEX idx_bookings_outstanding ON bookings(outstanding_amount);
CREATE INDEX idx_payments_status ON payments(payment_status);

-- Comments for documentation
COMMENT ON TABLE admins IS 'System administrators with full access';
COMMENT ON TABLE staff IS 'Hotel staff members (receptionists, housekeeping, etc.)';
COMMENT ON TABLE guests IS 'Hotel guests/customers';
COMMENT ON TABLE otps IS 'One-time passwords for 2FA - supports all user types';
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens - supports all user types';
COMMENT ON TABLE maintenance_logs IS 'Maintenance tracking with support for both staff and guest reporting';
COMMENT ON COLUMN maintenance_logs.assigned_to_staff_id IS 'Foreign key to staff table for assigned technician';
COMMENT ON COLUMN maintenance_logs.reported_by_staff_id IS 'Foreign key to staff table for staff who reported the issue';
COMMENT ON COLUMN maintenance_logs.reported_by_guest_id IS 'Foreign key to guests table for guest who reported the issue';
COMMENT ON TABLE service_usage IS 'Tracks chargeable services consumed during guest stays (room service, spa, laundry, minibar, etc.)';
COMMENT ON COLUMN service_usage.price_at_time IS 'Price of service at time of usage - may differ from current catalog price';
COMMENT ON COLUMN bookings.base_amount IS 'Base cost of room (price per night × number of nights)';
COMMENT ON COLUMN bookings.services_amount IS 'Total cost of additional services - automatically calculated from service_usage';
COMMENT ON COLUMN bookings.total_amount IS 'Total amount due (base_amount + services_amount)';
COMMENT ON COLUMN bookings.paid_amount IS 'Amount already paid - automatically calculated from payments table';
COMMENT ON COLUMN bookings.outstanding_amount IS 'Amount still owed (total_amount - paid_amount)';
COMMENT ON COLUMN payments.payment_type IS 'Type of payment: reservation_fee, partial, full, service_payment';
