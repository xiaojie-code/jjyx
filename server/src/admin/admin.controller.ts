import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';
import { AdminService } from './admin.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 用户
  @Get('users') getUsers(@Query() query: any, @Query() pagination: PaginationDto) { return this.adminService.getUsers(query, pagination); }
  @Get('user-stats') getUserStatsSafe() { return this.adminService.getUserStats(); }
  @Get('users/stats') getUserStats() { return this.adminService.getUserStats(); }
  @Get('users/:id') getUserDetail(@Param('id', ParseIntPipe) id: number) { return this.adminService.getUsers({ keyword: String(id) }, { page: 1, pageSize: 1 }); }
  @Put('users/:id') updateUser(@Param('id', ParseIntPipe) id: number, @Body() data: any) { return this.adminService.updateUser(id, data); }
  @Put('users/:id/status') updateUserStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: number) { return this.adminService.updateUserStatus(id, status); }
  @Post('users/:id/currency') addCurrency(@Param('id', ParseIntPipe) id: number, @Body('type') type: string, @Body('amount') amount: number) { return this.adminService.addCurrency(id, type, amount); }
  @Get('users/:id/logs') getUserLogs(@Param('id', ParseIntPipe) id: number, @Query() query: any, @Query() pagination: PaginationDto) { return this.adminService.getUserLogs(id, query, pagination); }
  @Get('users/:id/activities') getUserActivities(@Param('id', ParseIntPipe) id: number, @Query() query: any) { return this.adminService.getUserActivities(id, query); }
  @Get('users/:id/backpack') getUserBackpack(@Param('id', ParseIntPipe) id: number) { return this.adminService.getUserBackpack(id); }
  @Get('password-reset/requests') getPasswordResetRequests(@Query() query: any) { return this.adminService.getPasswordResetRequests(query); }
  @Post('password-reset/:id/reset') resetPasswordByRequest(@Param('id', ParseIntPipe) id: number) { return this.adminService.resetUserPasswordByRequest(id); }
  @Post('password-reset/:id/reject') rejectPasswordResetRequest(@Param('id', ParseIntPipe) id: number) { return this.adminService.rejectPasswordResetRequest(id); }

  // App版本管理
  @Get('app-versions') getAppVersions() { return this.adminService.getAppVersions(); }
  @Post('app-versions') createAppVersion(@Body() data: any) { return this.adminService.createAppVersion(data); }
  @Put('app-versions/:id') updateAppVersion(@Param('id', ParseIntPipe) id: number, @Body() data: any) { return this.adminService.updateAppVersion(id, data); }
  @Delete('app-versions/:id') deleteAppVersion(@Param('id', ParseIntPipe) id: number) { return this.adminService.deleteAppVersion(id); }

  // 功能开关
  @Get('switches') getSwitches() { return this.adminService.getSwitches(); }
  @Put('switches/:id') updateSwitch(@Param('id', ParseIntPipe) id: number, @Body('status') status: number) { return this.adminService.updateSwitch(id, status); }

  // 转盘
  @Get('lottery') getLottery() { return this.adminService.getLotteryConfigs(); }
  @Post('lottery') createLottery(@Body() data: any) { return this.adminService.createLottery(data); }
  @Put('lottery/:id') updateLottery(@Param('id', ParseIntPipe) id: number, @Body() data: any) { return this.adminService.updateLottery(id, data); }
  @Delete('lottery/:id') deleteLottery(@Param('id', ParseIntPipe) id: number) { return this.adminService.deleteLottery(id); }

  // CDK
  @Post('cdk/generate') generateCdks(@Body('cdkTypeId') cdkTypeId: number, @Body('count') count: number, @Body('itemsJson') itemsJson: any) { return this.adminService.generateCdks(cdkTypeId, count, itemsJson); }
  @Get('cdk/list') getCdkList(@Query() query: any) {
    const pagination = new PaginationDto();
    pagination.page = parseInt(query.page, 10) || 1;
    pagination.pageSize = parseInt(query.pageSize, 10) || 20;
    return this.adminService.getCdkList(query, pagination);
  }
  @Get('cdk/types') getCdkTypes() { return this.adminService.getCdkTypes(); }
  @Post('cdk/types') createCdkType(@Body() data: any) { return this.adminService.createCdkType(data); }
  @Put('cdk/types/:id') updateCdkType(@Param('id', ParseIntPipe) id: number, @Body() data: any) { return this.adminService.updateCdkType(id, data); }
  @Put('cdk/:id/status') updateCdkStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: number) { return this.adminService.updateCdkStatus(id, status); }

  // 建群审核
  @Get('groups/pending') getPendingGroups(@Query() query: any) {
    const pagination = new PaginationDto();
    pagination.page = parseInt(query.page, 10) || 1;
    pagination.pageSize = parseInt(query.pageSize, 10) || 20;
    return this.adminService.getPendingGroups(pagination);
  }
  @Post('groups/:id/review') reviewGroup(@Param('id', ParseIntPipe) id: number, @Body('action') action: 'approve' | 'reject') { return this.adminService.reviewGroup(id, action); }
  @Post('groups/system') createSystemGroup(@Body('name') name: string) { return this.adminService.createSystemGroup(name || '沧恒云芯'); }

  // 提现
  @Get('withdrawals') getWithdrawals(@Query() query: any) { return this.adminService.getWithdrawals(query); }
  @Put('withdrawals/:id') reviewWithdrawal(@Param('id', ParseIntPipe) id: number, @Body('approve') approve: boolean) { return this.adminService.reviewWithdrawal(id, approve); }

  // 充值
  @Get('recharge/orders') getRechargeOrders(@Query() query: any) { return this.adminService.getRechargeOrders(query); }
  @Get('recharge/stats') getRechargeStats() { return this.adminService.getRechargeStats(); }
  @Put('recharge/:id/review') reviewRecharge(@CurrentUser('id') operatorId: number, @Param('id', ParseIntPipe) id: number, @Body() data: { action: 'approve' | 'reject'; remark?: string }) { return this.adminService.reviewRecharge(id, operatorId, data); }

  // 充值收款码上传
  @Post('recharge/qrcode')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'recharge');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname || '.png') || '.png';
        cb(null, `qrcode-${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadRechargeQrcode(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择收款码图片');
    const url = `/uploads/recharge/${file.filename}`;
    return this.adminService.updateConfig('recharge_qrcode', url).then(() => ({ url }));
  }

  // 系统配置
  @Get('configs') getConfigs() { return this.adminService.getConfigs(); }
  @Put('configs/:key') updateConfig(@Param('key') key: string, @Body('value') value: string) { return this.adminService.updateConfig(key, value); }

  // 分销
  @Get('agents') getAgents(@Query() query: any) { return this.adminService.getAgents(query); }
  @Get('agents/:id/users') getAgentUsers(@Param('id', ParseIntPipe) id: number) { return this.adminService.getAgentUsers(id); }

  // 邀请关系
  @Get('invite/tree') getInviteTreeByKeyword(@Query('keyword') keyword: string) { return this.adminService.getInviteTreeByKeyword(keyword); }
  @Get('invite/tree/:id') getInviteTree(@Param('id', ParseIntPipe) id: number) { return this.adminService.getInviteTree(id); }
  @Get('invite/records') getInviteRecords(@Query() query: any) { return this.adminService.getInviteRecordsAdmin(query); }

  // 矩阵推广管理
  @Get('matrix/list') getMatrixList(@Query() query: any, @Query('page') page: string, @Query('pageSize') pageSize: string) {
    const pagination = new PaginationDto(); pagination.page = parseInt(page, 10) || 1; pagination.pageSize = parseInt(pageSize, 10) || 20;
    return this.adminService.getMatrixList(query, pagination);
  }
  @Get('matrix/detail/:id') getMatrixDetail(@Param('id', ParseIntPipe) id: number) { return this.adminService.getMatrixDetail(id); }
  @Get('matrix/incomes') getMatrixIncomes(@Query() query: any, @Query('page') page: string, @Query('pageSize') pageSize: string) {
    const pagination = new PaginationDto(); pagination.page = parseInt(page, 10) || 1; pagination.pageSize = parseInt(pageSize, 10) || 20;
    return this.adminService.getMatrixIncomes(query, pagination);
  }
  @Get('matrix/stats') getMatrixStats() { return this.adminService.getMatrixStats(); }

  // 社交/会议管理
  @Get('social/messages') getAdminMessages(@Query() query: any) { return this.adminService.getAdminMessages(query); }
  @Delete('social/messages/:id') deleteAdminMessage(@Param('id', ParseIntPipe) id: number) { return this.adminService.deleteAdminMessage(id); }
  @Get('social/meetings') getAdminMeetings(@Query() query: any) { return this.adminService.getAdminMeetings(query); }
  @Put('social/meetings/:id/end') endAdminMeeting(@Param('id', ParseIntPipe) id: number) { return this.adminService.endAdminMeeting(id); }
  @Put('social/meetings/:id/recording') updateMeetingRecording(@Param('id', ParseIntPipe) id: number, @Body('recordingUrl') recordingUrl: string) { return this.adminService.updateMeetingRecording(id, recordingUrl); }
  @Post('social/clean') cleanSocialData(@Body('days') days?: number) { return this.adminService.cleanSocialData(days); }
}
