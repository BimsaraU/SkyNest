-- Migration: Add Flexible Payment System Support
-- Date: October 20, 2025
-- Description: Adds columns to support partial payments, payment tracking, and services

-- Step 1: Add new columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS services_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS outstanding_amount DECIMAL(10,2);

-- Step 2: Populate base_amount with existing total_amount for existing records
UPDATE bookings 
SET base_amount = total_amount,
    services_amount = 0.00,
    paid_amount = 0.00,
    outstanding_amount = total_amount
WHERE base_amount IS NULL;

-- Step 3: Make base_amount NOT NULL after populating
ALTER TABLE bookings 
ALTER COLUMN base_amount SET NOT NULL;

-- Step 4: Create a function to automatically calculate outstanding_amount
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

-- Step 5: Create trigger to auto-calculate amounts on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_outstanding ON bookings;
CREATE TRIGGER trigger_calculate_outstanding
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION calculate_outstanding_amount();

-- Step 6: Update existing bookings to recalculate amounts
UPDATE bookings 
SET base_amount = base_amount; -- Trigger will recalculate all amounts

-- Step 7: Create function to update booking amounts when payments are made
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

-- Step 8: Create trigger to auto-update booking paid_amount when payment is made
DROP TRIGGER IF EXISTS trigger_update_booking_payment ON payments;
CREATE TRIGGER trigger_update_booking_payment
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_paid_amount();

-- Step 9: Create function to update booking services_amount when services are added
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

-- Step 10: Create trigger to auto-update booking services_amount when services change
DROP TRIGGER IF EXISTS trigger_update_booking_services ON service_usage;
CREATE TRIGGER trigger_update_booking_services
    AFTER INSERT OR UPDATE OR DELETE ON service_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_services_amount();

-- Step 11: Add comments for documentation
COMMENT ON COLUMN bookings.base_amount IS 'Base cost of room (price per night × number of nights)';
COMMENT ON COLUMN bookings.services_amount IS 'Total cost of additional services - automatically calculated from service_usage';
COMMENT ON COLUMN bookings.total_amount IS 'Total amount due (base_amount + services_amount) - automatically calculated';
COMMENT ON COLUMN bookings.paid_amount IS 'Amount already paid - automatically calculated from payments table';
COMMENT ON COLUMN bookings.outstanding_amount IS 'Amount still owed (total_amount - paid_amount) - automatically calculated';

-- Step 12: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_outstanding ON bookings(outstanding_amount);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Step 13: Add payment type column to distinguish reservation fee vs full payment
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'full';

COMMENT ON COLUMN payments.payment_type IS 'Type of payment: reservation_fee, partial, full, service_payment';

-- Verification query to check the migration
-- Run this after applying the migration:
/*
SELECT 
    b.booking_reference,
    b.base_amount,
    b.services_amount,
    b.total_amount,
    b.paid_amount,
    b.outstanding_amount,
    b.status
FROM bookings b
ORDER BY b.created_at DESC
LIMIT 10;
*/
