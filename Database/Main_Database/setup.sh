#!/bin/bash
# ============================================================================
# Hotel Management System - Database Setup Script
# ============================================================================
# This script sets up the complete database in the correct order
#
# Usage:
#   ./setup.sh your_database_name your_username
#
# Or with connection string:
#   DB_URL="postgresql://user:pass@host:port/db" ./setup.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running with DB_URL environment variable
if [ -n "$DB_URL" ]; then
    print_step "Using connection string from DB_URL environment variable"
    PSQL_CMD="psql $DB_URL"
else
    # Get database name and username from arguments
    if [ $# -lt 2 ]; then
        print_error "Usage: $0 database_name username"
        print_warning "Or set DB_URL environment variable: DB_URL='postgresql://user:pass@host:port/db' $0"
        exit 1
    fi

    DB_NAME=$1
    DB_USER=$2
    PSQL_CMD="psql -U $DB_USER -d $DB_NAME"

    print_step "Database: $DB_NAME"
    print_step "User: $DB_USER"
fi

# Confirm before proceeding
echo ""
print_warning "This will DROP ALL EXISTING DATA and recreate the database."
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    print_error "Setup cancelled."
    exit 0
fi

echo ""
print_step "Starting database setup..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Array of SQL files to run in order
SQL_FILES=(
    "01_schema.sql"
    "02_functions.sql"
    "03_triggers.sql"
    "04_procedures.sql"
    "05_mock_data.sql"
)

# Run each SQL file
for sql_file in "${SQL_FILES[@]}"; do
    file_path="$SCRIPT_DIR/$sql_file"
    
    if [ ! -f "$file_path" ]; then
        print_error "File not found: $sql_file"
        exit 1
    fi
    
    print_step "Running $sql_file..."
    
    if $PSQL_CMD -f "$file_path" > /dev/null 2>&1; then
        print_success "✓ $sql_file completed"
    else
        print_error "✗ $sql_file failed"
        print_error "Please check the error messages above."
        exit 1
    fi
done

echo ""
print_success "================================================"
print_success "   Database Setup Completed Successfully!"
print_success "================================================"
echo ""
print_step "Statistics:"
$PSQL_CMD -c "SELECT 
    'branches' as table_name, COUNT(*) as rows FROM branches
UNION ALL SELECT 'admins', COUNT(*) FROM admins
UNION ALL SELECT 'staff', COUNT(*) FROM staff
UNION ALL SELECT 'guests', COUNT(*) FROM guests
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'maintenance_logs', COUNT(*) FROM maintenance_logs
UNION ALL SELECT 'service_requests', COUNT(*) FROM service_requests
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
ORDER BY table_name;"

echo ""
print_success "Test Account Credentials:"
echo "  Password for ALL accounts: password123"
echo "  Admin:  admin@skynest.lk"
echo "  Staff:  samantha.ds@skynest.lk"
echo "  Guest:  john.doe@email.com"
echo ""
print_success "You can now start your application!"
