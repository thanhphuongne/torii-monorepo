## RBAC v1 -> v2 Mapping (Task 1/2 Output)

Mục đích: làm baseline cho Task 3 migration dữ liệu `role_permissions` và Task 4 refactor `@Permissions(...)`.

### Mapping permission cũ sang permission mới

- `academy.content.read` -> `lms.catalog.read`
- `academy.content.write` -> `lms.catalog.create`, `lms.catalog.update`
- `academy.content.approve` -> `lms.catalog.approve`
- `academy.delivery.read` -> `lms.delivery.read`
- `academy.delivery.write` -> `lms.delivery.update`, `lms.delivery.attendance.manage`
- `academy.delivery.approve` -> `lms.delivery.approve`
- `academy.commerce.read` -> `lms.commerce.read`
- `academy.commerce.write` -> `lms.commerce.create`, `lms.commerce.update`
- `academy.commerce.approve` -> `lms.commerce.approve`
- `schedule.view` -> `lms.delivery.read`
- `live_class.manage` -> `lms.delivery.manage`
- `exam.manage` -> `lms.assessment.create`, `lms.assessment.update`, `lms.assessment.delete`
- `submission.grade` -> `lms.assessment.grade`
- `academy:order:admin` -> `ops.order.manage`
- `academy:coupon:admin` -> `ops.coupon.manage`
- `academy:subscription:admin` -> `ops.subscription.manage`
- `blog.manage` -> `ops.blog.manage`
- `blog.create` -> `ops.blog.manage`
- `blog.update` -> `ops.blog.manage`
- `blog.publish` -> `ops.blog.manage`
- `blog.delete` -> `ops.blog.manage`
- `blog.view_restricted` -> `ops.blog.manage`
- `gamification.manage` -> `ops.gamification.manage`
- `support.view` -> `ops.support.view`
- `support.handle` -> `ops.support.handle`
- `user.view` -> `ops.user.view`
- `user.manage` -> `ops.user.manage`
- `report.view` -> `ops.report.view`
- `audit.view` -> `ops.audit.view`
- `system.config` -> `ops.user.manage` (tạm thời, cần tách riêng `ops.system.config` ở Task 3 nếu có use case)

### Quy tắc khác biệt Lecturer vs Staff-Academic

- `staff-academic`:
  - Có toàn quyền quản trị học thuật global (catalog/delivery/assessment/approval/commerce học thuật).
- `lecturer`:
  - Không có quyền catalog global, không approval, không commerce global.
  - Chỉ thao tác lớp được assign.
  - Bắt buộc ownership check ở service/controller:
    - `class.instructorId == requesterId` hoặc bản ghi phân công tương đương.

### Acceptance criteria Task 1/2

- Permission model mới theo bounded context được định nghĩa rõ trong `rbac-v2.yaml`.
- Role matrix mới hoàn chỉnh cho `admin`, `staff-academic`, `staff-operations`, `lecturer`, `learner`.
- Lecturer và Staff-Academic được tách rõ bằng action và scope, không chồng chéo nghiệp vụ.
