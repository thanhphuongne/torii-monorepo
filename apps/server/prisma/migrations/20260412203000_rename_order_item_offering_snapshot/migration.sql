-- Rename column to match current domain language (no legacy offering_* name).
ALTER TABLE "academy_order_items" RENAME COLUMN "offering_snapshot" TO "delivery_snapshot";
