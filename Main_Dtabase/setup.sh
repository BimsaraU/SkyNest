#!/bin/bash
# SkyNest - New consolidated DB setup runner (root/Main_Dtabase)
# Usage:
#   DB_URL='postgresql://user:pass@host:port/db' ./setup.sh
#   or
#   ./setup.sh database_name username

set -e

if [ -n "$DB_URL" ]; then
  PSQL_CMD="psql $DB_URL"
else
  DB_NAME=$1
  DB_USER=$2
  if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo "Usage: $0 database_name username"; exit 1;
  fi
  PSQL_CMD="psql -U $DB_USER -d $DB_NAME"
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

SQL_FILES=(
  "01_schema_and_indexes.sql"
  "02_functions.sql"
  "03_triggers.sql"
  "04_procedures.sql"
  "05_mock_data.sql"
)

for f in "${SQL_FILES[@]}"; do
  echo "[DB] Running $f..."
  $PSQL_CMD -f "$SCRIPT_DIR/$f"
  echo "[DB] ✓ $f"
done

echo "[DB] All done."
