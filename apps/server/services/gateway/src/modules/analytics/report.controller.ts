import {
  Controller,
  Get,
  Inject,
  UseGuards,
  Query,
  Res,
  Param,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { GatewayAuthGuard } from '@server/shared';

@Controller('api/analytics/reports')
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientProxy,
  ) {}

  @Get('export/:type')
  @UseGuards(GatewayAuthGuard)
  async exportReport(
    @Param('type') type: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    try {
      let cmd = '';
      const filename = `report-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;

      switch (type) {
        case 'orders':
          cmd = 'billing.report.export-orders';
          break;
        case 'balance':
          cmd = 'billing.report.export-balance';
          break;
        case 'revenue':
          cmd = 'billing.report.export-revenue';
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      const data = await firstValueFrom(
        this.natsClient.send({ cmd }, { startDate, endDate }),
      );

      if (!data) {
        return res.status(404).json({ message: 'Report data not found' });
      }

      const buffer = Buffer.from(data);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      return res.send(buffer);
    } catch (error: any) {
      this.logger.error(
        `Failed to export ${type} report`,
        error instanceof Error ? error.stack : undefined,
      );
      return res.status(500).json({ message: 'Failed to generate report' });
    }
  }
}
