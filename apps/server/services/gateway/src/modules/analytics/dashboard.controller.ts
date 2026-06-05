import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Permissions,
  PermissionsGuard,
  successResponse,
  GatewayAuthGuard,
  ReqWithRequester,
} from '@server/shared';
import type {
  AdminDashboardResponseDTO,
  AdminPresenceStatsDTO,
  LecturerDashboardResponseDTO,
  RevenueAnalyticsResponseDTO,
  StaffAcademicDashboardResponseDTO,
  StaffOperationsDashboardResponseDTO,
  StandardApiResponse,
} from '@workspace/schemas';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('staff-academic')
  @Permissions(
    'lms.catalog.update',
    'lms.delivery.update',
    'lms.commerce.update',
  )
  async getStaffAcademicDashboard(): Promise<
    StandardApiResponse<StaffAcademicDashboardResponseDTO>
  > {
    const data = await this.dashboardService.getStaffAcademicDashboard();
    return successResponse(data);
  }

  @Get('staff-operations')
  @Permissions('ops.order.manage')
  async getStaffOperationsDashboard(): Promise<
    StandardApiResponse<StaffOperationsDashboardResponseDTO>
  > {
    const data = await this.dashboardService.getStaffOperationsDashboard();
    return successResponse(data);
  }

  @Get('admin')
  @Permissions('lms.approval.manage')
  async getAdminDashboard(): Promise<StandardApiResponse<AdminDashboardResponseDTO>> {
    const data = await this.dashboardService.getAdminDashboard();
    return successResponse(data);
  }

  /** Chỉ block thống kê phiên / hoạt động — payload nhẹ, có thể poll */
  @Get('presence')
  @Permissions('lms.approval.manage')
  async getPresenceStats(): Promise<StandardApiResponse<AdminPresenceStatsDTO>> {
    const data = await this.dashboardService.getPresenceStats();
    return successResponse(data);
  }

  @Get('lecturer')
  @Permissions('lms.delivery.read')
  async getLecturerDashboard(
    @Req() req: ReqWithRequester,
  ): Promise<StandardApiResponse<LecturerDashboardResponseDTO>> {
    const userId = req.requester?.sub;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const data = await this.dashboardService.getLecturerDashboard(userId);
    return successResponse(data);
  }

  /**
   * Trang analysis doanh thu (admin + staff-operations).
   * Filter theo ngày (UTC date) bằng query: fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   */
  @Get('revenue-analytics')
  @Permissions('ops.order.manage', 'lms.approval.manage')
  async getRevenueAnalytics(
    @Query() query: { fromDate?: string; toDate?: string },
  ): Promise<StandardApiResponse<RevenueAnalyticsResponseDTO>> {
    const data = await this.dashboardService.getRevenueAnalytics({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
    return successResponse(data);
  }
}

