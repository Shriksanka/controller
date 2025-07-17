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
    long: '710381de-15d8-4b82-ac56-88e220c9e2d9',
    short: '2816b826-c95e-4430-8ccd-27816751ced5',
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
    console.log(
      `[ENTER] Processing entry for ${symbolId} as ${direction}, price=${price}, reason=${reason}`,
    );

    const directionId = this.DIRECTION_IDS[direction];

    const existing = await this.positionRepo.findOne({
      where: { symbolId, directionId },
    });
    if (existing) {
      console.log(
        `[ENTER] Position already opened for ${symbolId} as ${direction}`,
      );

      return { status: 'already_opened' };
    }

    const symbol = await this.symbolRepo.findOneBy({ id: symbolId });
    if (!symbol) {
      console.warn(`[ENTER] Symbol not found: ${symbolId}`);

      throw new NotFoundException('Symbol not found');
    }

    const result = await this.tradeService.enterPosition(
      symbol.name,
      direction,
      price,
      reason,
    );
    console.log(`[ENTER] TradeService responded:`, result);

    const position = this.positionRepo.create({
      symbolId,
      directionId,
      entry_price: price,
      amount: 200,
    });

    console.log(`[ENTER] Position saved in DB for ${symbolId} (${direction})`);
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
    console.log(
      `[EXIT] Processing exit for ${symbolId} as ${direction}, price=${price}, reason=${reason}`,
    );

    const directionId = this.DIRECTION_IDS[direction];

    const position = await this.positionRepo.findOne({
      where: { symbolId, directionId },
      relations: ['symbol'],
    });

    if (!position) {
      console.log(
        `[EXIT] No active position found for ${symbolId} as ${direction}`,
      );

      return { status: 'no_active_position' };
    }

    const result = await this.tradeService.exitPosition(
      position.symbol.name,
      direction,
      price,
      reason,
    );
    console.log(`[EXIT] TradeService responded:`, result);

    await this.positionRepo.remove(position);
    console.log(
      `[EXIT] Position removed from DB for ${symbolId} (${direction})`,
    );

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
