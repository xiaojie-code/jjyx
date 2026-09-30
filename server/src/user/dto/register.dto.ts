import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(4, 50)
  account: string;

  @IsString()
  @Length(6, 50)
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{8}$/, { message: '邀请码格式不正确，应为8位大写字母和数字组合' })
  inviteCode?: string;
}
