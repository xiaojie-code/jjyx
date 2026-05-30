import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackpackItem } from '../entities/backpack-item.entity';

@Controller('backpack')
export class BackpackController {
  constructor(
    @InjectRepository(BackpackItem)
    private readonly backpackRepo: Repository<BackpackItem>,
  ) {}

  @Get('items')
  async getItems(@CurrentUser('id') userId: number) {
    return this.backpackRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  @Get('items/:id')
  async getItemDetail(@Param('id', ParseIntPipe) id: number) {
    return this.backpackRepo.findOne({ where: { id } });
  }
}
