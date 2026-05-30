import { IsString, Length } from 'class-validator';

export class UpdateNicknameDto {
  @IsString()
  @Length(2, 10)
  nickname: string;
}
