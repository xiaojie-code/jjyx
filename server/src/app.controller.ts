import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('app/version')
  getLatestAppVersion(@Query('platform') platform?: string) {
    return this.appService.getLatestAppVersion(platform || 'android');
  }
}
