-- Migration: Fix maintenance_logs schema to support proper staff assignment and guest reporting
-- Date: October 2024
-- Purpose: 
--   1. Add assigned_to_staff_id foreign key column
--   2. Add reported_by_guest_id for guest-submitted requests

-- Step 1: Add new columns
ALTER TABLE maintenance_logs
ADD COLUMN IF NOT EXISTS assigned_to_staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reported_by_guest_id INT REFERENCES guests(id) ON DELETE SET NULL;

-- Step 2: (No data migration needed - columns are new)

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_staff ON maintenance_logs(assigned_to_staff_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_by_guest ON maintenance_logs(reported_by_guest_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reported_by_staff ON maintenance_logs(reported_by_staff_id);

-- Step 4: Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_maintenance_logs_updated_at'
    ) THEN
        CREATE TRIGGER update_maintenance_logs_updated_at 
        BEFORE UPDATE ON maintenance_logs 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 5: Add comments for documentation
-- Note: Only adding comments for columns that exist or were just created
COMMENT ON COLUMN maintenance_logs.assigned_to_staff_id IS 'Foreign key to staff table for assigned technician';
COMMENT ON COLUMN maintenance_logs.reported_by_staff_id IS 'Foreign key to staff table for staff who reported the issue';
COMMENT ON COLUMN maintenance_logs.reported_by_guest_id IS 'Foreign key to guests table for guest who reported the issue';

-- Verification queries (run these after migration):
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'maintenance_logs' 
-- ORDER BY ordinal_position;
