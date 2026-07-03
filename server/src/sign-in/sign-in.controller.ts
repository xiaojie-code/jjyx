import { Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SignInService } from './sign-in.service';

@Controller('sign-in')
export class SignInController {
  constructor(private readonly signInService: SignInService) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: number) {
    return this.signInService.getStatus(userId);
  }

  @Post('claim')
  async claim(@CurrentUser('id') userId: number) {
    return this.signInService.claim(userId);
  }
}
