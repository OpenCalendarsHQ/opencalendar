-- Step 1: Remove duplicate events caused by race condition during parallel iCloud sync.
-- Keep the oldest record (earliest created_at) for each (calendar_id, ics_uid) pair.
DELETE FROM events
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY calendar_id, ics_uid ORDER BY created_at ASC) AS rn
    FROM events
    WHERE ics_uid IS NOT NULL
  ) ranked
  WHERE rn > 1
);

--> statement-breakpoint

-- Step 2: Add a partial unique index to prevent future duplicates.
-- Partial (WHERE ics_uid IS NOT NULL) so NULL ics_uids don't conflict.
CREATE UNIQUE INDEX "events_calendar_ics_uid_unique" ON "events"("calendar_id", "ics_uid") WHERE "ics_uid" IS NOT NULL;
