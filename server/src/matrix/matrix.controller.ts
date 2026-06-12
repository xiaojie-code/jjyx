import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MatrixService } from './matrix.service';

@Controller('matrix')
export class MatrixController {
  constructor(private readonly matrixService: MatrixService) {}

  /** 获取推广邀请码和推广统计 */
  @Get('invite-info')
  async getInviteInfo(@CurrentUser('id') userId: number) {
    return this.matrixService.getInviteInfo(userId);
  }

  /** 获取当前矩阵信息（含坑位详情） */
  @Get('current')
  async getCurrentMatrix(@CurrentUser('id') userId: number) {
    return this.matrixService.getCurrentMatrix(userId);
  }

  /** 获取直推用户列表 */
  @Get('direct-users')
  async getDirectUsers(@CurrentUser('id') userId: number) {
    return this.matrixService.getDirectUsers(userId);
  }

  /** 获取有效团推用户列表 */
  @Get('team-users')
  async getTeamUsers(@CurrentUser('id') userId: number) {
    return this.matrixService.getTeamUsers(userId);
  }

  /** 获取已完成矩阵历史（含坑位详情和直推标注） */
  @Get('completed-rounds')
  async getCompletedRounds(@CurrentUser('id') userId: number) {
    return this.matrixService.getCompletedRounds(userId);
  }

  /** 获取收益明细（按轮次和坑位） */
  @Get('income-detail')
  async getIncomeDetail(@CurrentUser('id') userId: number) {
    return this.matrixService.getIncomeDetail(userId);
  }

  /** 获取指定用户的轮次和资金信息 */
  @Get('user-round-info')
  async getUserRoundInfo(@CurrentUser('id') userId: number, @Query('userId') targetUserId: string) {
    return this.matrixService.getUserRoundInfo(Number(targetUserId));
  }

  /** 获取矩阵历史 */
  @Get('history')
  async getMatrixHistory(@CurrentUser('id') userId: number) {
    return this.matrixService.getMatrixHistory(userId);
  }

  /** 获取矩阵统计 */
  @Get('stats')
  async getMatrixStats(@CurrentUser('id') userId: number) {
    return this.matrixService.getMatrixStats(userId);
  }

  /** 获取可领取收益 */
  @Get('income')
  async getClaimableIncome(@CurrentUser('id') userId: number) {
    return this.matrixService.getClaimableIncome(userId);
  }

  /** 领取收益 */
  @Post('claim')
  async claimIncome(@CurrentUser('id') userId: number) {
    const amount = await this.matrixService.claimIncome(userId);
    return { claimed: amount };
  }

  /** 手动进入下一轮 */
  @Post('next-round')
  async enterNextRound(@CurrentUser('id') userId: number) {
    return this.matrixService.enterNextRound(userId);
  }
}
