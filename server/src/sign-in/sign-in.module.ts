import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignInRecord } from '../entities/sign-in-record.entity';
import { CurrencyModule } from '../currency/currency.module';
import { SignInController } from './sign-in.controller';
import { SignInService } from './sign-in.service';

@Module({
  imports: [TypeOrmModule.forFeature([SignInRecord]), CurrencyModule],
  controllers: [SignInController],
  providers: [SignInService],
})
export class SignInModule {}
