-- Migration script to update password_reset_tokens table
-- This updates the table from V1 schema (token_hash) to V2 schema (reset_token, used)
-- Run this ONCE: psql -U postgres -d hotel_db -f migrate_password_reset_tokens.sql

\echo '========================================='
\echo 'MIGRATING password_reset_tokens TABLE'
\echo '========================================='
\echo ''

-- Check if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN
        RAISE NOTICE 'Table password_reset_tokens exists - proceeding with migration';
    ELSE
        RAISE NOTICE 'Table does not exist - will create new table';
    END IF;
END $$;

-- Drop the old table if it exists (safe because we're just changing structure)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Create the new table with correct V2 schema
CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('ADMIN', 'STAFF', 'GUEST')),
    reset_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX idx_reset_token ON password_reset_tokens(reset_token);
CREATE INDEX idx_user_email_type ON password_reset_tokens(user_email, user_type);
CREATE INDEX idx_expires_at ON password_reset_tokens(expires_at);

-- Add comments
COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens - supports all user types (V2 Schema)';
COMMENT ON COLUMN password_reset_tokens.user_email IS 'Email of the user requesting reset';
COMMENT ON COLUMN password_reset_tokens.user_type IS 'Type of user: ADMIN, STAFF, or GUEST';
COMMENT ON COLUMN password_reset_tokens.reset_token IS 'Plain 64-character hex token (not hashed)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Whether token has been used (for audit trail)';

\echo ''
\echo '========================================='
\echo 'MIGRATION COMPLETE!'
\echo '========================================='
\echo ''
\echo 'Table structure:'
\d password_reset_tokens

\echo ''
\echo 'Verify table is empty:'
SELECT COUNT(*) as token_count FROM password_reset_tokens;
