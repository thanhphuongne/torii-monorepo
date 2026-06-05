-- Learning roadmap (production): per-user plan tied to enrollment

CREATE TABLE "learning_roadmaps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "current_week" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_roadmaps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_roadmaps_user_id_status_idx" ON "learning_roadmaps"("user_id", "status");
CREATE INDEX "learning_roadmaps_enrollment_id_idx" ON "learning_roadmaps"("enrollment_id");

ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "learning_roadmap_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roadmap_id" UUID NOT NULL,
    "week_index" INTEGER NOT NULL DEFAULT 1,
    "task_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "estimated_minutes" INTEGER NOT NULL DEFAULT 0,
    "actual_minutes" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "source_ref" VARCHAR(255),
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_roadmap_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_roadmap_tasks_roadmap_id_status_idx" ON "learning_roadmap_tasks"("roadmap_id", "status");
CREATE INDEX "learning_roadmap_tasks_roadmap_id_week_index_idx" ON "learning_roadmap_tasks"("roadmap_id", "week_index");

ALTER TABLE "learning_roadmap_tasks" ADD CONSTRAINT "learning_roadmap_tasks_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "learning_roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "learning_roadmap_replans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roadmap_id" UUID NOT NULL,
    "from_version" INTEGER NOT NULL,
    "to_version" INTEGER NOT NULL,
    "trigger_type" VARCHAR(50) NOT NULL,
    "reason_context" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_roadmap_replans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_roadmap_replans_roadmap_id_idx" ON "learning_roadmap_replans"("roadmap_id");

ALTER TABLE "learning_roadmap_replans" ADD CONSTRAINT "learning_roadmap_replans_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "learning_roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
