import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TradeSymbol } from './symbol.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'symbol_id' })
  symbolId: string;

  @ManyToOne(() => TradeSymbol, { eager: true })
  @JoinColumn({ name: 'symbol_id' })
  symbol: TradeSymbol;

  @Column({ name: 'direction_id' })
  directionId: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'float' })
  entry_price: number;

  @CreateDateColumn({ name: 'opened_at' })
  openedAt: Date;

  @UpdateDateColumn({ name: 'last_updated' })
  lastUpdated: Date;
}
