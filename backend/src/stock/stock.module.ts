import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}