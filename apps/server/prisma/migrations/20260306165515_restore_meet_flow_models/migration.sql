-- CreateTable
CREATE TABLE "room_info" (
    "id" SERIAL NOT NULL,
    "room_title" VARCHAR(255) NOT NULL DEFAULT '',
    "room_id" VARCHAR(64) NOT NULL,
    "sid" VARCHAR(64) NOT NULL,
    "joined_participants" INTEGER NOT NULL DEFAULT 0,
    "is_running" INTEGER NOT NULL DEFAULT 0,
    "is_recording" INTEGER NOT NULL DEFAULT 0,
    "recorder_id" VARCHAR(36) NOT NULL DEFAULT '',
    "is_active_rtmp" INTEGER NOT NULL DEFAULT 0,
    "rtmp_node_id" VARCHAR(36) NOT NULL DEFAULT '',
    "webhook_url" VARCHAR(255) NOT NULL DEFAULT '',
    "is_breakout_room" INTEGER NOT NULL DEFAULT 0,
    "parent_room_id" VARCHAR(64) NOT NULL DEFAULT '',
    "creation_time" INTEGER NOT NULL DEFAULT 0,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended" TIMESTAMP(3),
    "modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_files" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_artifacts" (
    "id" BIGSERIAL NOT NULL,
    "artifact_id" VARCHAR(64) NOT NULL,
    "room_table_id" INTEGER NOT NULL,
    "room_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_info_sid_key" ON "room_info"("sid");

-- CreateIndex
CREATE INDEX "idx_room_id" ON "room_info"("room_id", "is_running");

-- CreateIndex
CREATE UNIQUE INDEX "room_files_file_id_key" ON "room_files"("file_id");

-- CreateIndex
CREATE INDEX "room_files_room_id_idx" ON "room_files"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_artifacts_artifact_id_key" ON "room_artifacts"("artifact_id");

-- CreateIndex
CREATE INDEX "idx_artifact_artifact_id" ON "room_artifacts"("artifact_id");

-- CreateIndex
CREATE INDEX "idx_artifact_room_id" ON "room_artifacts"("room_id");

-- CreateIndex
CREATE INDEX "idx_artifact_type" ON "room_artifacts"("type");

-- AddForeignKey
ALTER TABLE "room_artifacts" ADD CONSTRAINT "room_artifacts_room_table_id_fkey" FOREIGN KEY ("room_table_id") REFERENCES "room_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
