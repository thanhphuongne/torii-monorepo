/*
  Warnings:

  - The values [PENDING_APPROVAL,ENROLLING,IN_PROGRESS,CANCELLED] on the enum `ClassStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [HIDDEN] on the enum `OfferingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assignment_template_id` on the `academy_assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `class_assessment_id` on the `academy_assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `class_id` on the `academy_assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `academy_assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `live_schedule_id` on the `academy_class_attendances` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `academy_class_reviews` table. All the data in the column will be lost.
  - You are about to drop the column `course_edition_id` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `academy_course_offerings` table. All the data in the column will be lost.
  - You are about to drop the column `original_price` on the `academy_course_offerings` table. All the data in the column will be lost.
  - You are about to drop the column `valid_from` on the `academy_course_offerings` table. All the data in the column will be lost.
  - You are about to drop the column `valid_to` on the `academy_course_offerings` table. All the data in the column will be lost.
  - You are about to drop the column `default_language` on the `academy_course_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `academy_course_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `short_title` on the `academy_course_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `academy_course_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `academy_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `academy_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `source_offering_id` on the `academy_enrollments` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `content_body` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `content_type` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `content_url` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `course_profile_id` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `academy_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `live_class_id` on the `academy_live_schedules` table. All the data in the column will be lost.
  - You are about to drop the `academy_assignment_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_chapter_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_chapters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_class_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_course_editions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exam_attempt_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exam_attempt_section_states` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exam_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exam_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exam_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_exams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_learning_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_live_classes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_pool_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_question_pools` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_quiz_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `academy_vod_classes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,class_assignment_id]` on the table `academy_assignment_submissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[session_id,user_id]` on the table `academy_class_attendances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,offering_id]` on the table `academy_enrollments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[module_id,order_index]` on the table `academy_lessons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `class_assignment_id` to the `academy_assignment_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session_id` to the `academy_class_attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mode` to the `academy_course_offerings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `academy_course_offerings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `module_id` to the `academy_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_index` to the `academy_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `academy_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `class_id` to the `academy_live_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LiveScheduleRequestType" AS ENUM ('LEAVE', 'RESCHEDULE');

-- CreateEnum
CREATE TYPE "LiveScheduleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SyllabusStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'READING');

-- AlterEnum
BEGIN;
CREATE TYPE "ClassStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'OPENING', 'ONGOING', 'COMPLETED', 'ARCHIVED');
ALTER TABLE "public"."academy_classes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "academy_classes" ALTER COLUMN "status" TYPE "ClassStatus_new" USING ("status"::text::"ClassStatus_new");
ALTER TYPE "ClassStatus" RENAME TO "ClassStatus_old";
ALTER TYPE "ClassStatus_new" RENAME TO "ClassStatus";
DROP TYPE "public"."ClassStatus_old";
ALTER TABLE "academy_classes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OfferingStatus_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'OPENING', 'ARCHIVED');
ALTER TABLE "public"."academy_course_offerings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "academy_course_offerings" ALTER COLUMN "status" TYPE "OfferingStatus_new" USING ("status"::text::"OfferingStatus_new");
ALTER TYPE "OfferingStatus" RENAME TO "OfferingStatus_old";
ALTER TYPE "OfferingStatus_new" RENAME TO "OfferingStatus";
DROP TYPE "public"."OfferingStatus_old";
ALTER TABLE "academy_course_offerings" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "academy_assignment_submissions" DROP CONSTRAINT "academy_assignment_submissions_assignment_template_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_assignment_submissions" DROP CONSTRAINT "academy_assignment_submissions_class_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_assignment_submissions" DROP CONSTRAINT "academy_assignment_submissions_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_assignment_templates" DROP CONSTRAINT "academy_assignment_templates_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_chapter_items" DROP CONSTRAINT "academy_chapter_items_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_chapters" DROP CONSTRAINT "academy_chapters_course_edition_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_class_assessments" DROP CONSTRAINT "academy_class_assessments_assignment_template_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_class_assessments" DROP CONSTRAINT "academy_class_assessments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_class_assessments" DROP CONSTRAINT "academy_class_assessments_quiz_template_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_class_attendances" DROP CONSTRAINT "academy_class_attendances_live_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_classes" DROP CONSTRAINT "academy_classes_course_edition_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_course_editions" DROP CONSTRAINT "academy_course_editions_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_enrollments" DROP CONSTRAINT "academy_enrollments_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempt_details" DROP CONSTRAINT "academy_exam_attempt_details_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempt_details" DROP CONSTRAINT "academy_exam_attempt_details_exam_question_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempt_details" DROP CONSTRAINT "academy_exam_attempt_details_question_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempt_section_states" DROP CONSTRAINT "academy_exam_attempt_section_states_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempt_section_states" DROP CONSTRAINT "academy_exam_attempt_section_states_section_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT "academy_exam_attempts_class_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT "academy_exam_attempts_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT "academy_exam_attempts_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_attempts" DROP CONSTRAINT "academy_exam_attempts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_questions" DROP CONSTRAINT "academy_exam_questions_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_questions" DROP CONSTRAINT "academy_exam_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_questions" DROP CONSTRAINT "academy_exam_questions_section_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exam_sections" DROP CONSTRAINT "academy_exam_sections_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_exams" DROP CONSTRAINT "academy_exams_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_learning_progress" DROP CONSTRAINT "academy_learning_progress_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_learning_progress" DROP CONSTRAINT "academy_learning_progress_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_learning_progress" DROP CONSTRAINT "academy_learning_progress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_lessons" DROP CONSTRAINT "academy_lessons_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_live_classes" DROP CONSTRAINT "academy_live_classes_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_live_classes" DROP CONSTRAINT "academy_live_classes_primary_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_live_schedules" DROP CONSTRAINT "academy_live_schedules_live_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_pool_questions" DROP CONSTRAINT "academy_pool_questions_pool_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_pool_questions" DROP CONSTRAINT "academy_pool_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_question_pools" DROP CONSTRAINT "academy_question_pools_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_questions" DROP CONSTRAINT "academy_questions_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_quiz_templates" DROP CONSTRAINT "academy_quiz_templates_course_profile_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_quiz_templates" DROP CONSTRAINT "academy_quiz_templates_question_pool_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_vod_classes" DROP CONSTRAINT "academy_vod_classes_class_id_fkey";

-- DropIndex
DROP INDEX "academy_assignment_submissions_assignment_template_id_idx";

-- DropIndex
DROP INDEX "academy_assignment_submissions_class_assessment_id_idx";

-- DropIndex
DROP INDEX "academy_assignment_submissions_class_id_idx";

-- DropIndex
DROP INDEX "academy_class_attendances_live_schedule_id_idx";

-- DropIndex
DROP INDEX "academy_class_attendances_live_schedule_id_user_id_key";

-- DropIndex
DROP INDEX "academy_classes_course_edition_id_idx";

-- DropIndex
DROP INDEX "academy_course_profiles_subject_idx";

-- DropIndex
DROP INDEX "academy_enrollments_company_id_idx";

-- DropIndex
DROP INDEX "academy_enrollments_status_idx";

-- DropIndex
DROP INDEX "academy_lessons_course_profile_id_idx";

-- DropIndex
DROP INDEX "academy_live_schedules_live_class_id_idx";

-- AlterTable
ALTER TABLE "academy_assignment_submissions" DROP COLUMN "assignment_template_id",
DROP COLUMN "class_assessment_id",
DROP COLUMN "class_id",
DROP COLUMN "score",
ADD COLUMN     "class_assignment_id" UUID NOT NULL,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "file_urls" TEXT[],
ADD COLUMN     "grade" DECIMAL(5,2),
ALTER COLUMN "status" SET DEFAULT 'SUBMITTED',
ALTER COLUMN "submitted_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "content" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "academy_class_attendances" DROP COLUMN "live_schedule_id",
ADD COLUMN     "session_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "academy_class_reviews" DROP COLUMN "metadata";

-- AlterTable
ALTER TABLE "academy_classes" DROP COLUMN "course_edition_id",
DROP COLUMN "settings",
ADD COLUMN     "instructor_id" UUID,
ADD COLUMN     "syllabus_id" UUID;

-- AlterTable
ALTER TABLE "academy_coupons" ADD COLUMN     "owner_id" UUID,
ADD COLUMN     "source" VARCHAR(50);

-- AlterTable
ALTER TABLE "academy_course_offerings" DROP COLUMN "metadata",
DROP COLUMN "original_price",
DROP COLUMN "valid_from",
DROP COLUMN "valid_to",
ADD COLUMN     "mode" "ClassMode" NOT NULL,
ADD COLUMN     "price" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "sale_price" DECIMAL(12,2),
ADD COLUMN     "syllabus_id" UUID;

-- AlterTable
ALTER TABLE "academy_course_profiles" DROP COLUMN "default_language",
DROP COLUMN "metadata",
DROP COLUMN "short_title",
DROP COLUMN "subject";

-- AlterTable
ALTER TABLE "academy_enrollments" DROP COLUMN "company_id",
DROP COLUMN "metadata",
DROP COLUMN "source_offering_id",
ADD COLUMN     "offering_id" UUID,
ALTER COLUMN "class_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "academy_lessons" DROP COLUMN "attachments",
DROP COLUMN "content_body",
DROP COLUMN "content_type",
DROP COLUMN "content_url",
DROP COLUMN "course_profile_id",
DROP COLUMN "metadata",
ADD COLUMN     "module_id" UUID NOT NULL,
ADD COLUMN     "order_index" INTEGER NOT NULL,
ADD COLUMN     "type" "LessonType" NOT NULL,
ADD COLUMN     "video_url" TEXT;

-- AlterTable
ALTER TABLE "academy_live_schedules" DROP COLUMN "live_class_id",
ADD COLUMN     "class_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "daily_activities" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "room_info" ADD COLUMN     "class_id" UUID,
ADD COLUMN     "live_class_id" UUID,
ADD COLUMN     "start_time" VARCHAR(20),
ADD COLUMN     "weekday" INTEGER;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "order_id" UUID;

-- DropTable
DROP TABLE "academy_assignment_templates";

-- DropTable
DROP TABLE "academy_chapter_items";

-- DropTable
DROP TABLE "academy_chapters";

-- DropTable
DROP TABLE "academy_class_assessments";

-- DropTable
DROP TABLE "academy_course_editions";

-- DropTable
DROP TABLE "academy_exam_attempt_details";

-- DropTable
DROP TABLE "academy_exam_attempt_section_states";

-- DropTable
DROP TABLE "academy_exam_attempts";

-- DropTable
DROP TABLE "academy_exam_questions";

-- DropTable
DROP TABLE "academy_exam_sections";

-- DropTable
DROP TABLE "academy_exams";

-- DropTable
DROP TABLE "academy_learning_progress";

-- DropTable
DROP TABLE "academy_live_classes";

-- DropTable
DROP TABLE "academy_pool_questions";

-- DropTable
DROP TABLE "academy_question_pools";

-- DropTable
DROP TABLE "academy_questions";

-- DropTable
DROP TABLE "academy_quiz_templates";

-- DropTable
DROP TABLE "academy_vod_classes";

-- CreateTable
CREATE TABLE "academy_syllabuses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "version_label" VARCHAR(50) NOT NULL,
    "status" "SyllabusStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_syllabuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "syllabus_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "instructions" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_class_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "title_override" VARCHAR(255),
    "open_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_user_lesson_progress" (
    "user_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "last_watched_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_user_lesson_progress_pkey" PRIMARY KEY ("user_id","class_id","lesson_id")
);

-- CreateTable
CREATE TABLE "academy_live_schedule_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "schedule_id" UUID,
    "session_date" TIMESTAMP(3) NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "cancellation_reason" TEXT,
    "room_id" VARCHAR(64),
    "location" VARCHAR(255),
    "note" TEXT,
    "instructor_id" UUID,
    "superseded_by_session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "academy_live_schedule_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_live_schedule_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "class_id" UUID,
    "requested_by" UUID NOT NULL,
    "type" "LiveScheduleRequestType" NOT NULL,
    "status" "LiveScheduleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requested_date" TIMESTAMP(3),
    "original_weekday" INTEGER NOT NULL,
    "original_start_time" VARCHAR(20) NOT NULL,
    "original_end_time" VARCHAR(20) NOT NULL,
    "proposed_date" TIMESTAMP(3),
    "proposed_start_time" VARCHAR(20),
    "proposed_end_time" VARCHAR(20),
    "proposed_teacher_id" UUID,
    "review_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_live_schedule_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academy_syllabuses_course_profile_id_idx" ON "academy_syllabuses"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_modules_syllabus_id_idx" ON "academy_modules"("syllabus_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_modules_syllabus_id_order_index_key" ON "academy_modules"("syllabus_id", "order_index");

-- CreateIndex
CREATE INDEX "academy_class_assignments_class_id_idx" ON "academy_class_assignments"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_class_assignments_class_id_assignment_id_key" ON "academy_class_assignments"("class_id", "assignment_id");

-- CreateIndex
CREATE INDEX "academy_user_lesson_progress_class_id_idx" ON "academy_user_lesson_progress"("class_id");

-- CreateIndex
CREATE INDEX "academy_user_lesson_progress_user_id_idx" ON "academy_user_lesson_progress"("user_id");

-- CreateIndex
CREATE INDEX "academy_live_schedule_sessions_class_id_session_date_idx" ON "academy_live_schedule_sessions"("class_id", "session_date");

-- CreateIndex
CREATE INDEX "academy_live_schedule_sessions_schedule_id_idx" ON "academy_live_schedule_sessions"("schedule_id");

-- CreateIndex
CREATE INDEX "academy_live_schedule_sessions_status_idx" ON "academy_live_schedule_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "academy_live_schedule_sessions_class_id_session_date_start__key" ON "academy_live_schedule_sessions"("class_id", "session_date", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "academy_live_schedule_requests_session_id_idx" ON "academy_live_schedule_requests"("session_id");

-- CreateIndex
CREATE INDEX "academy_live_schedule_requests_requested_by_idx" ON "academy_live_schedule_requests"("requested_by");

-- CreateIndex
CREATE INDEX "academy_live_schedule_requests_status_idx" ON "academy_live_schedule_requests"("status");

-- CreateIndex
CREATE INDEX "academy_live_schedule_requests_requested_date_idx" ON "academy_live_schedule_requests"("requested_date");

-- CreateIndex
CREATE INDEX "academy_assignment_submissions_class_assignment_id_idx" ON "academy_assignment_submissions"("class_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_assignment_submissions_user_id_class_assignment_id_key" ON "academy_assignment_submissions"("user_id", "class_assignment_id");

-- CreateIndex
CREATE INDEX "academy_class_attendances_session_id_idx" ON "academy_class_attendances"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_class_attendances_session_id_user_id_key" ON "academy_class_attendances"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "academy_classes_syllabus_id_idx" ON "academy_classes"("syllabus_id");

-- CreateIndex
CREATE INDEX "academy_enrollments_offering_id_idx" ON "academy_enrollments"("offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_enrollments_user_id_offering_id_key" ON "academy_enrollments"("user_id", "offering_id");

-- CreateIndex
CREATE INDEX "academy_lessons_module_id_idx" ON "academy_lessons"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_lessons_module_id_order_index_key" ON "academy_lessons"("module_id", "order_index");

-- CreateIndex
CREATE INDEX "academy_live_schedules_class_id_idx" ON "academy_live_schedules"("class_id");

-- CreateIndex
CREATE INDEX "room_info_live_class_id_idx" ON "room_info"("live_class_id");

-- CreateIndex
CREATE INDEX "room_info_class_id_idx" ON "room_info"("class_id");

-- CreateIndex
CREATE INDEX "tickets_order_id_idx" ON "tickets"("order_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "academy_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_syllabuses" ADD CONSTRAINT "academy_syllabuses_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_modules" ADD CONSTRAINT "academy_modules_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "academy_syllabuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "academy_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_classes" ADD CONSTRAINT "academy_classes_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "academy_syllabuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_classes" ADD CONSTRAINT "academy_classes_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_assignments" ADD CONSTRAINT "academy_class_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_assignments" ADD CONSTRAINT "academy_class_assignments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "academy_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_user_lesson_progress" ADD CONSTRAINT "academy_user_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_user_lesson_progress" ADD CONSTRAINT "academy_user_lesson_progress_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_user_lesson_progress" ADD CONSTRAINT "academy_user_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_submissions" ADD CONSTRAINT "academy_assignment_submissions_class_assignment_id_fkey" FOREIGN KEY ("class_assignment_id") REFERENCES "academy_class_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedules" ADD CONSTRAINT "academy_live_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_sessions" ADD CONSTRAINT "academy_live_schedule_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_sessions" ADD CONSTRAINT "academy_live_schedule_sessions_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "academy_live_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_sessions" ADD CONSTRAINT "academy_live_schedule_sessions_superseded_by_session_id_fkey" FOREIGN KEY ("superseded_by_session_id") REFERENCES "academy_live_schedule_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_requests" ADD CONSTRAINT "academy_live_schedule_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "academy_live_schedule_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_requests" ADD CONSTRAINT "academy_live_schedule_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_requests" ADD CONSTRAINT "academy_live_schedule_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedule_requests" ADD CONSTRAINT "academy_live_schedule_requests_proposed_teacher_id_fkey" FOREIGN KEY ("proposed_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_course_offerings" ADD CONSTRAINT "academy_course_offerings_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "academy_syllabuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "academy_course_offerings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_attendances" ADD CONSTRAINT "academy_class_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "academy_live_schedule_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
