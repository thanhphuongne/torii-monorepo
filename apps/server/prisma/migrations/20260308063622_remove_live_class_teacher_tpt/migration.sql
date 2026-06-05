/*
  Warnings:

  - You are about to drop the `academy_live_class_teachers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "academy_live_class_teachers" DROP CONSTRAINT "academy_live_class_teachers_live_class_id_fkey";

-- DropTable
DROP TABLE "academy_live_class_teachers";

-- DropEnum
DROP TYPE "LiveClassTeacherRole";
