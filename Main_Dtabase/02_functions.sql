-- ESSENTIAL FUNCTIONS FOR HOTEL MANAGEMENT V2
-- Only critical query helper functions

-- 1. Get Available Rooms (Most important for booking flow)
CREATE OR REPLACE FUNCTION get_available_rooms(
	p_check_in DATE,
	p_check_out DATE,
	p_branch_id INT DEFAULT NULL,
	p_min_capacity INT DEFAULT NULL
)
RETURNS TABLE (
	room_type_id INT,
	room_type_name VARCHAR,
	description TEXT,
	base_price NUMERIC,
	capacity INT,
	branch_id INT,
	branch_name VARCHAR,
	available_count BIGINT,
	amenities TEXT[],
	images TEXT[]
) AS $$ 
BEGIN 
	RETURN QUERY
	SELECT 
		rt.id,
		rt.name,
		rt.description,
		rt.base_price,
		rt.capacity,
		b.id AS branch_id,
		b.name AS branch_name,
		COUNT(DISTINCT r.id)::BIGINT,
		rt.amenities,
		rt.images
	FROM room_types rt
	JOIN rooms r ON r.room_type_id = rt.id
	JOIN branches b ON r.branch_id = b.id
	WHERE rt.status = 'active'
	AND r.status IN ('Available', 'Cleaning')
	AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
	AND (p_min_capacity IS NULL OR rt.capacity >= p_min_capacity)
	AND NOT EXISTS (
		SELECT 1 FROM bookings bk 
		WHERE bk.room_id = r.id 
		AND bk.status IN ('Pending', 'Confirmed', 'CheckedIn')
		AND daterange(bk.check_in_date, bk.check_out_date, '[]') && 
			daterange(p_check_in, p_check_out, '[]')
	)
	GROUP BY rt.id, rt.name, rt.description, rt.base_price, rt.capacity, b.id, b.name, rt.amenities, rt.images
	HAVING COUNT(DISTINCT r.id) > 0
	ORDER BY rt.base_price ASC;
END; 
$$ LANGUAGE plpgsql STABLE;

-- 2. Check Room Availability (Quick boolean check)
CREATE OR REPLACE FUNCTION check_room_availability(
	p_room_id INT,
	p_check_in DATE,
	p_check_out DATE
) 
RETURNS BOOLEAN AS $$ 
BEGIN 
	RETURN NOT EXISTS (
		SELECT 1 FROM bookings 
		WHERE room_id = p_room_id 
		AND status IN ('Pending', 'Confirmed', 'CheckedIn')
		AND daterange(check_in_date, check_out_date, '[]') && 
			daterange(p_check_in, p_check_out, '[]')
	);
END; 
$$ LANGUAGE plpgsql STABLE;

-- 3. Get Booking Details (For booking confirmation and display)
CREATE OR REPLACE FUNCTION get_booking_details(
	p_booking_id INT DEFAULT NULL,
	p_booking_reference VARCHAR DEFAULT NULL
)
RETURNS TABLE (
	booking_id INT,
	booking_reference VARCHAR,
	guest_id INT,
	guest_name TEXT,
	guest_email VARCHAR,
	guest_phone VARCHAR,
	room_number VARCHAR,
	room_type_name VARCHAR,
	branch_name VARCHAR,
	check_in_date DATE,
	check_out_date DATE,
	number_of_guests INT,
	total_amount NUMERIC,
	status booking_status_enum,
	special_requests TEXT
) AS $$ 
BEGIN 
	RETURN QUERY
	SELECT 
		b.id,
		b.booking_reference,
		b.guest_id,
		CONCAT(g.first_name, ' ', g.last_name),
		g.email,
		g.phone,
		r.room_number,
		rt.name,
		br.name,
		b.check_in_date,
		b.check_out_date,
		b.number_of_guests,
		b.total_amount,
		b.status,
		b.special_requests
	FROM bookings b
	JOIN guests g ON b.guest_id = g.id
	JOIN rooms r ON b.room_id = r.id
	JOIN room_types rt ON r.room_type_id = rt.id
	JOIN branches br ON r.branch_id = br.id
	WHERE (p_booking_id IS NOT NULL AND b.id = p_booking_id)
	   OR (p_booking_reference IS NOT NULL AND b.booking_reference = p_booking_reference);
END; 
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_rooms IS 'Search available rooms with filters';
COMMENT ON FUNCTION check_room_availability IS 'Quick availability check for a specific room';
COMMENT ON FUNCTION get_booking_details IS 'Get detailed booking information';

-- ============================================================================
-- REPORTING FUNCTIONS (Project Requirements)
-- ============================================================================

-- 4. Room Occupancy Report
CREATE OR REPLACE FUNCTION report_room_occupancy(
	p_start_date DATE DEFAULT CURRENT_DATE,
	p_end_date DATE DEFAULT CURRENT_DATE,
	p_branch_id INT DEFAULT NULL
)
RETURNS TABLE (
	branch_name VARCHAR,
	room_number VARCHAR,
	room_type VARCHAR,
	status room_status_enum,
	is_occupied BOOLEAN,
	guest_name TEXT,
	check_in DATE,
	check_out DATE,
	nights INT
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		b.name AS branch_name,
		r.room_number,
		rt.name AS room_type,
		r.status,
		CASE 
			WHEN bk.id IS NOT NULL THEN true 
			ELSE false 
		END AS is_occupied,
		CASE 
			WHEN bk.id IS NOT NULL THEN g.first_name || ' ' || g.last_name 
			ELSE NULL 
		END AS guest_name,
		bk.check_in_date AS check_in,
		bk.check_out_date AS check_out,
		CASE 
			WHEN bk.id IS NOT NULL THEN (bk.check_out_date - bk.check_in_date)::INT 
			ELSE NULL 
		END AS nights
	FROM rooms r
	JOIN branches b ON r.branch_id = b.id
	JOIN room_types rt ON r.room_type_id = rt.id
	LEFT JOIN bookings bk ON r.id = bk.room_id 
		AND bk.status IN ('Confirmed', 'CheckedIn')
		AND daterange(bk.check_in_date, bk.check_out_date, '[]') && 
			daterange(p_start_date, p_end_date, '[]')
	LEFT JOIN guests g ON bk.guest_id = g.id
	WHERE (p_branch_id IS NULL OR r.branch_id = p_branch_id)
	ORDER BY b.name, r.room_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Guest Billing Summary
CREATE OR REPLACE FUNCTION report_guest_billing(
	p_guest_id INT DEFAULT NULL,
	p_include_paid BOOLEAN DEFAULT false
)
RETURNS TABLE (
	guest_name TEXT,
	guest_email VARCHAR,
	booking_reference VARCHAR,
	check_in DATE,
	check_out DATE,
	room_charges NUMERIC,
	service_charges NUMERIC,
	total_bill NUMERIC,
	paid_amount NUMERIC,
	outstanding_balance NUMERIC,
	payment_status TEXT
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		g.first_name || ' ' || g.last_name AS guest_name,
		g.email AS guest_email,
		bk.booking_reference,
		bk.check_in_date AS check_in,
		bk.check_out_date AS check_out,
		bk.total_amount AS room_charges,
		COALESCE(SUM(su.quantity * su.price_at_time), 0) AS service_charges,
		bk.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0) AS total_bill,
		COALESCE((
			SELECT SUM(p.amount) 
			FROM payments p 
			WHERE p.booking_id = bk.id AND p.payment_status = 'Completed'
		), 0) AS paid_amount,
		(bk.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0)) - 
		COALESCE((
			SELECT SUM(p.amount) 
			FROM payments p 
			WHERE p.booking_id = bk.id AND p.payment_status = 'Completed'
		), 0) AS outstanding_balance,
		CASE 
			WHEN (bk.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0)) - 
				 COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = bk.id AND p.payment_status = 'Completed'), 0) <= 0 
			THEN 'Paid'
			ELSE 'Outstanding'
		END AS payment_status
	FROM bookings bk
	JOIN guests g ON bk.guest_id = g.id
	LEFT JOIN service_usage su ON su.booking_id = bk.id
	WHERE (p_guest_id IS NULL OR bk.guest_id = p_guest_id)
	AND bk.status NOT IN ('Cancelled', 'NoShow')
	GROUP BY g.id, g.first_name, g.last_name, g.email, bk.id, bk.booking_reference, bk.check_in_date, bk.check_out_date, bk.total_amount
	HAVING p_include_paid = true OR 
		   (bk.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0)) - 
		   COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = bk.id AND p.payment_status = 'Completed'), 0) > 0
	ORDER BY outstanding_balance DESC, bk.check_out_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Service Usage Breakdown
CREATE OR REPLACE FUNCTION report_service_usage(
	p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
	p_end_date DATE DEFAULT CURRENT_DATE,
	p_branch_id INT DEFAULT NULL,
	p_service_id INT DEFAULT NULL
)
RETURNS TABLE (
	branch_name VARCHAR,
	room_number VARCHAR,
	guest_name TEXT,
	service_name VARCHAR,
	category VARCHAR,
	quantity INT,
	price_at_time NUMERIC,
	subtotal NUMERIC,
	service_date DATE
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		br.name AS branch_name,
		r.room_number,
		g.first_name || ' ' || g.last_name AS guest_name,
		sc.name AS service_name,
		sc.category,
		su.quantity,
		su.price_at_time,
		(su.quantity * su.price_at_time) AS subtotal,
		su.service_date
	FROM service_usage su
	JOIN bookings bk ON su.booking_id = bk.id
	JOIN service_catalog sc ON su.service_id = sc.id
	JOIN rooms r ON bk.room_id = r.id
	JOIN branches br ON r.branch_id = br.id
	JOIN guests g ON bk.guest_id = g.id
	WHERE su.service_date BETWEEN p_start_date AND p_end_date
	AND (p_branch_id IS NULL OR r.branch_id = p_branch_id)
	AND (p_service_id IS NULL OR su.service_id = p_service_id)
	ORDER BY su.service_date DESC, br.name, r.room_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Monthly Revenue Per Branch
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
	booking_count BIGINT,
	average_booking_value NUMERIC
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		br.name AS branch_name,
		COALESCE(SUM(bk.total_amount), 0) AS room_revenue,
		COALESCE(SUM(su.quantity * su.price_at_time), 0) AS service_revenue,
		COALESCE(SUM(bk.total_amount), 0) + COALESCE(SUM(su.quantity * su.price_at_time), 0) AS total_revenue,
		COUNT(DISTINCT bk.id) AS booking_count,
		CASE 
			WHEN COUNT(DISTINCT bk.id) > 0 
			THEN (COALESCE(SUM(bk.total_amount), 0) + COALESCE(SUM(su.quantity * su.price_at_time), 0)) / COUNT(DISTINCT bk.id) 
			ELSE 0 
		END AS average_booking_value
	FROM branches br
	LEFT JOIN rooms r ON r.branch_id = br.id
	LEFT JOIN bookings bk ON bk.room_id = r.id
		AND EXTRACT(YEAR FROM bk.check_in_date) = p_year
		AND EXTRACT(MONTH FROM bk.check_in_date) = p_month
		AND bk.status NOT IN ('Cancelled', 'NoShow')
	LEFT JOIN service_usage su ON su.booking_id = bk.id
	WHERE (p_branch_id IS NULL OR br.id = p_branch_id)
	AND br.is_active = true
	GROUP BY br.id, br.name
	ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Top Used Services & Trends
CREATE OR REPLACE FUNCTION report_top_services(
	p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
	p_end_date DATE DEFAULT CURRENT_DATE,
	p_limit INT DEFAULT 10
)
RETURNS TABLE (
	service_name VARCHAR,
	category VARCHAR,
	total_usage_count BIGINT,
	total_revenue NUMERIC,
	average_price NUMERIC,
	unique_guests BIGINT
) AS $$
BEGIN
	RETURN QUERY
	SELECT 
		sc.name AS service_name,
		sc.category,
		COUNT(su.id) AS total_usage_count,
		SUM(su.quantity * su.price_at_time) AS total_revenue,
		AVG(su.price_at_time) AS average_price,
		COUNT(DISTINCT bk.guest_id) AS unique_guests
	FROM service_catalog sc
	LEFT JOIN service_usage su ON su.service_id = sc.id
		AND su.service_date BETWEEN p_start_date AND p_end_date
	LEFT JOIN bookings bk ON su.booking_id = bk.id
	GROUP BY sc.id, sc.name, sc.category
	HAVING COUNT(su.id) > 0
	ORDER BY total_usage_count DESC, total_revenue DESC
	LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION report_room_occupancy IS 'Report 1: Room occupancy for a date range';
COMMENT ON FUNCTION report_guest_billing IS 'Report 2: Guest billing summary with unpaid balances';
COMMENT ON FUNCTION report_service_usage IS 'Report 3: Service usage breakdown per room and service type';
COMMENT ON FUNCTION report_monthly_revenue IS 'Report 4: Monthly revenue per branch (room + services)';
COMMENT ON FUNCTION report_top_services IS 'Report 5: Top-used services and customer preference trends';
