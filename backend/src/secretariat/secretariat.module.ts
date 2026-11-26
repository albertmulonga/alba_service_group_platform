import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecretariatController } from './secretariat.controller';
import { SecretariatService } from './secretariat.service';

@Module({
  imports: [PrismaModule],
  controllers: [SecretariatController],
  providers: [SecretariatService],
  exports: [SecretariatService],
})
export class SecretariatModule {}
