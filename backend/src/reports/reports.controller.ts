import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('sales')
  async getSalesReport(@Query() filters: any) {
    return this.reportsService.getSalesReport(filters);
  }

  @Get('finance')
  async getFinanceReport(@Query() filters: any) {
    return this.reportsService.getFinanceReport(filters);
  }
}
