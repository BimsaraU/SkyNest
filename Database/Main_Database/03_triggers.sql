-- ============================================================================
-- ESSENTIAL TRIGGERS FOR HOTEL MANAGEMENT V2
-- ============================================================================
-- Only critical automated operations for data integrity and automation
-- Compatible with separated user tables (admins, staff, guests)
-- Reduced from 13 triggers to 5 essential triggers
-- ============================================================================

-- ============================================================================
-- 1. TIMESTAMP UPDATER: Auto-update updated_at on record changes
-- ============================================================================
-- Applied to critical tables that need audit trail
-- Ensures updated_at is always current without application logic

CREATE OR REPLACE FUNCTION update_timestamp() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all user tables
CREATE TRIGGER trigger_update_admins_timestamp 
    BEFORE UPDATE ON admins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_staff_timestamp 
    BEFORE UPDATE ON staff 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_guests_timestamp 
    BEFORE UPDATE ON guests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

-- Apply to core operational tables
CREATE TRIGGER trigger_update_bookings_timestamp 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_rooms_timestamp 
    BEFORE UPDATE ON rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_maintenance_logs_timestamp 
    BEFORE UPDATE ON maintenance_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 2. BOOKING TOTAL CALCULATOR: Auto-calculate booking amount
-- ============================================================================
-- Calculates total_amount = (check_out_date - check_in_date) × room_base_price
-- Ensures consistency without application recalculation

CREATE OR REPLACE FUNCTION calculate_booking_total() 
RETURNS TRIGGER AS $$
DECLARE
    base_price NUMERIC(10,2);
    nights INT;
BEGIN
    -- Get room's base price from room_types
    SELECT rt.base_price INTO base_price 
    FROM room_types rt 
    JOIN rooms r ON r.room_type_id = rt.id 
    WHERE r.id = NEW.room_id;
    
    -- Calculate number of nights
    nights := (NEW.check_out_date - NEW.check_in_date);
    
    -- Set total amount
    NEW.total_amount := base_price * nights;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_booking_total 
    BEFORE INSERT OR UPDATE OF room_id, check_in_date, check_out_date ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_booking_total();

-- ============================================================================
-- 3. BOOKING VALIDATOR: Prevent double bookings and invalid dates
-- ============================================================================
-- Critical data integrity check - prevents room conflicts
-- Validates: check_in < check_out, no overlapping bookings

CREATE OR REPLACE FUNCTION validate_booking() 
RETURNS TRIGGER AS $$
BEGIN
    -- Validate date range
    IF NEW.check_in_date >= NEW.check_out_date THEN
        RAISE EXCEPTION 'Check-out date must be after check-in date';
    END IF;
    
    -- Check for overlapping bookings (using daterange for accuracy)
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE room_id = NEW.room_id 
        AND status NOT IN ('Cancelled', 'CheckedOut', 'NoShow')
        AND daterange(check_in_date, check_out_date, '[]') && 
            daterange(NEW.check_in_date, NEW.check_out_date, '[]')
        AND (TG_OP = 'INSERT' OR id <> NEW.id)
    ) THEN
        RAISE EXCEPTION 'Room is already booked for the selected dates';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_booking 
    BEFORE INSERT OR UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION validate_booking();

-- ============================================================================
-- 4. ROOM STATUS SYNCHRONIZER: Keep room status synced with bookings
-- ============================================================================
-- Automatically updates room.status based on booking.status changes
-- CheckedIn → Occupied, CheckedOut → Cleaning, Cancelled/NoShow → Available

CREATE OR REPLACE FUNCTION sync_room_status() 
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Guest checked in: mark room as occupied
        IF NEW.status = 'CheckedIn' THEN
            UPDATE rooms SET status = 'Occupied' WHERE id = NEW.room_id;
        
        -- Guest checked out: mark room as needs cleaning
        ELSIF NEW.status = 'CheckedOut' THEN
            UPDATE rooms SET status = 'Cleaning' WHERE id = NEW.room_id;
        
        -- Booking cancelled or no-show: mark available if no other active bookings
        ELSIF NEW.status IN ('Cancelled', 'NoShow') THEN
            IF NOT EXISTS (
                SELECT 1 FROM bookings 
                WHERE room_id = NEW.room_id 
                AND id <> NEW.id 
                AND status IN ('Confirmed', 'CheckedIn')
            ) THEN
                UPDATE rooms SET status = 'Available' WHERE id = NEW.room_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_room_status 
    AFTER INSERT OR UPDATE OF status ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_room_status();

-- ============================================================================
-- 5. OTP CLEANUP: Remove expired OTP records automatically
-- ============================================================================
-- Security measure: clean up expired OTPs before each insert
-- Prevents OTP table from growing indefinitely

CREATE OR REPLACE FUNCTION clean_expired_otps() 
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM otps WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clean_expired_otps 
    BEFORE INSERT ON otps 
    FOR EACH STATEMENT 
    EXECUTE FUNCTION clean_expired_otps();

-- ============================================================================
-- AUTOMATED TRIGGERS AND FUNCTIONS FOR FLEXIBLE PAYMENT SYSTEM
-- ============================================================================

-- Function to automatically calculate outstanding_amount
CREATE OR REPLACE FUNCTION calculate_outstanding_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total_amount as base + services
    NEW.total_amount := COALESCE(NEW.base_amount, 0) + COALESCE(NEW.services_amount, 0);
    
    -- Calculate outstanding as total - paid
    NEW.outstanding_amount := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate amounts on insert/update
CREATE TRIGGER trigger_calculate_outstanding
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_outstanding_amount();

-- Function to update booking paid_amount when payments are made
CREATE OR REPLACE FUNCTION update_booking_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the booking's paid_amount based on sum of all successful payments
    UPDATE bookings
    SET paid_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM payments
        WHERE booking_id = NEW.booking_id
        AND payment_status = 'Completed'
    )
    WHERE id = NEW.booking_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update booking paid_amount when payment is made
CREATE TRIGGER trigger_update_booking_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_paid_amount();

-- Function to update booking services_amount when services are added
CREATE OR REPLACE FUNCTION update_booking_services_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the booking's services_amount based on sum of all service usage
    UPDATE bookings
    SET services_amount = (
        SELECT COALESCE(SUM(price_at_time * quantity), 0)
        FROM service_usage
        WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    )
    WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update booking services_amount when services change
CREATE TRIGGER trigger_update_booking_services
    AFTER INSERT OR UPDATE OR DELETE ON service_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_services_amount();

-- ============================================================================
-- END OF TRIGGERS AND FUNCTIONS
-- ============================================================================

-- ============================================================================
-- TRIGGER DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION update_timestamp() IS 
    'Auto-update updated_at timestamp on record changes';

COMMENT ON FUNCTION calculate_booking_total() IS 
    'Auto-calculate booking total amount based on nights and room price';

COMMENT ON FUNCTION validate_booking() IS 
    'Prevent double bookings and validate date ranges';

COMMENT ON FUNCTION sync_room_status() IS 
    'Keep room status synchronized with booking status changes';

COMMENT ON FUNCTION clean_expired_otps() IS 
    'Automatically clean up expired OTP records for security';
