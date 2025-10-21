-- ESSENTIAL STORED PROCEDURES FOR HOTEL MANAGEMENT SYSTEM V2
-- Only critical operations that require transactional integrity

-- 1. CREATE BOOKING (Most important procedure)
CREATE OR REPLACE PROCEDURE create_booking(
	p_guest_id INT,
	p_room_id INT,
	p_check_in DATE,
	p_check_out DATE,
	p_guests INT,
	INOUT p_booking_id INT,
	OUT p_booking_ref VARCHAR,
	OUT p_total_amount NUMERIC,
	OUT p_success BOOLEAN,
	OUT p_message TEXT,
	p_special_requests TEXT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
	p_success := false;
    
	-- Validate guest exists
	IF NOT EXISTS(SELECT 1 FROM guests WHERE id = p_guest_id) THEN
		p_message := 'Guest not found'; 
		RETURN;
	END IF;
    
	-- Validate room exists and is available
	IF NOT EXISTS(SELECT 1 FROM rooms WHERE id = p_room_id AND status IN ('Available', 'Cleaning')) THEN
		p_message := 'Room not available'; 
		RETURN;
	END IF;
    
	-- Check for date conflicts
	IF EXISTS(
		SELECT 1 FROM bookings 
		WHERE room_id = p_room_id 
		AND status IN ('Pending', 'Confirmed', 'CheckedIn')
		AND daterange(check_in_date, check_out_date, '[]') && 
			daterange(p_check_in, p_check_out, '[]')
	) THEN
		p_message := 'Room already booked for these dates'; 
		RETURN;
	END IF;
    
	-- Create booking
	INSERT INTO bookings(
		guest_id, room_id, check_in_date, check_out_date, 
		number_of_guests, special_requests, status
	)
	VALUES(
		p_guest_id, p_room_id, p_check_in, p_check_out, 
		p_guests, p_special_requests, 'Pending'
	)
	RETURNING id, booking_reference, total_amount 
	INTO p_booking_id, p_booking_ref, p_total_amount;
    
	p_success := true;
	p_message := 'Booking created successfully';
END;
$$;

-- 2. RECORD PAYMENT (Critical for payment processing)
CREATE OR REPLACE PROCEDURE record_payment(
	p_booking_id INT,
	p_amount NUMERIC,
	p_method payment_method_enum,
	OUT p_payment_id INT,
	OUT p_success BOOLEAN,
	OUT p_message TEXT,
	p_transaction_id VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
	v_total NUMERIC;
	v_paid NUMERIC;
BEGIN
	-- Validate booking exists
	IF NOT EXISTS(SELECT 1 FROM bookings WHERE id = p_booking_id) THEN 
		p_success := false; 
		p_message := 'Booking not found'; 
		RETURN; 
	END IF;
    
	-- Validate amount
	IF p_amount <= 0 THEN 
		p_success := false; 
		p_message := 'Amount must be positive'; 
		RETURN; 
	END IF;
    
	-- Insert payment
	INSERT INTO payments(
		booking_id, amount, payment_method, payment_status, 
		transaction_id, paid_at
	) 
	VALUES(
		p_booking_id, p_amount, p_method, 'Completed',
		p_transaction_id, CURRENT_TIMESTAMP
	) 
	RETURNING id INTO p_payment_id;
    
	-- Check if fully paid and auto-confirm
	SELECT total_amount INTO v_total FROM bookings WHERE id = p_booking_id;
	SELECT COALESCE(SUM(amount), 0) INTO v_paid 
	FROM payments 
	WHERE booking_id = p_booking_id AND payment_status = 'Completed';
    
	IF v_paid >= v_total THEN
		UPDATE bookings 
		SET status = 'Confirmed' 
		WHERE id = p_booking_id AND status = 'Pending';
	END IF;
    
	p_success := true;
	p_message := 'Payment recorded successfully';
END;
$$;

-- 3. CALCULATE FINAL BILL (Room charges + Service charges)
CREATE OR REPLACE FUNCTION calculate_final_bill(p_booking_id INT)
RETURNS TABLE(
	room_charges NUMERIC,
	service_charges NUMERIC,
	total_bill NUMERIC,
	paid_amount NUMERIC,
	outstanding_balance NUMERIC
) 
LANGUAGE plpgsql AS $$
BEGIN
	RETURN QUERY
	SELECT 
		b.total_amount AS room_charges,
		COALESCE(SUM(su.quantity * su.price_at_time), 0) AS service_charges,
		b.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0) AS total_bill,
		COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = p_booking_id AND payment_status = 'Completed'), 0) AS paid_amount,
		(b.total_amount + COALESCE(SUM(su.quantity * su.price_at_time), 0)) - 
		COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = p_booking_id AND payment_status = 'Completed'), 0) AS outstanding_balance
	FROM bookings b
	LEFT JOIN service_usage su ON su.booking_id = b.id
	WHERE b.id = p_booking_id
	GROUP BY b.id, b.total_amount;
END;
$$;

-- 4. PROCESS CHECKOUT (Validates payment before checkout)
CREATE OR REPLACE PROCEDURE process_checkout(
	p_booking_id INT,
	OUT p_success BOOLEAN,
	OUT p_message TEXT,
	OUT p_outstanding NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
	v_bill RECORD;
BEGIN
	p_success := false;
    
	-- Get bill details
	SELECT * INTO v_bill FROM calculate_final_bill(p_booking_id);
    
	IF NOT FOUND THEN
		p_message := 'Booking not found';
		RETURN;
	END IF;
    
	-- Check if fully paid
	IF v_bill.outstanding_balance > 0 THEN
		p_message := 'Cannot checkout - Outstanding balance: LKR ' || v_bill.outstanding_balance;
		p_outstanding := v_bill.outstanding_balance;
		RETURN;
	END IF;
    
	-- Process checkout
	UPDATE bookings 
	SET status = 'CheckedOut', 
		checked_out_at = CURRENT_TIMESTAMP
	WHERE id = p_booking_id;
    
	-- Room status will be updated by trigger
    
	p_success := true;
	p_message := 'Checkout completed successfully';
	p_outstanding := 0;
END;
$$;

COMMENT ON PROCEDURE create_booking IS 'Create booking with validation';
COMMENT ON PROCEDURE record_payment IS 'Record payment and auto-confirm booking';
COMMENT ON FUNCTION calculate_final_bill IS 'Calculate total bill including room charges and service charges';
COMMENT ON PROCEDURE process_checkout IS 'Process guest checkout with payment validation';
