import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GatewayAuthGuard,
  Permissions,
  PermissionsGuard,
  Public,
  ReqWithRequester,
  ZodValidationPipe,
  successPaginatedResponse,
  successResponse,
} from '@server/shared';
import { certificateQueryDTOSchema } from '@workspace/schemas';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

@Controller('api/certificates')
@UseGuards(GatewayAuthGuard, PermissionsGuard)
export class CertificateController {
  constructor(@Inject('NATS_SERVICE') private readonly nats: ClientProxy) {}

  private removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|á|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
    str = str.replace(/Đ/g, 'D');
    // Some system encode individual combining marks
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
    return str;
  }

  private async buildCertificatePdf(params: {
    certificateCode: string;
    recipientName: string;
    courseName: string;
    issueDate: Date;
  }): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const marginX = 56;
    const topY = 780;

    page.drawText('TORII ACADEMY', {
      x: marginX,
      y: topY,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('Certificate of Completion', {
      x: marginX,
      y: topY - 30,
      size: 28,
      font: fontBold,
      color: rgb(0.05, 0.1, 0.25),
    });

    page.drawText(this.removeVietnameseTones('Chứng nhận rằng'), {
      x: marginX,
      y: topY - 90,
      size: 12,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });

    page.drawText(this.removeVietnameseTones(params.recipientName || 'Học viên'), {
      x: marginX,
      y: topY - 125,
      size: 22,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(this.removeVietnameseTones('đã hoàn thành khóa học'), {
      x: marginX,
      y: topY - 170,
      size: 12,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });

    page.drawText(this.removeVietnameseTones(params.courseName || 'Khóa học tại Torii'), {
      x: marginX,
      y: topY - 205,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const dateStr = new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(params.issueDate);

    page.drawText(this.removeVietnameseTones(`Ngày cấp: ${dateStr}`), {
      x: marginX,
      y: 120,
      size: 11,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });
    page.drawText(this.removeVietnameseTones(`Mã xác thực: ${params.certificateCode}`), {
      x: marginX,
      y: 100,
      size: 11,
      font,
      color: rgb(0.25, 0.25, 0.25),
    });

    page.drawText(this.removeVietnameseTones('Xác thực tại: https://app.torii.sbs/verify/<code>'), {
      x: marginX,
      y: 80,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });

    return await pdf.save();
  }

  @Get()
  @Permissions('lms.delivery.read')
  async findAll(
    @Query(new ZodValidationPipe(certificateQueryDTOSchema)) query: any,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.certificate.findAll' }, query),
    );
    return successPaginatedResponse(result);
  }

  @Get('me')
  async findMine(@Req() req: ReqWithRequester, @Query() query: any) {
    const result = await firstValueFrom(
      this.nats.send(
        { cmd: 'academy.certificate.findAll' },
        { ...query, userId: req.requester?.sub },
      ),
    );
    return successPaginatedResponse(result);
  }

  @Get('verify/:code')
  @Public()
  async verify(@Param('code') code: string) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.certificate.verify' }, { code }),
    );
    return successResponse(result);
  }

  @Get('verify/:code/pdf')
  @Public()
  async downloadVerifiedPdf(
    @Param('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.certificate.verify' }, { code }),
    );

    if (!result?.valid || !result?.certificate) {
      res.status(404);
      return successResponse({ valid: false });
    }

    const cert = result.certificate;
    const pdfBytes = await this.buildCertificatePdf({
      certificateCode: cert.certificateCode,
      recipientName: cert.user?.displayName || 'Học viên',
      courseName: cert.class?.name || cert.vodPackage?.title || 'Khóa học tại Torii',
      issueDate: new Date(cert.issueDate),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${cert.certificateCode}.pdf"`,
    );
    return new StreamableFile(Buffer.from(pdfBytes));
  }

  @Get(':id')
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: ReqWithRequester,
  ) {
    const isStaff =
      req.requester?.permissions?.includes('lms.delivery.read') || false;
    const result = await firstValueFrom(
      this.nats.send({ cmd: 'academy.certificate.findById' }, { id }),
    );

    if (!isStaff && result?.userId !== req.requester?.sub) {
      throw new ForbiddenException(
        'You do not have permission to view this certificate',
      );
    }
    return successResponse(result);
  }

  @Get(':id/pdf')
  async downloadPdfById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) res: Response,
    @Req() req: ReqWithRequester,
  ) {
    const isStaff =
      req.requester?.permissions?.includes('lms.delivery.read') || false;
    console.log(`[Gateway] Download certificate PDF: ID=${id}, RequesterSub=${req.requester?.sub}`);
    const cert = await firstValueFrom(
      this.nats.send({ cmd: 'academy.certificate.findById' }, { id }),
    );

    if (!cert) {
      console.error(`[Gateway] Certificate not found in Academy: ${id}`);
    } else {
      console.log(`[Gateway] Certificate found: UserId=${cert.userId}`);
    }

    if (!isStaff && cert?.userId !== req.requester?.sub) {
      console.warn(`[Gateway] Forbidden download attempt. CertUserId=${cert?.userId}, ReqSub=${req.requester?.sub}`);
      throw new ForbiddenException(
        'You do not have permission to download this certificate',
      );
    }

    const pdfBytes = await this.buildCertificatePdf({
      certificateCode: cert.certificateCode,
      recipientName: cert.user?.displayName || 'Học viên',
      courseName: cert.class?.name || cert.vodPackage?.title || 'Khóa học tại Torii',
      issueDate: new Date(cert.issueDate),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${cert.certificateCode}.pdf"`,
    );
    return new StreamableFile(Buffer.from(pdfBytes));
  }
}
