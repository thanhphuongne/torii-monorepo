/*
  Warnings:

  - You are about to drop the column `comment_count` on the `blogs` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `flashcard_decks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "academy_coupons" ADD COLUMN     "name" VARCHAR(200);

-- AlterTable
ALTER TABLE "blogs" DROP COLUMN "comment_count";

-- AlterTable
ALTER TABLE "flashcard_decks" DROP COLUMN "subject";
