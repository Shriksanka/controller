import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../database/entities/position.entity';
import { TradeSymbol } from '../database/entities/symbol.entity';
import { TradeService } from '../trade/trade.service';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(TradeSymbol)
    private readonly symbolRepo: Repository<TradeSymbol>,
    private readonly tradeService: TradeService,
  ) {}

  private readonly DIRECTION_IDS = {
    long: '08fa26fc-0708-4b28-a283-6db7ee9e5211',
    short: 'fa84bde5-3bd1-4b8a-b805-7c4b05ec4606',
  };

  async enterPosition({
    symbolId,
    direction,
    price,
    reason,
  }: {
    symbolId: string;
    direction: 'long' | 'short';
    price: number;
    reason: string;
  }) {
    const directionId = this.DIRECTION_IDS[direction];

    const existing = await this.positionRepo.findOne({
      where: { symbolId, directionId },
    });
    if (existing) return { status: 'already_opened' };

    const symbol = await this.symbolRepo.findOneBy({ id: symbolId });
    if (!symbol) throw new NotFoundException('Symbol not found');

    const result = await this.tradeService.enterPosition(
      symbol.name,
      direction,
      price,
      reason,
    );

    const position = this.positionRepo.create({
      symbolId,
      directionId,
      entry_price: price,
      amount: 200,
    });

    await this.positionRepo.save(position);

    return { status: 'opened', result };
  }

  async exitPosition({
    symbolId,
    direction,
    price,
    reason,
  }: {
    symbolId: string;
    direction: 'long' | 'short';
    price: number;
    reason: string;
  }) {
    const directionId = this.DIRECTION_IDS[direction];

    const position = await this.positionRepo.findOne({
      where: { symbolId, directionId },
      relations: ['symbol'],
    });

    if (!position) return { status: 'no_active_position' };

    const result = await this.tradeService.exitPosition(
      position.symbol.name,
      direction,
      price,
      reason,
    );

    await this.positionRepo.remove(position);

    return { status: 'closed', result };
  }

  async findPosition(symbolId: string, direction: 'long' | 'short') {
    const directionId = this.DIRECTION_IDS[direction];
    return this.positionRepo.findOne({
      where: { symbolId, directionId },
    });
  }

  async getActivePosition(symbolId: string) {
    return this.positionRepo.findOne({
      where: { symbolId },
      relations: ['symbol'],
    });
  }
}
