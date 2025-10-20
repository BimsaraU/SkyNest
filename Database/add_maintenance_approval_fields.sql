-- Add approval fields to maintenance_logs table
-- This allows admin to approve staff-submitted maintenance requests

-- Add approval status enum if not exists
DO $$ BEGIN
    CREATE TYPE approval_status_enum AS ENUM ('Pending', 'Approved', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to maintenance_logs
ALTER TABLE maintenance_logs 
ADD COLUMN IF NOT EXISTS approval_status approval_status_enum DEFAULT 'Approved',
ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS requested_by_guest_id INT REFERENCES guests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to_staff_id INT REFERENCES staff(id) ON DELETE SET NULL;

-- Migrate existing assigned_to VARCHAR data to new assigned_to_staff_id column
-- Try to match staff names to IDs, otherwise leave as NULL
UPDATE maintenance_logs
SET assigned_to_staff_id = (
  SELECT s.id 
  FROM staff s 
  WHERE maintenance_logs.assigned_to IS NOT NULL 
    AND (s.first_name || ' ' || s.last_name) = maintenance_logs.assigned_to
  LIMIT 1
)
WHERE assigned_to IS NOT NULL 
  AND assigned_to_staff_id IS NULL;

-- Drop the old assigned_to VARCHAR column (after data migration)
ALTER TABLE maintenance_logs 
DROP COLUMN IF EXISTS assigned_to;

-- Update existing records to be auto-approved (since they existed before approval system)
UPDATE maintenance_logs 
SET approval_status = 'Approved', 
    approved_at = created_at
WHERE approval_status IS NULL;

-- Add comment
COMMENT ON COLUMN maintenance_logs.approval_status IS 'Approval status for staff-submitted requests';
COMMENT ON COLUMN maintenance_logs.approved_by IS 'Staff ID of admin who approved/rejected';
COMMENT ON COLUMN maintenance_logs.assigned_to_staff_id IS 'Staff member assigned to handle this maintenance';
