import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('list')
  getGameList() { return this.gameService.getGameList(); }

  @Get('lottery/config')
  getLotteryConfig() { return this.gameService.getLotteryConfig(); }

  @Get('lottery/status')
  getLotteryStatus(@CurrentUser('id') userId: number) {
    return this.gameService.getLotteryStatus(userId);
  }

  @Get('lottery/records')
  getLotteryRecords(@CurrentUser('id') userId: number) {
    return this.gameService.getLotteryRecords(userId);
  }

  @Get(':id/save')
  getGameSave(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.gameService.getGameSave(userId, id);
  }

  @Post(':id/save')
  saveGameSave(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { saveData?: any; save_data?: any },
  ) { return this.gameService.saveGameSave(userId, id, data); }

  @Post(':id/fishing/cast')
  claimFishingCast(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.gameService.claimFishingCast(userId, id);
  }

  @Get(':id/snake-save')
  getSnakeGameSave(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.gameService.getSnakeGameSave(userId, id);
  }

  @Post(':id/snake-save')
  saveSnakeGameSave(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { saveData?: any; save_data?: any },
  ) { return this.gameService.saveSnakeGameSave(userId, id, data); }

  @Get(':id')
  getGameDetail(@Param('id', ParseIntPipe) id: number) { return this.gameService.getGameDetail(id); }

  @Post(':id/start')
  startGame(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number, @Body('betAmount') betAmount?: number) {
    return this.gameService.startGame(userId, id, betAmount);
  }

  @Post(':id/play-duration')
  reportGamePlayDuration(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { sessionId?: string; durationSeconds?: number },
  ) {
    return this.gameService.recordGamePlayDuration(userId, id, data);
  }

  @Post(':id/settle')
  settleGame(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { rank?: number; pointsEarned?: number; items?: any[] },
  ) { return this.gameService.settleGame(userId, id, data); }

  @Post(':id/points/change')
  changeGamePoints(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { amount?: number; reason?: string },
  ) { return this.gameService.changeGamePoints(userId, id, data); }

  @Post('horse/room/create')
  createHorseRoom() { return this.gameService.createHorseRoom(); }

  @Post('horse/bet')
  horseBet(
    @CurrentUser('id') userId: number,
    @Body('roomId') roomId: number,
    @Body('horseNumber') horseNumber: number,
    @Body('amount') amount: number,
  ) { return this.gameService.horseBet(userId, roomId, horseNumber, amount); }

  @Post('horse/settle')
  horseSettle(@Body('roomId') roomId: number, @Body('winnerHorse') winnerHorse: number) {
    return this.gameService.horseSettle(roomId, winnerHorse);
  }

  @Get('horse/room/:id')
  getHorseRoom(@Param('id', ParseIntPipe) id: number) { return this.gameService.getHorseRoom(id); }

  @Post('lottery/spin')
  lotteryDraw(@CurrentUser('id') userId: number) { return this.gameService.lotteryDraw(userId); }
}
