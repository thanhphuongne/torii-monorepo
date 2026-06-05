import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsOptional,
  IsString,
  IsObject,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/generated';

export class OrderCheckoutDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vodPackageIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cohortIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  liveClassIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriptionPlanIds?: string[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isGift?: boolean;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  giftMessage?: string;

  @IsOptional()
  @IsObject()
  liveClassIdByCohort?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  paymentGateway?: string;
}

export class OrderPreviewDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vodPackageIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cohortIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  liveClassIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscriptionPlanIds?: string[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isGift?: boolean;

  @IsOptional()
  @IsEmail()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  giftMessage?: string;

  @IsOptional()
  @IsObject()
  liveClassIdByCohort?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  useWalletBalance?: boolean;
}
