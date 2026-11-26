import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GraphicsController } from './graphics.controller';
import { GraphicsService } from './graphics.service';

@Module({
  imports: [PrismaModule],
  controllers: [GraphicsController],
  providers: [GraphicsService],
  exports: [GraphicsService],
})
export class GraphicsModule {}
