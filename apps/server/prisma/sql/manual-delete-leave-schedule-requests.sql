-- Chạy trước `prisma db push` hoặc khi migrate/schema engine báo lỗi:
--   invalid input value for enum "LiveScheduleRequestType_new": "LEAVE"
--
-- Nguyên nhân: `db push` không đọc migration.sql có bước DELETE; cần xóa dòng LEAVE trước.
-- Sau khi chạy file này (psql / GUI), chạy lại: prisma db push   hoặc   prisma migrate deploy

DELETE FROM "academy_live_schedule_requests"
WHERE "type"::text = 'LEAVE';
