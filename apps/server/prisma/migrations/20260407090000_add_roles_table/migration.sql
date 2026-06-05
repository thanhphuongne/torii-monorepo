-- Create roles table to support dynamic role CRUD
CREATE TABLE IF NOT EXISTS "roles" (
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("code")
);

