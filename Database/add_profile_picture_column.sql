-- ADD PROFILE PICTURE COLUMN TO ALL USER TABLES
-- This migration adds profile_picture column to store image paths

-- Add to admins table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='admins' AND column_name='profile_picture'
    ) THEN
        ALTER TABLE admins ADD COLUMN profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-admin.png';
    END IF;
END $$;

-- Add to staff table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='staff' AND column_name='profile_picture'
    ) THEN
        ALTER TABLE staff ADD COLUMN profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-staff.png';
    END IF;
END $$;

-- Add to guests table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='guests' AND column_name='profile_picture'
    ) THEN
        ALTER TABLE guests ADD COLUMN profile_picture VARCHAR(255) DEFAULT '/uploads/profile-pictures/default-guest.png';
    END IF;
END $$;

-- Verification
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE column_name = 'profile_picture'
AND table_name IN ('admins', 'staff', 'guests')
ORDER BY table_name;
