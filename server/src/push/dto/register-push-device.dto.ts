import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const PushVendors = [
  'xiaomi',
  'huawei',
  'honor',
  'oppo',
  'vivo',
  'meizu',
  'fcm',
  'unknown',
] as const;

export class RegisterPushDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @IsString()
  @IsIn(PushVendors)
  vendor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  deviceToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UnregisterPushDeviceDto {
  @IsOptional()
  @IsString()
  @IsIn(PushVendors)
  vendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  deviceToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}
