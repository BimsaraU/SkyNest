-- Drop existing types and tables to ensure a clean slate.
-- Using CASCADE will drop any objects that depend on them.
DROP TABLE IF EXISTS "serviceusage" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "bookings" CASCADE;
DROP TABLE IF EXISTS "roomavailability" CASCADE;
DROP TABLE IF EXISTS "rooms" CASCADE;
DROP TABLE IF EXISTS "roomtypes" CASCADE;
DROP TABLE IF EXISTS "servicecatalog" CASCADE;
DROP TABLE IF EXISTS "guests" CASCADE;
DROP TABLE IF EXISTS "admins" CASCADE;
DROP TABLE IF EXISTS "hotelbranches" CASCADE;

DROP TYPE IF EXISTS "booking_status_enum" CASCADE;
DROP TYPE IF EXISTS "payment_method_enum" CASCADE;
DROP TYPE IF EXISTS "room_status_enum" CASCADE;
DROP TYPE IF EXISTS "access_level_enum" CASCADE;
DROP TYPE IF EXISTS "availability_status_enum" CASCADE;


-- Create custom ENUM types for specific columns to ensure data integrity.
CREATE TYPE "access_level_enum" AS ENUM ('SuperAdmin', 'Admin', 'Manager', 'Staff');
CREATE TYPE "room_status_enum" AS ENUM ('Available', 'Occupied', 'Under Maintenance', 'Cleaning');
CREATE TYPE "availability_status_enum" AS ENUM ('Available', 'Booked', 'Blocked');
CREATE TYPE "booking_status_enum" AS ENUM ('Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow');
CREATE TYPE "payment_method_enum" AS ENUM ('Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Online');


-- Table Definitions

-- hotelbranches: Stores information about each hotel branch.
CREATE TABLE "hotelbranches" (
  "branch_id" SERIAL PRIMARY KEY,
  "branch_name" VARCHAR(100) NOT NULL,
  "location" VARCHAR(100),
  "address" TEXT,
  "phone" VARCHAR(20),
  "email" VARCHAR(100) UNIQUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- admins: Stores user accounts for hotel staff and administrators.
CREATE TABLE "admins" (
  "admin_id" SERIAL PRIMARY KEY,
  "branch_id" INT,
  "first_name" VARCHAR(50) NOT NULL,
  "last_name" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "phone" VARCHAR(20),
  "address" TEXT,
  "date_of_birth" DATE,
  "id_number" VARCHAR(50),
  "access_level" access_level_enum NOT NULL DEFAULT 'Staff',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("branch_id") REFERENCES "hotelbranches" ("branch_id") ON DELETE SET NULL
);

-- guests: Stores information about hotel guests.
CREATE TABLE "guests" (
  "guest_id" SERIAL PRIMARY KEY,
  "first_name" VARCHAR(50) NOT NULL,
  "last_name" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "phone" VARCHAR(20),
  "address" TEXT,
  "date_of_birth" DATE,
  "id_number" VARCHAR(50),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- roomtypes: Defines different types of rooms available (e.g., Single, Double, Suite).
CREATE TABLE "roomtypes" (
  "room_type_id" SERIAL PRIMARY KEY,
  "type_name" VARCHAR(50) NOT NULL,
  "capacity" INT NOT NULL,
  "daily_rate" DECIMAL(10, 2) NOT NULL,
  "amenities" TEXT,
  "description" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- rooms: Represents individual rooms within a hotel branch.
CREATE TABLE "rooms" (
  "room_id" SERIAL PRIMARY KEY,
  "branch_id" INT NOT NULL,
  "room_type_id" INT NOT NULL,
  "room_number" VARCHAR(20) NOT NULL,
  "floor_number" INT,
  "status" room_status_enum NOT NULL DEFAULT 'Available',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("branch_id", "room_number"),
  FOREIGN KEY ("branch_id") REFERENCES "hotelbranches" ("branch_id") ON DELETE CASCADE,
  FOREIGN KEY ("room_type_id") REFERENCES "roomtypes" ("room_type_id") ON DELETE RESTRICT
);

-- bookings: Core table for managing all room bookings.
CREATE TABLE "bookings" (
  "booking_id" SERIAL PRIMARY KEY,
  "room_id" INT NOT NULL,
  "guest_id" INT NOT NULL,
  "check_in_date" DATE NOT NULL,
  "check_out_date" DATE NOT NULL,
  "booking_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "adults" INT NOT NULL DEFAULT 1,
  "children" INT DEFAULT 0,
  "total_nights" INT,
  "room_charges" DECIMAL(10, 2),
  "service_charges" DECIMAL(10, 2) DEFAULT 0.00,
  "tax_amount" DECIMAL(10, 2),
  "total_amount" DECIMAL(10, 2),
  "paid_amount" DECIMAL(10, 2) DEFAULT 0.00,
  "outstanding_amount" DECIMAL(10, 2),
  "payment_method" payment_method_enum,
  "status" booking_status_enum NOT NULL DEFAULT 'Pending',
  "special_requests" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id"),
  FOREIGN KEY ("guest_id") REFERENCES "guests" ("guest_id")
);

-- payments: Records all payments made for bookings.
CREATE TABLE "payments" (
  "payment_id" SERIAL PRIMARY KEY,
  "booking_id" INT NOT NULL,
  "payment_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "amount" DECIMAL(10, 2) NOT NULL,
  "payment_method" payment_method_enum NOT NULL,
  "transaction_reference" VARCHAR(100),
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE
);

-- servicecatalog: A list of additional services offered by the hotel.
CREATE TABLE "servicecatalog" (
  "service_id" SERIAL PRIMARY KEY,
  "service_name" VARCHAR(100) NOT NULL,
  "category" VARCHAR(50),
  "base_price" DECIMAL(10, 2) NOT NULL,
  "unit" VARCHAR(20),
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- serviceusage: Tracks the usage of services by guests during their stay.
CREATE TABLE "serviceusage" (
  "usage_id" SERIAL PRIMARY KEY,
  "booking_id" INT NOT NULL,
  "service_id" INT NOT NULL,
  "usage_date" DATE NOT NULL,
  "quantity" INT NOT NULL DEFAULT 1,
  "unit_price" DECIMAL(10, 2) NOT NULL,
  "total_price" DECIMAL(10, 2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE CASCADE,
  FOREIGN KEY ("service_id") REFERENCES "servicecatalog" ("service_id") ON DELETE RESTRICT
);

-- roomavailability: Tracks the availability of rooms for specific dates.
-- This can be used for quick lookups to prevent double bookings.
CREATE TABLE "roomavailability" (
  "availability_id" SERIAL PRIMARY KEY,
  "room_id" INT NOT NULL,
  "date" DATE NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE,
  "end_time" TIMESTAMP WITH TIME ZONE,
  "status" availability_status_enum NOT NULL DEFAULT 'Available',
  "booking_id" INT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("room_id", "date"),
  FOREIGN KEY ("room_id") REFERENCES "rooms" ("room_id") ON DELETE CASCADE,
  FOREIGN KEY ("booking_id") REFERENCES "bookings" ("booking_id") ON DELETE SET NULL
);

-- Add indexes for frequently queried columns to improve performance.
CREATE INDEX ON "bookings" ("guest_id");
CREATE INDEX ON "bookings" ("room_id");
CREATE INDEX ON "bookings" ("check_in_date", "check_out_date");
CREATE INDEX ON "rooms" ("branch_id");
CREATE INDEX ON "roomavailability" ("date");
