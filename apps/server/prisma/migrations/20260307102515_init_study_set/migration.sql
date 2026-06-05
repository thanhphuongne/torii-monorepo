/*
  Warnings:

  - You are about to drop the `flashcard_decks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `flashcards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "flashcard_decks" DROP CONSTRAINT "flashcard_decks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcards" DROP CONSTRAINT "flashcards_deck_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcards" DROP CONSTRAINT "flashcards_note_id_fkey";

-- DropForeignKey
ALTER TABLE "flashcards" DROP CONSTRAINT "flashcards_source_document_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_lesson_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_user_id_fkey";

-- DropTable
DROP TABLE "flashcard_decks";

-- DropTable
DROP TABLE "flashcards";

-- DropTable
DROP TABLE "notes";

-- CreateTable
CREATE TABLE "academy_study_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "lesson_id" UUID,
    "tags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_study_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_study_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB DEFAULT '{}',
    "stats" JSONB DEFAULT '{"cardCount": 0, "masteredCount": 0}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_study_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_set_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_set_id" UUID NOT NULL,
    "source_note_id" UUID,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "hint" TEXT,
    "media_url" TEXT,
    "language_details" JSONB,
    "tags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "source_document_id" UUID,
    "srs_state" "SrsState" NOT NULL DEFAULT 'NEW',
    "next_review_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_set_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academy_study_notes_user_id_idx" ON "academy_study_notes"("user_id");

-- CreateIndex
CREATE INDEX "academy_study_notes_lesson_id_idx" ON "academy_study_notes"("lesson_id");

-- CreateIndex
CREATE INDEX "academy_study_sets_user_id_idx" ON "academy_study_sets"("user_id");

-- CreateIndex
CREATE INDEX "academy_set_cards_study_set_id_idx" ON "academy_set_cards"("study_set_id");

-- CreateIndex
CREATE INDEX "academy_set_cards_source_note_id_idx" ON "academy_set_cards"("source_note_id");

-- CreateIndex
CREATE INDEX "academy_set_cards_source_document_id_idx" ON "academy_set_cards"("source_document_id");

-- CreateIndex
CREATE INDEX "academy_set_cards_srs_state_idx" ON "academy_set_cards"("srs_state");

-- AddForeignKey
ALTER TABLE "academy_study_notes" ADD CONSTRAINT "academy_study_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_study_notes" ADD CONSTRAINT "academy_study_notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "academy_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_study_sets" ADD CONSTRAINT "academy_study_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_set_cards" ADD CONSTRAINT "academy_set_cards_study_set_id_fkey" FOREIGN KEY ("study_set_id") REFERENCES "academy_study_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_set_cards" ADD CONSTRAINT "academy_set_cards_source_note_id_fkey" FOREIGN KEY ("source_note_id") REFERENCES "academy_study_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_set_cards" ADD CONSTRAINT "academy_set_cards_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
