/*
  Warnings:

  - The values [NEW,REVIEW] on the enum `SrsState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SrsState_new" AS ENUM ('LEARNING', 'MASTERED');
ALTER TABLE "public"."academy_set_cards" ALTER COLUMN "srs_state" DROP DEFAULT;
ALTER TABLE "academy_set_cards" ALTER COLUMN "srs_state" TYPE "SrsState_new" USING ("srs_state"::text::"SrsState_new");
ALTER TYPE "SrsState" RENAME TO "SrsState_old";
ALTER TYPE "SrsState_new" RENAME TO "SrsState";
DROP TYPE "public"."SrsState_old";
ALTER TABLE "academy_set_cards" ALTER COLUMN "srs_state" SET DEFAULT 'LEARNING';
COMMIT;

-- AlterTable
ALTER TABLE "academy_set_cards" ALTER COLUMN "srs_state" SET DEFAULT 'LEARNING';
