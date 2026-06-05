/*
  Warnings:

  - The values [ACTIVE] on the enum `OfferingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `batch` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `enrollment_close_at` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `enrollment_open_at` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `max_students` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `min_students` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `primary_teacher_id` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `academy_classes` table. All the data in the column will be lost.
  - You are about to drop the column `term` on the `academy_classes` table. All the data in the column will be lost.
  - The `status` column on the `academy_classes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `academy_class_schedules` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `mode` on the `academy_classes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ClassMode" AS ENUM ('VOD', 'LIVE');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ENROLLING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MinStudentsEnforcement" AS ENUM ('STRICT', 'NOTIFY', 'DISABLED');

-- CreateEnum
CREATE TYPE "LiveClassTeacherRole" AS ENUM ('PRIMARY', 'ASSISTANT');

-- AlterEnum
BEGIN;
CREATE TYPE "OfferingStatus_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');
ALTER TABLE "public"."academy_course_offerings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "academy_course_offerings" ALTER COLUMN "status" TYPE "OfferingStatus_new" USING ("status"::text::"OfferingStatus_new");
ALTER TYPE "OfferingStatus" RENAME TO "OfferingStatus_old";
ALTER TYPE "OfferingStatus_new" RENAME TO "OfferingStatus";
DROP TYPE "public"."OfferingStatus_old";
ALTER TABLE "academy_course_offerings" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "academy_class_schedules" DROP CONSTRAINT "academy_class_schedules_class_id_fkey";

-- DropForeignKey
ALTER TABLE "academy_classes" DROP CONSTRAINT "academy_classes_primary_teacher_id_fkey";

-- DropIndex
DROP INDEX "academy_classes_company_id_idx";

-- AlterTable
ALTER TABLE "academy_classes" DROP COLUMN "batch",
DROP COLUMN "company_id",
DROP COLUMN "end_date",
DROP COLUMN "enrollment_close_at",
DROP COLUMN "enrollment_open_at",
DROP COLUMN "max_students",
DROP COLUMN "min_students",
DROP COLUMN "primary_teacher_id",
DROP COLUMN "start_date",
DROP COLUMN "term",
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" UUID,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "submitted_by" UUID,
ADD COLUMN     "submitted_for_approval_at" TIMESTAMP(3),
DROP COLUMN "mode",
ADD COLUMN     "mode" "ClassMode" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ClassStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "academy_course_editions" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" UUID,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "submitted_by" UUID,
ADD COLUMN     "submitted_for_approval_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "academy_course_offerings" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" UUID,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" UUID,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "submitted_by" UUID,
ADD COLUMN     "submitted_for_approval_at" TIMESTAMP(3);

-- DropTable
DROP TABLE "academy_class_schedules";

-- CreateTable
CREATE TABLE "academy_vod_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "enrollment_open_at" TIMESTAMP(3),
    "enrollment_close_at" TIMESTAMP(3),
    "max_students" INTEGER,
    "default_expires_months" INTEGER,

    CONSTRAINT "academy_vod_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_live_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "term" VARCHAR(100),
    "batch" VARCHAR(100),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "enrollment_open_at" TIMESTAMP(3) NOT NULL,
    "enrollment_close_at" TIMESTAMP(3) NOT NULL,
    "min_students" INTEGER NOT NULL,
    "max_students" INTEGER NOT NULL,
    "min_students_enforcement" "MinStudentsEnforcement",
    "primary_teacher_id" UUID,

    CONSTRAINT "academy_live_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_live_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "live_class_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20) NOT NULL,
    "location" VARCHAR(255),
    "excluded_dates" JSONB,
    "note" TEXT,
    "room_id" VARCHAR(64),

    CONSTRAINT "academy_live_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_live_class_teachers" (
    "live_class_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "role" "LiveClassTeacherRole" NOT NULL DEFAULT 'PRIMARY',

    CONSTRAINT "academy_live_class_teachers_pkey" PRIMARY KEY ("live_class_id","teacher_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_vod_classes_class_id_key" ON "academy_vod_classes"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_live_classes_class_id_key" ON "academy_live_classes"("class_id");

-- CreateIndex
CREATE INDEX "academy_live_schedules_live_class_id_idx" ON "academy_live_schedules"("live_class_id");

-- CreateIndex
CREATE INDEX "academy_classes_mode_idx" ON "academy_classes"("mode");

-- CreateIndex
CREATE INDEX "academy_classes_status_idx" ON "academy_classes"("status");

-- AddForeignKey
ALTER TABLE "academy_vod_classes" ADD CONSTRAINT "academy_vod_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_classes" ADD CONSTRAINT "academy_live_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_classes" ADD CONSTRAINT "academy_live_classes_primary_teacher_id_fkey" FOREIGN KEY ("primary_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_schedules" ADD CONSTRAINT "academy_live_schedules_live_class_id_fkey" FOREIGN KEY ("live_class_id") REFERENCES "academy_live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_live_class_teachers" ADD CONSTRAINT "academy_live_class_teachers_live_class_id_fkey" FOREIGN KEY ("live_class_id") REFERENCES "academy_live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
