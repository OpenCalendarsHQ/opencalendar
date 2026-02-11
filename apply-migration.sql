-- Migration to fix Google OAuth email constraint issue
-- This migration makes the email field nullable and adds a partial unique index

-- Step 1: Update any existing empty string emails to NULL
UPDATE "user" SET "email" = NULL WHERE "email" = '';

-- Step 2: Drop the old unique constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_email_unique";

-- Step 3: Make the email column nullable
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;

-- Step 4: Create a partial unique index (only enforces uniqueness for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique_idx" ON "user" ("email") WHERE "email" IS NOT NULL;
