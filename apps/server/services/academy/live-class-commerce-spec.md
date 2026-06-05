# Commerce LIVE/VOD & Enrollment (trạng thái hiện tại)

Tài liệu mô tả luồng **Cohort / LiveClass / VodPackage / Enrollment / Order** trong academy service. Các khái niệm catalog cũ (master / run / offering dạng entity) **không** còn trong runtime.

## Thực thể chính (Prisma)

| Khái niệm | Ghi chú |
|-----------|---------|
| **Cohort** | Đợt / gói bán LIVE (catalog). |
| **LiveClass** | Một lớp LIVE cụ thể (thuộc cohort). |
| **VodPackage** | Gói VOD (catalog). |
| **Enrollment** | `userId` + **một trong hai**: `liveClassId` **hoặc** `vodPackageId`. |
| **Order** / **OrderItem** | Giỏ: `cohortId`, `liveClassId`, `vodPackageId`, … và **`deliverySnapshot`** (JSON, cột `delivery_snapshot`) — ảnh chụp giá/tên/mô tả lúc mua. |

## Luồng nghiệp vụ

1. Learner chọn sản phẩm catalog (cohort / gói VOD / lớp LIVE) → **checkout** → tạo **Order** + **OrderItem**.
2. Sau thanh toán → tạo **Enrollment** trỏ tới đúng **LiveClass** hoặc **VodPackage** đã chốt.
3. Học, tiến độ, **quiz / attempt** dùng **`enrollmentId`** (phạm vi theo ghi danh).

## API & code

- Commerce: `apps/server/services/academy/src/modules/commerce/`.
- Enrollment: `apps/server/services/academy/src/modules/classroom/enrollment/`.
- Gateway: `apps/server/services/gateway/src/modules/academy/`.

## Migration lịch sử

Các file trong `prisma/migrations/**` giữ nguyên (audit DB). **Không** sửa migration đã chạy.

## Coupon

`CouponScope` trong Prisma chỉ còn **GLOBAL**. Validate coupon dùng `code`, `userId`, `orderValue` — không lọc theo từng dòng giỏ.
