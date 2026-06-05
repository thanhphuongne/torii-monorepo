## RBAC v2 Migration Runbook (Task 3)

### 1) Kiểm tra trước khi chạy

- Đảm bảo DB kết nối được.
- Đảm bảo đã có file:
  - `config/rbac-v2.yaml`
  - `prisma/migrate-rbac-v2.ts`

### 2) Chạy dry-run trước

```bash
pnpm -C apps/server rbac:v2:migrate:dry
```

- Script sẽ tạo file backup JSON trong `apps/server/prisma/`:
  - `rbac-v2-migration-backup-<timestamp>.json`
- Xem phần `before` và `after` để xác nhận mapping đúng.

### 3) Chạy migrate áp dụng mapping giữ custom theo role hiện tại

```bash
pnpm -C apps/server rbac:v2:migrate
```

### 4) Nếu muốn force đồng bộ theo role matrix chuẩn trong `rbac-v2.yaml`

```bash
pnpm -C apps/server rbac:v2:migrate:matrix
```

### 5) Hậu kiểm

- Kiểm tra lại bảng `role_permissions`.
- Đăng nhập test với từng role:
  - `lecturer`
  - `staff-academic`
  - `staff-operations`
  - `admin`
- Verify route + method-level API theo permission mới.

### 6) Rollback tạm thời (thủ công)

- Dùng file backup JSON để phục hồi `role_permissions` nếu cần.
- Khuyến nghị viết script restore riêng trước khi chạy production.

