import { IsString, IsNotEmpty } from 'class-validator';

export class ActivateDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
