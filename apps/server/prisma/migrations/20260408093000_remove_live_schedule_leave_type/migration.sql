-- Remove legacy LEAVE request type completely (no backward compatibility).
-- 1) Hard-delete historical LEAVE requests so DB enum can be narrowed safely.
DELETE FROM "academy_live_schedule_requests"
WHERE "type" = 'LEAVE';

-- 2) Recreate enum without LEAVE and migrate column type.
ALTER TYPE "LiveScheduleRequestType" RENAME TO "LiveScheduleRequestType_old";
CREATE TYPE "LiveScheduleRequestType" AS ENUM ('RESCHEDULE');

ALTER TABLE "academy_live_schedule_requests"
ALTER COLUMN "type"
TYPE "LiveScheduleRequestType"
USING ("type"::text::"LiveScheduleRequestType");

DROP TYPE "LiveScheduleRequestType_old";
