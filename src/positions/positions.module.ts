import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradeSymbol } from '../database/entities/symbol.entity';
import { Position } from '../database/entities/position.entity';
import { TradeModule } from '../trade/trade.module';
import { PositionsController } from './positions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Position, TradeSymbol]), TradeModule],
  providers: [PositionsService],
  controllers: [PositionsController],
})
export class PositionsModule {}
