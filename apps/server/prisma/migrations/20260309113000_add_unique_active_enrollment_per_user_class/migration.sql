-- Enforce at most one ACTIVE enrollment per (class, user).
-- This protects checkout/webhook concurrent fulfillment from duplicating ACTIVE enrollments.
CREATE UNIQUE INDEX IF NOT EXISTS academy_enrollments_active_class_user_uniq
ON "academy_enrollments" ("class_id", "user_id")
WHERE "status" = 'ACTIVE';
