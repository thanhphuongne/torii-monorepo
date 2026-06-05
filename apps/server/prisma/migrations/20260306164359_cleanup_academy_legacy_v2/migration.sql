-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('TEXT', 'FILE', 'BOTH');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED');

-- CreateEnum
CREATE TYPE "FlashcardState" AS ENUM ('new', 'learning', 'review', 'relearning');

-- CreateEnum
CREATE TYPE "FlashcardGenerationMethod" AS ENUM ('manual', 'ai_auto', 'ai_assisted', 'import');

-- CreateEnum
CREATE TYPE "JapanesePartOfSpeech" AS ENUM ('noun', 'verb_ichidan', 'verb_godan', 'verb_suru', 'verb_kuru', 'adjective_i', 'adjective_na', 'adverb', 'particle', 'conjunction', 'interjection', 'pronoun', 'number', 'other');

-- CreateEnum
CREATE TYPE "ReviewQuality" AS ENUM ('ZERO', 'ONE', 'TWO', 'THREE', 'FOUR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'CANCELLED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('COURSE', 'BUNDLE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYOS', 'BANK_TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('PAYOS', 'MOMO', 'STRIPE');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('GLOBAL', 'SPECIFIC_OFFERING');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('REFUND', 'SUPPORT', 'ERROR_REPORT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'PROCESSING', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LESSON_COMPLETE', 'QUIZ_ANSWER', 'VIDEO_WATCH', 'REVIEW', 'PRACTICE', 'FLASHCARD_REVIEW', 'EXAM_COMPLETE', 'BLOG_CREATE', 'COMMENT_CREATE', 'LOGIN');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('STREAK', 'CONSISTENCY', 'LEARNING_PROGRESS', 'RECOVERY', 'SOCIAL', 'MASTERY');

-- CreateEnum
CREATE TYPE "BalanceTransactionType" AS ENUM ('TOP_UP', 'REFUND', 'PURCHASE', 'REWARD', 'BONUS', 'OTHER');

-- CreateEnum
CREATE TYPE "GamificationTransactionType" AS ENUM ('EARN', 'REDEEM', 'BONUS', 'EXPIRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "GamificationCurrency" AS ENUM ('POINT', 'XP');

-- CreateTable
CREATE TABLE "room_info" (
    "id" SERIAL NOT NULL,
    "room_title" VARCHAR(255) NOT NULL DEFAULT '',
    "room_id" VARCHAR(64) NOT NULL,
    "sid" VARCHAR(64) NOT NULL,
    "joined_participants" INTEGER NOT NULL DEFAULT 0,
    "is_running" INTEGER NOT NULL DEFAULT 0,
    "is_recording" INTEGER NOT NULL DEFAULT 0,
    "recorder_id" VARCHAR(36) NOT NULL DEFAULT '',
    "is_active_rtmp" INTEGER NOT NULL DEFAULT 0,
    "rtmp_node_id" VARCHAR(36) NOT NULL DEFAULT '',
    "webhook_url" VARCHAR(255) NOT NULL DEFAULT '',
    "is_breakout_room" INTEGER NOT NULL DEFAULT 0,
    "parent_room_id" VARCHAR(64) NOT NULL DEFAULT '',
    "creation_time" INTEGER NOT NULL DEFAULT 0,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended" TIMESTAMP(3),
    "modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_files" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_artifacts" (
    "id" BIGSERIAL NOT NULL,
    "artifact_id" VARCHAR(64) NOT NULL,
    "room_table_id" INTEGER NOT NULL,
    "room_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "lesson_id" UUID,
    "tags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_decks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "subject" VARCHAR(50),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "tags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "card_count" INTEGER NOT NULL DEFAULT 0,
    "studied_count" INTEGER NOT NULL DEFAULT 0,
    "srs_settings" JSONB DEFAULT '{"newCardsPerDay":20,"maxReviewsPerDay":200,"easyBonus":1.3,"intervalModifier":1.0,"maximumInterval":36500}',
    "ai_settings" JSONB DEFAULT '{"autoGenerate":false,"requireApproval":true,"minConfidence":0.8,"filters":[]}',
    "source_type" VARCHAR(20) DEFAULT 'manual',
    "last_studied_at" TIMESTAMP(3),
    "total_study_time" INTEGER NOT NULL DEFAULT 0,
    "mastery_percentage" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deck_id" UUID NOT NULL,
    "note_id" UUID,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "hint" TEXT,
    "image_url" TEXT,
    "audio_url" TEXT,
    "tags" VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR(50)[],
    "language_details" JSONB,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "source_document_id" UUID,
    "generation_method" "FlashcardGenerationMethod" NOT NULL DEFAULT 'manual',
    "generation_metadata" JSONB DEFAULT '{}',
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "next_review_date" TIMESTAMP(3),
    "last_review_date" TIMESTAMP(3),
    "ease_factor" DECIMAL(4,2),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "times_studied" INTEGER NOT NULL DEFAULT 0,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_user_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "flashcard_id" UUID NOT NULL,
    "state" "FlashcardState" NOT NULL DEFAULT 'new',
    "current_interval" INTEGER NOT NULL DEFAULT 0,
    "ease_factor" DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_date" DATE,
    "times_reviewed" INTEGER NOT NULL DEFAULT 0,
    "times_correct" INTEGER NOT NULL DEFAULT 0,
    "times_incorrect" INTEGER NOT NULL DEFAULT 0,
    "consecutive_correct" INTEGER NOT NULL DEFAULT 0,
    "reviewed_today" INTEGER NOT NULL DEFAULT 0,
    "last_review_date" DATE,
    "average_response_time" INTEGER NOT NULL DEFAULT 0,
    "last_response_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "flashcard_id" UUID NOT NULL,
    "session_id" UUID,
    "deck_id" UUID NOT NULL,
    "quality" "ReviewQuality" NOT NULL,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "previous_interval" INTEGER,
    "previous_ease_factor" DECIMAL(4,2),
    "previous_state" "FlashcardState",
    "new_interval" INTEGER,
    "new_ease_factor" DECIMAL(4,2),
    "new_state" "FlashcardState",
    "new_next_review_date" DATE,
    "review_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_answer" TEXT,
    "device_type" VARCHAR(50),
    "review_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_review_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_cards" INTEGER NOT NULL DEFAULT 0,
    "new_cards" INTEGER NOT NULL DEFAULT 0,
    "learning_cards" INTEGER NOT NULL DEFAULT 0,
    "review_cards" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "hard_count" INTEGER NOT NULL DEFAULT 0,
    "easy_count" INTEGER NOT NULL DEFAULT 0,
    "average_response_time" INTEGER NOT NULL DEFAULT 0,
    "mastery_score" DECIMAL(5,2),
    "device_type" VARCHAR(50),
    "study_mode" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_review_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255),
    "avatar_url" TEXT,
    "app_metadata" JSONB DEFAULT '{}',
    "user_metadata" JSONB DEFAULT '{}',
    "role" VARCHAR(50) NOT NULL DEFAULT 'learner',
    "verified_at" TIMESTAMP,
    "banned_until" TIMESTAMP,
    "last_sign_in_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "provider_data" JSONB,
    "last_sign_in_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_info" VARCHAR(100),
    "expires_at" TIMESTAMP NOT NULL,
    "revoked_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_auth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "method" VARCHAR(20),
    "totp_secret" VARCHAR(255),
    "totp_backup_codes" VARCHAR(100)[] DEFAULT ARRAY[]::VARCHAR(100)[],
    "enabled_at" TIMESTAMP,
    "last_used_at" TIMESTAMP,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_code" VARCHAR(50) NOT NULL,
    "permission_code" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_code","permission_code")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255),
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "old_values" JSONB,
    "new_values" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "sub_total" DECIMAL(12,2) NOT NULL,
    "discount_total" DECIMAL(12,2) NOT NULL,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "coupon_code" VARCHAR(50),
    "coupon_id" UUID,
    "note" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "offering_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "offering_snapshot" JSONB NOT NULL,

    CONSTRAINT "academy_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "transaction_code" VARCHAR(100),
    "amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "response_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_coupons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "max_discount_amount" DECIMAL(12,2),
    "min_order_value" DECIMAL(12,2),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "per_user_limit" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "scope" "CouponScope" NOT NULL DEFAULT 'GLOBAL',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_coupon_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_gamification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" INTEGER NOT NULL DEFAULT 0,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" VARCHAR(10),
    "freeze_count" INTEGER NOT NULL DEFAULT 0,
    "total_active_days" INTEGER NOT NULL DEFAULT 0,
    "weekly_active_count" INTEGER NOT NULL DEFAULT 0,
    "monthly_active_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_gamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "ai_roleplay_trial_limit" INTEGER NOT NULL DEFAULT 3,
    "live_meeting_trial_limit" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "icon" VARCHAR(100),
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "progress" JSONB DEFAULT '{}',
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "cost_points" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'COUPON',
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "BalanceTransactionType" NOT NULL,
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "GamificationCurrency" NOT NULL DEFAULT 'POINT',
    "type" "GamificationTransactionType" NOT NULL,
    "activity_type" "ActivityType",
    "description" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_url" TEXT NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" BIGINT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "metadata" JSONB DEFAULT '{}',
    "owner_id" UUID,
    "module_origin" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "content" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "author_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comment_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_likes" (
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" VARCHAR(50),
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "sent_via" VARCHAR(20)[] DEFAULT ARRAY[]::VARCHAR(20)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "handler_id" UUID,
    "type" "TicketType" NOT NULL DEFAULT 'SUPPORT',
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "class_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "certificate_code" VARCHAR(50) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_url" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notebooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "entry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "notebook_id" UUID NOT NULL,
    "word" VARCHAR(255) NOT NULL,
    "phonetic" VARCHAR(255),
    "meaning" TEXT NOT NULL,
    "note" TEXT,
    "part_of_speech" VARCHAR(50) NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_course_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "short_title" VARCHAR(100),
    "description" TEXT,
    "subject" VARCHAR(100),
    "level" VARCHAR(50),
    "default_language" VARCHAR(20),
    "thumbnail_url" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_course_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_course_editions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "edition_tag" VARCHAR(50) NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "syllabus_snapshot" JSONB,
    "changelog" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_course_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_chapters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_edition_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL,
    "estimated_minutes" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_chapter_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chapter_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "academy_chapter_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "content_url" TEXT,
    "content_body" TEXT,
    "attachments" JSONB DEFAULT '[]',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_quiz_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "question_pool_id" UUID,
    "default_time_limit_minutes" INTEGER,
    "default_max_attempts" INTEGER NOT NULL,
    "default_passing_score_percent" DECIMAL(5,2),
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_quiz_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_assignment_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "default_type" "AssignmentType" NOT NULL,
    "default_max_score" DECIMAL(7,2),
    "default_rubric" JSONB DEFAULT '{}',
    "default_submission_settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_assignment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID NOT NULL,
    "course_edition_id" UUID NOT NULL,
    "code" VARCHAR(150) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "term" VARCHAR(100),
    "batch" VARCHAR(100),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "enrollment_open_at" TIMESTAMP(3),
    "enrollment_close_at" TIMESTAMP(3),
    "min_students" INTEGER,
    "max_students" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "primary_teacher_id" UUID,
    "company_id" UUID,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_class_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20) NOT NULL,
    "location" VARCHAR(255),
    "note" TEXT,

    CONSTRAINT "academy_class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_class_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "quiz_template_id" UUID,
    "assignment_template_id" UUID,
    "title_override" VARCHAR(255),
    "deadline" TIMESTAMP(6),
    "weight" DECIMAL(5,2),
    "max_attempts_override" INTEGER,
    "time_limit_override_minutes" INTEGER,
    "max_score_override" DECIMAL(7,2),
    "settings" JSONB DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_class_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "source_offering_id" UUID,
    "source_order_id" UUID,
    "company_id" UUID,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "academy_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_learning_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    "last_accessed_at" TIMESTAMP(3),
    "progress_percent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "academy_learning_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_class_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "content" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB DEFAULT '{}',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_class_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_profile_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "exam_type" VARCHAR(30) NOT NULL DEFAULT 'COURSE',
    "level" VARCHAR(20),
    "total_time_limit_minutes" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exam_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "instruction" TEXT,
    "time_limit_seconds" INTEGER,
    "order_index" INTEGER NOT NULL,
    "section_type" VARCHAR(50) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "academy_exam_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "question_type" VARCHAR(30) NOT NULL,
    "options" JSONB,
    "correct_answer" JSONB,
    "explanation" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exam_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "points" DECIMAL(7,2) NOT NULL DEFAULT 1.00,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "academy_exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exam_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "class_id" UUID,
    "user_id" UUID NOT NULL,
    "class_assessment_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "raw_score" DECIMAL(7,2),
    "max_score" DECIMAL(7,2),
    "percentage" DECIMAL(5,2),
    "is_passed" BOOLEAN,
    "deadline_at" TIMESTAMP(3),
    "draft_answers" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exam_attempt_section_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "academy_exam_attempt_section_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_exam_attempt_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "exam_question_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "user_answer" JSONB,
    "is_correct" BOOLEAN,
    "points_earned" DECIMAL(7,2),
    "time_spent_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_exam_attempt_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_assignment_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "class_id" UUID NOT NULL,
    "class_assessment_id" UUID NOT NULL,
    "assignment_template_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "score" DECIMAL(7,2),
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_course_offerings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(150) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "original_price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'VND',
    "status" "OfferingStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "OrderType" NOT NULL DEFAULT 'COURSE',
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_course_offering_classes" (
    "offering_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "academy_course_offering_classes_pkey" PRIMARY KEY ("offering_id","class_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_info_sid_key" ON "room_info"("sid");

-- CreateIndex
CREATE INDEX "idx_room_id" ON "room_info"("room_id", "is_running");

-- CreateIndex
CREATE UNIQUE INDEX "room_files_file_id_key" ON "room_files"("file_id");

-- CreateIndex
CREATE INDEX "room_files_room_id_idx" ON "room_files"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_artifacts_artifact_id_key" ON "room_artifacts"("artifact_id");

-- CreateIndex
CREATE INDEX "idx_artifact_artifact_id" ON "room_artifacts"("artifact_id");

-- CreateIndex
CREATE INDEX "idx_artifact_room_id" ON "room_artifacts"("room_id");

-- CreateIndex
CREATE INDEX "idx_artifact_type" ON "room_artifacts"("type");

-- CreateIndex
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");

-- CreateIndex
CREATE INDEX "notes_lesson_id_idx" ON "notes"("lesson_id");

-- CreateIndex
CREATE INDEX "flashcard_decks_user_id_idx" ON "flashcard_decks"("user_id");

-- CreateIndex
CREATE INDEX "flashcards_deck_id_idx" ON "flashcards"("deck_id");

-- CreateIndex
CREATE INDEX "flashcards_note_id_idx" ON "flashcards"("note_id");

-- CreateIndex
CREATE INDEX "flashcards_ai_generated_idx" ON "flashcards"("ai_generated");

-- CreateIndex
CREATE INDEX "flashcards_source_document_id_idx" ON "flashcards"("source_document_id");

-- CreateIndex
CREATE INDEX "flashcard_user_progress_user_id_idx" ON "flashcard_user_progress"("user_id");

-- CreateIndex
CREATE INDEX "flashcard_user_progress_flashcard_id_idx" ON "flashcard_user_progress"("flashcard_id");

-- CreateIndex
CREATE INDEX "flashcard_user_progress_user_id_next_review_date_idx" ON "flashcard_user_progress"("user_id", "next_review_date");

-- CreateIndex
CREATE INDEX "flashcard_user_progress_user_id_state_idx" ON "flashcard_user_progress"("user_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "flashcard_user_progress_user_id_flashcard_id_key" ON "flashcard_user_progress"("user_id", "flashcard_id");

-- CreateIndex
CREATE INDEX "flashcard_reviews_user_id_idx" ON "flashcard_reviews"("user_id");

-- CreateIndex
CREATE INDEX "flashcard_reviews_flashcard_id_idx" ON "flashcard_reviews"("flashcard_id");

-- CreateIndex
CREATE INDEX "flashcard_reviews_session_id_idx" ON "flashcard_reviews"("session_id");

-- CreateIndex
CREATE INDEX "flashcard_reviews_deck_id_idx" ON "flashcard_reviews"("deck_id");

-- CreateIndex
CREATE INDEX "flashcard_reviews_review_date_idx" ON "flashcard_reviews"("review_date");

-- CreateIndex
CREATE INDEX "flashcard_review_sessions_user_id_idx" ON "flashcard_review_sessions"("user_id");

-- CreateIndex
CREATE INDEX "flashcard_review_sessions_deck_id_idx" ON "flashcard_review_sessions"("deck_id");

-- CreateIndex
CREATE INDEX "flashcard_review_sessions_started_at_idx" ON "flashcard_review_sessions"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "user_identities"("user_id");

-- CreateIndex
CREATE INDEX "user_identities_provider_idx" ON "user_identities"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_id_key" ON "user_identities"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_hash_idx" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_auth_user_id_key" ON "two_factor_auth"("user_id");

-- CreateIndex
CREATE INDEX "two_factor_auth_user_id_idx" ON "two_factor_auth"("user_id");

-- CreateIndex
CREATE INDEX "role_permissions_role_code_idx" ON "role_permissions"("role_code");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "academy_orders_code_key" ON "academy_orders"("code");

-- CreateIndex
CREATE INDEX "academy_orders_user_id_idx" ON "academy_orders"("user_id");

-- CreateIndex
CREATE INDEX "academy_orders_status_idx" ON "academy_orders"("status");

-- CreateIndex
CREATE INDEX "academy_orders_created_at_idx" ON "academy_orders"("created_at");

-- CreateIndex
CREATE INDEX "academy_order_items_order_id_idx" ON "academy_order_items"("order_id");

-- CreateIndex
CREATE INDEX "academy_order_items_offering_id_idx" ON "academy_order_items"("offering_id");

-- CreateIndex
CREATE INDEX "academy_transactions_order_id_idx" ON "academy_transactions"("order_id");

-- CreateIndex
CREATE INDEX "academy_transactions_transaction_code_idx" ON "academy_transactions"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "academy_coupons_code_key" ON "academy_coupons"("code");

-- CreateIndex
CREATE INDEX "academy_coupon_usages_coupon_id_idx" ON "academy_coupon_usages"("coupon_id");

-- CreateIndex
CREATE INDEX "academy_coupon_usages_user_id_idx" ON "academy_coupon_usages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_gamification_user_id_key" ON "user_gamification"("user_id");

-- CreateIndex
CREATE INDEX "user_gamification_total_xp_idx" ON "user_gamification"("total_xp" DESC);

-- CreateIndex
CREATE INDEX "user_gamification_user_id_idx" ON "user_gamification"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_balances_user_id_key" ON "user_balances"("user_id");

-- CreateIndex
CREATE INDEX "daily_activities_user_id_idx" ON "daily_activities"("user_id");

-- CreateIndex
CREATE INDEX "daily_activities_date_idx" ON "daily_activities"("date");

-- CreateIndex
CREATE INDEX "daily_activities_activity_type_idx" ON "daily_activities"("activity_type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_activities_user_id_date_activity_type_key" ON "daily_activities"("user_id", "date", "activity_type");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_is_active_idx" ON "achievements"("is_active");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE INDEX "user_achievements_achievement_id_idx" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE INDEX "user_achievements_is_unlocked_idx" ON "user_achievements"("is_unlocked");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "balance_transactions_user_id_idx" ON "balance_transactions"("user_id");

-- CreateIndex
CREATE INDEX "balance_transactions_type_idx" ON "balance_transactions"("type");

-- CreateIndex
CREATE INDEX "balance_transactions_created_at_idx" ON "balance_transactions"("created_at");

-- CreateIndex
CREATE INDEX "gamification_histories_user_id_idx" ON "gamification_histories"("user_id");

-- CreateIndex
CREATE INDEX "gamification_histories_type_idx" ON "gamification_histories"("type");

-- CreateIndex
CREATE INDEX "gamification_histories_activity_type_idx" ON "gamification_histories"("activity_type");

-- CreateIndex
CREATE INDEX "gamification_histories_created_at_idx" ON "gamification_histories"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_file_url_key" ON "file_assets"("file_url");

-- CreateIndex
CREATE INDEX "file_assets_owner_id_idx" ON "file_assets"("owner_id");

-- CreateIndex
CREATE INDEX "file_assets_file_url_idx" ON "file_assets"("file_url");

-- CreateIndex
CREATE INDEX "file_assets_status_idx" ON "file_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "blogs_slug_key" ON "blogs"("slug");

-- CreateIndex
CREATE INDEX "blogs_status_idx" ON "blogs"("status");

-- CreateIndex
CREATE INDEX "blogs_published_at_idx" ON "blogs"("published_at" DESC);

-- CreateIndex
CREATE INDEX "blogs_author_id_idx" ON "blogs"("author_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_parent_comment_id_idx" ON "comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "comment_targets_target_id_target_type_idx" ON "comment_targets"("target_id", "target_type");

-- CreateIndex
CREATE UNIQUE INDEX "comment_targets_comment_id_target_id_target_type_key" ON "comment_targets"("comment_id", "target_id", "target_type");

-- CreateIndex
CREATE INDEX "comment_likes_comment_id_idx" ON "comment_likes"("comment_id");

-- CreateIndex
CREATE INDEX "comment_likes_user_id_idx" ON "comment_likes"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "tickets_user_id_idx" ON "tickets"("user_id");

-- CreateIndex
CREATE INDEX "tickets_handler_id_idx" ON "tickets"("handler_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_type_idx" ON "tickets"("type");

-- CreateIndex
CREATE INDEX "tickets_class_id_idx" ON "tickets"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_enrollment_id_key" ON "certificates"("enrollment_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificate_code_key" ON "certificates"("certificate_code");

-- CreateIndex
CREATE INDEX "certificates_user_id_idx" ON "certificates"("user_id");

-- CreateIndex
CREATE INDEX "certificates_class_id_idx" ON "certificates"("class_id");

-- CreateIndex
CREATE INDEX "notebooks_user_id_idx" ON "notebooks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notebooks_user_id_name_key" ON "notebooks"("user_id", "name");

-- CreateIndex
CREATE INDEX "note_entries_notebook_id_idx" ON "note_entries"("notebook_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_course_profiles_code_key" ON "academy_course_profiles"("code");

-- CreateIndex
CREATE INDEX "academy_course_profiles_subject_idx" ON "academy_course_profiles"("subject");

-- CreateIndex
CREATE INDEX "academy_course_profiles_level_idx" ON "academy_course_profiles"("level");

-- CreateIndex
CREATE INDEX "academy_course_editions_course_profile_id_idx" ON "academy_course_editions"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_course_editions_is_current_idx" ON "academy_course_editions"("is_current");

-- CreateIndex
CREATE UNIQUE INDEX "academy_course_editions_course_profile_id_edition_tag_key" ON "academy_course_editions"("course_profile_id", "edition_tag");

-- CreateIndex
CREATE INDEX "academy_chapters_course_edition_id_order_index_idx" ON "academy_chapters"("course_edition_id", "order_index");

-- CreateIndex
CREATE INDEX "academy_chapter_items_chapter_id_order_index_idx" ON "academy_chapter_items"("chapter_id", "order_index");

-- CreateIndex
CREATE INDEX "academy_chapter_items_reference_id_idx" ON "academy_chapter_items"("reference_id");

-- CreateIndex
CREATE INDEX "academy_lessons_course_profile_id_idx" ON "academy_lessons"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_quiz_templates_course_profile_id_idx" ON "academy_quiz_templates"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_quiz_templates_question_pool_id_idx" ON "academy_quiz_templates"("question_pool_id");

-- CreateIndex
CREATE INDEX "academy_assignment_templates_course_profile_id_idx" ON "academy_assignment_templates"("course_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_classes_code_key" ON "academy_classes"("code");

-- CreateIndex
CREATE INDEX "academy_classes_course_profile_id_idx" ON "academy_classes"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_classes_course_edition_id_idx" ON "academy_classes"("course_edition_id");

-- CreateIndex
CREATE INDEX "academy_classes_mode_idx" ON "academy_classes"("mode");

-- CreateIndex
CREATE INDEX "academy_classes_status_idx" ON "academy_classes"("status");

-- CreateIndex
CREATE INDEX "academy_classes_company_id_idx" ON "academy_classes"("company_id");

-- CreateIndex
CREATE INDEX "academy_class_schedules_class_id_idx" ON "academy_class_schedules"("class_id");

-- CreateIndex
CREATE INDEX "academy_class_assessments_class_id_idx" ON "academy_class_assessments"("class_id");

-- CreateIndex
CREATE INDEX "academy_class_assessments_status_idx" ON "academy_class_assessments"("status");

-- CreateIndex
CREATE INDEX "academy_enrollments_class_id_idx" ON "academy_enrollments"("class_id");

-- CreateIndex
CREATE INDEX "academy_enrollments_user_id_idx" ON "academy_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "academy_enrollments_status_idx" ON "academy_enrollments"("status");

-- CreateIndex
CREATE INDEX "academy_enrollments_company_id_idx" ON "academy_enrollments"("company_id");

-- CreateIndex
CREATE INDEX "academy_learning_progress_class_id_idx" ON "academy_learning_progress"("class_id");

-- CreateIndex
CREATE INDEX "academy_learning_progress_user_id_idx" ON "academy_learning_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_learning_progress_class_id_user_id_lesson_id_key" ON "academy_learning_progress"("class_id", "user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "academy_class_reviews_class_id_idx" ON "academy_class_reviews"("class_id");

-- CreateIndex
CREATE INDEX "academy_class_reviews_user_id_idx" ON "academy_class_reviews"("user_id");

-- CreateIndex
CREATE INDEX "academy_class_reviews_status_idx" ON "academy_class_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "academy_class_reviews_enrollment_id_key" ON "academy_class_reviews"("enrollment_id");

-- CreateIndex
CREATE INDEX "academy_exams_course_profile_id_idx" ON "academy_exams"("course_profile_id");

-- CreateIndex
CREATE INDEX "academy_exams_status_idx" ON "academy_exams"("status");

-- CreateIndex
CREATE INDEX "academy_exam_sections_exam_id_order_index_idx" ON "academy_exam_sections"("exam_id", "order_index");

-- CreateIndex
CREATE INDEX "academy_questions_parent_id_idx" ON "academy_questions"("parent_id");

-- CreateIndex
CREATE INDEX "academy_exam_questions_exam_id_idx" ON "academy_exam_questions"("exam_id");

-- CreateIndex
CREATE INDEX "academy_exam_questions_section_id_idx" ON "academy_exam_questions"("section_id");

-- CreateIndex
CREATE INDEX "academy_exam_questions_question_id_idx" ON "academy_exam_questions"("question_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempts_exam_id_idx" ON "academy_exam_attempts"("exam_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempts_class_id_idx" ON "academy_exam_attempts"("class_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempts_user_id_idx" ON "academy_exam_attempts"("user_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempts_status_idx" ON "academy_exam_attempts"("status");

-- CreateIndex
CREATE INDEX "academy_exam_attempt_section_states_attempt_id_idx" ON "academy_exam_attempt_section_states"("attempt_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempt_section_states_section_id_idx" ON "academy_exam_attempt_section_states"("section_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempt_details_attempt_id_idx" ON "academy_exam_attempt_details"("attempt_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempt_details_exam_question_id_idx" ON "academy_exam_attempt_details"("exam_question_id");

-- CreateIndex
CREATE INDEX "academy_exam_attempt_details_question_id_idx" ON "academy_exam_attempt_details"("question_id");

-- CreateIndex
CREATE INDEX "academy_assignment_submissions_class_id_idx" ON "academy_assignment_submissions"("class_id");

-- CreateIndex
CREATE INDEX "academy_assignment_submissions_class_assessment_id_idx" ON "academy_assignment_submissions"("class_assessment_id");

-- CreateIndex
CREATE INDEX "academy_assignment_submissions_assignment_template_id_idx" ON "academy_assignment_submissions"("assignment_template_id");

-- CreateIndex
CREATE INDEX "academy_assignment_submissions_user_id_idx" ON "academy_assignment_submissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_course_offerings_code_key" ON "academy_course_offerings"("code");

-- CreateIndex
CREATE INDEX "academy_course_offerings_status_idx" ON "academy_course_offerings"("status");

-- CreateIndex
CREATE INDEX "academy_course_offering_classes_class_id_idx" ON "academy_course_offering_classes"("class_id");

-- AddForeignKey
ALTER TABLE "room_artifacts" ADD CONSTRAINT "room_artifacts_room_table_id_fkey" FOREIGN KEY ("room_table_id") REFERENCES "room_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "academy_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_decks" ADD CONSTRAINT "flashcard_decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_user_progress" ADD CONSTRAINT "flashcard_user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_user_progress" ADD CONSTRAINT "flashcard_user_progress_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_flashcard_id_fkey" FOREIGN KEY ("flashcard_id") REFERENCES "flashcards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "flashcard_review_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_review_sessions" ADD CONSTRAINT "flashcard_review_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_review_sessions" ADD CONSTRAINT "flashcard_review_sessions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_auth" ADD CONSTRAINT "two_factor_auth_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_orders" ADD CONSTRAINT "academy_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_orders" ADD CONSTRAINT "academy_orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "academy_coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "academy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_order_items" ADD CONSTRAINT "academy_order_items_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "academy_course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_transactions" ADD CONSTRAINT "academy_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "academy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_coupon_usages" ADD CONSTRAINT "academy_coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "academy_coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_coupon_usages" ADD CONSTRAINT "academy_coupon_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_coupon_usages" ADD CONSTRAINT "academy_coupon_usages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "academy_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_histories" ADD CONSTRAINT "gamification_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_targets" ADD CONSTRAINT "comment_targets_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notebooks" ADD CONSTRAINT "notebooks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_entries" ADD CONSTRAINT "note_entries_notebook_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_course_editions" ADD CONSTRAINT "academy_course_editions_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_chapters" ADD CONSTRAINT "academy_chapters_course_edition_id_fkey" FOREIGN KEY ("course_edition_id") REFERENCES "academy_course_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_chapter_items" ADD CONSTRAINT "academy_chapter_items_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_lessons" ADD CONSTRAINT "academy_lessons_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_quiz_templates" ADD CONSTRAINT "academy_quiz_templates_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_templates" ADD CONSTRAINT "academy_assignment_templates_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_classes" ADD CONSTRAINT "academy_classes_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_classes" ADD CONSTRAINT "academy_classes_course_edition_id_fkey" FOREIGN KEY ("course_edition_id") REFERENCES "academy_course_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_classes" ADD CONSTRAINT "academy_classes_primary_teacher_id_fkey" FOREIGN KEY ("primary_teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_schedules" ADD CONSTRAINT "academy_class_schedules_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_assessments" ADD CONSTRAINT "academy_class_assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_assessments" ADD CONSTRAINT "academy_class_assessments_quiz_template_id_fkey" FOREIGN KEY ("quiz_template_id") REFERENCES "academy_quiz_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_assessments" ADD CONSTRAINT "academy_class_assessments_assignment_template_id_fkey" FOREIGN KEY ("assignment_template_id") REFERENCES "academy_assignment_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_source_order_id_fkey" FOREIGN KEY ("source_order_id") REFERENCES "academy_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_learning_progress" ADD CONSTRAINT "academy_learning_progress_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_learning_progress" ADD CONSTRAINT "academy_learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_learning_progress" ADD CONSTRAINT "academy_learning_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "academy_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_reviews" ADD CONSTRAINT "academy_class_reviews_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_reviews" ADD CONSTRAINT "academy_class_reviews_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "academy_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_class_reviews" ADD CONSTRAINT "academy_class_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exams" ADD CONSTRAINT "academy_exams_course_profile_id_fkey" FOREIGN KEY ("course_profile_id") REFERENCES "academy_course_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_sections" ADD CONSTRAINT "academy_exam_sections_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "academy_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_questions" ADD CONSTRAINT "academy_questions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "academy_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_questions" ADD CONSTRAINT "academy_exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "academy_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_questions" ADD CONSTRAINT "academy_exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "academy_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_questions" ADD CONSTRAINT "academy_exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "academy_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempts" ADD CONSTRAINT "academy_exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "academy_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempts" ADD CONSTRAINT "academy_exam_attempts_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempts" ADD CONSTRAINT "academy_exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempts" ADD CONSTRAINT "academy_exam_attempts_class_assessment_id_fkey" FOREIGN KEY ("class_assessment_id") REFERENCES "academy_class_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempt_section_states" ADD CONSTRAINT "academy_exam_attempt_section_states_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "academy_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempt_section_states" ADD CONSTRAINT "academy_exam_attempt_section_states_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "academy_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempt_details" ADD CONSTRAINT "academy_exam_attempt_details_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "academy_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempt_details" ADD CONSTRAINT "academy_exam_attempt_details_exam_question_id_fkey" FOREIGN KEY ("exam_question_id") REFERENCES "academy_exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_exam_attempt_details" ADD CONSTRAINT "academy_exam_attempt_details_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "academy_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_submissions" ADD CONSTRAINT "academy_assignment_submissions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_submissions" ADD CONSTRAINT "academy_assignment_submissions_class_assessment_id_fkey" FOREIGN KEY ("class_assessment_id") REFERENCES "academy_class_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_submissions" ADD CONSTRAINT "academy_assignment_submissions_assignment_template_id_fkey" FOREIGN KEY ("assignment_template_id") REFERENCES "academy_assignment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_assignment_submissions" ADD CONSTRAINT "academy_assignment_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_course_offering_classes" ADD CONSTRAINT "academy_course_offering_classes_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "academy_course_offerings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_course_offering_classes" ADD CONSTRAINT "academy_course_offering_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "academy_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
