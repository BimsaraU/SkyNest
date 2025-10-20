-- Check for duplicate branches in the database
-- Run this query to see if there are duplicate branch entries

-- 1. Find duplicate branch names
SELECT name, location, COUNT(*) as count
FROM branches
GROUP BY name, location
HAVING COUNT(*) > 1;

-- 2. Find all branches (to see what's in the database)
SELECT id, name, location, email, is_active
FROM branches
ORDER BY name, id;

-- 3. If duplicates exist, this will show all instances
SELECT b1.id, b1.name, b1.location, b1.email, b1.is_active, b1.created_at
FROM branches b1
WHERE EXISTS (
  SELECT 1 
  FROM branches b2 
  WHERE b1.name = b2.name 
  AND b1.location = b2.location 
  AND b1.id != b2.id
)
ORDER BY b1.name, b1.id;

-- 4. OPTIONAL: Delete duplicate branches (keeps the one with lowest ID)
-- CAUTION: Only run this if you've verified the duplicates and backed up!
-- This will delete newer duplicate entries, keeping the oldest
/*
DELETE FROM branches
WHERE id IN (
  SELECT b1.id
  FROM branches b1
  INNER JOIN branches b2 ON b1.name = b2.name 
    AND b1.location = b2.location 
    AND b1.id > b2.id
);
*/

-- 5. SAFER OPTION: Mark duplicates as inactive instead of deleting
-- This preserves data but hides duplicates from queries
/*
UPDATE branches
SET is_active = false
WHERE id IN (
  SELECT b1.id
  FROM branches b1
  INNER JOIN branches b2 ON b1.name = b2.name 
    AND b1.location = b2.location 
    AND b1.id > b2.id
);
*/
