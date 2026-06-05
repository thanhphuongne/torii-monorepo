/*
  Warnings:

  - You are about to drop the column `description` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `seo_description` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `seo_title` on the `blogs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "academy_class_schedules" ADD COLUMN     "room_id" VARCHAR(64);

-- AlterTable
ALTER TABLE "blogs" DROP COLUMN "description",
DROP COLUMN "seo_description",
DROP COLUMN "seo_title",
ADD COLUMN     "excerpt" TEXT;
