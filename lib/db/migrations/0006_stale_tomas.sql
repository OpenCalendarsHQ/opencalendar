ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_idx" ON "user" ("email") WHERE "email" IS NOT NULL;