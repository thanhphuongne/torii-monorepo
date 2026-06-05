-- Drop legacy learning roadmap tables (unused in current product flow)
-- Notes:
-- - We keep `OnboardingSurvey` and AI-generated study-path (analytics) as the current approach.
-- - These tables were introduced but never wired into runtime code.

DROP TABLE IF EXISTS "learning_roadmap_replans" CASCADE;
DROP TABLE IF EXISTS "learning_roadmap_tasks" CASCADE;
DROP TABLE IF EXISTS "learning_roadmaps" CASCADE;

