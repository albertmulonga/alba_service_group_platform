import { Module } from '@nestjs/common';
import { HrService } from './hr.service';
import { HrController } from './hr.controller';
import { AttendanceSecurityService } from './attendance-security.service';

@Module({
  controllers: [HrController],
  providers: [HrService, AttendanceSecurityService],
  exports: [HrService, AttendanceSecurityService],
})
export class HrModule {}