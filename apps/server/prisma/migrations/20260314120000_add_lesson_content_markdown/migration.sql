-- Add markdown content for academy lessons (admin rich-text editor)
ALTER TABLE "academy_lessons"
ADD COLUMN "content" TEXT;

