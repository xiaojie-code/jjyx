import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(4, 50)
  account: string;

  @IsString()
  @Length(6, 50)
  password: string;
}
