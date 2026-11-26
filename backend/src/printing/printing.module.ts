import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrintingController],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}