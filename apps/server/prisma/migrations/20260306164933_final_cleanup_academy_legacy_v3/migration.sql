/*
  Warnings:

  - You are about to drop the column `correct_count` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `generation_method` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `incorrect_count` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `interval_days` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `last_review_date` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `next_review_date` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `review_count` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the column `times_studied` on the `flashcards` table. All the data in the column will be lost.
  - You are about to drop the `achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `balance_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcard_review_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcard_reviews` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcard_user_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `note_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notebooks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_artifacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_files` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_balances` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `ease_factor` on table `flashcards` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SrsState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'MASTERED');

-- DropForeignKey
ALTER TABLE "balance_transactions" DROP CONSTRAINT "balance_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_review_sessions" DROP CONSTRAINT "flashcard_review_sessions_deck_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_review_sessions" DROP CONSTRAINT "flashcard_review_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_deck_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_flashcard_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_session_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_reviews" DROP CONSTRAINT "flashcard_reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_user_progress" DROP CONSTRAINT "flashcard_user_progress_flashcard_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcard_user_progress" DROP CONSTRAINT "flashcard_user_progress_user_id_fkey";

-- DropForeignKey
ALTER TABLE "note_entries" DROP CONSTRAINT "note_entries_notebook_id_fkey";

-- DropForeignKey
ALTER TABLE "notebooks" DROP CONSTRAINT "notebooks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "room_artifacts" DROP CONSTRAINT "room_artifacts_room_table_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_id_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_balances" DROP CONSTRAINT "user_balances_user_id_fkey";

-- AlterTable
ALTER TABLE "flashcards" DROP COLUMN "correct_count",
DROP COLUMN "generation_method",
DROP COLUMN "incorrect_count",
DROP COLUMN "interval_days",
DROP COLUMN "last_review_date",
DROP COLUMN "next_review_date",
DROP COLUMN "review_count",
DROP COLUMN "times_studied",
ADD COLUMN     "interval" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_review_at" TIMESTAMP(3),
ADD COLUMN     "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "srs_state" "SrsState" NOT NULL DEFAULT 'NEW',
ALTER COLUMN "ease_factor" SET NOT NULL,
ALTER COLUMN "ease_factor" SET DEFAULT 2.5;

-- DropTable
DROP TABLE "achievements";

-- DropTable
DROP TABLE "balance_transactions";

-- DropTable
DROP TABLE "flashcard_review_sessions";

-- DropTable
DROP TABLE "flashcard_reviews";

-- DropTable
DROP TABLE "flashcard_user_progress";

-- DropTable
DROP TABLE "note_entries";

-- DropTable
DROP TABLE "notebooks";

-- DropTable
DROP TABLE "room_artifacts";

-- DropTable
DROP TABLE "room_files";

-- DropTable
DROP TABLE "room_info";

-- DropTable
DROP TABLE "user_achievements";

-- DropTable
DROP TABLE "user_balances";

-- DropEnum
DROP TYPE "AchievementCategory";

-- DropEnum
DROP TYPE "BalanceTransactionType";

-- DropEnum
DROP TYPE "FlashcardGenerationMethod";

-- DropEnum
DROP TYPE "FlashcardState";

-- DropEnum
DROP TYPE "JapanesePartOfSpeech";

-- DropEnum
DROP TYPE "ReviewQuality";
