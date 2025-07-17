import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { PositionsService } from './positions.service';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post('enter')
  async enterPosition(
    @Body()
    body: {
      symbolId: string;
      direction: 'long' | 'short';
      price: number;
      reason: string;
    },
  ) {
    console.log(`[ENTER] Received enterPosition request:`, body);
    return this.positionsService.enterPosition(body);
  }

  @Post('exit')
  async exitPosition(
    @Body()
    body: {
      symbolId: string;
      direction: 'long' | 'short';
      price: number;
      reason: string;
    },
  ) {
    console.log(`[EXIT] Received exitPosition request:`, body);
    return this.positionsService.exitPosition(body);
  }
}
