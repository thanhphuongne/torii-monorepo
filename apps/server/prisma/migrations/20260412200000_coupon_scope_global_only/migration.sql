-- Bỏ SPECIFIC_OFFERING: coupon không còn giới hạn theo từng liveClass/vod trong giỏ.
UPDATE "academy_coupons" SET "scope" = 'GLOBAL' WHERE "scope" = 'SPECIFIC_OFFERING';

ALTER TYPE "CouponScope" RENAME TO "CouponScope_old";
CREATE TYPE "CouponScope" AS ENUM ('GLOBAL');
ALTER TABLE "academy_coupons" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE "academy_coupons" ALTER COLUMN "scope" TYPE "CouponScope" USING ("scope"::text::"CouponScope");
ALTER TABLE "academy_coupons" ALTER COLUMN "scope" SET DEFAULT 'GLOBAL'::"CouponScope";
DROP TYPE "CouponScope_old";
