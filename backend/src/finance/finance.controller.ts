import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(AuthGuard('jwt'))
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // --- ACCOUNTS ---

  @Get('accounts')
  async findAllAccounts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.financeService.findAllAccounts({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('accounts/:id')
  async findOneAccount(@Param('id') id: string) {
    return this.financeService.findOneAccount(id);
  }

  @Post('accounts')
  async createAccount(@Body() data: any) {
    return this.financeService.createAccount(data);
  }

  @Put('accounts/:id')
  async updateAccount(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateAccount(id, data);
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Param('id') id: string) {
    return this.financeService.deleteAccount(id);
  }

  // --- TRANSACTIONS ---

  @Get('transactions')
  async findAllTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('accountId') accountId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.findAllTransactions({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      accountId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('transactions/:id')
  async findOneTransaction(@Param('id') id: string) {
    return this.financeService.findOneTransaction(id);
  }

  @Post('transactions')
  async createTransaction(@Body() data: any) {
    return this.financeService.createTransaction(data);
  }

  @Delete('transactions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTransaction(@Param('id') id: string) {
    return this.financeService.deleteTransaction(id);
  }

  // --- REVENUES ---

  @Get('revenues')
  async findAllRevenues(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.findAllRevenues({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('revenues/:id')
  async findOneRevenue(@Param('id') id: string) {
    return this.financeService.findOneRevenue(id);
  }

  @Post('revenues')
  async createRevenue(@Body() data: any) {
    return this.financeService.createRevenue(data);
  }

  @Put('revenues/:id')
  async updateRevenue(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateRevenue(id, data);
  }

  @Delete('revenues/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRevenue(@Param('id') id: string) {
    return this.financeService.deleteRevenue(id);
  }

  // --- EXPENSES ---

  @Get('expenses')
  async findAllExpenses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.findAllExpenses({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('expenses/:id')
  async findOneExpense(@Param('id') id: string) {
    return this.financeService.findOneExpense(id);
  }

  @Post('expenses')
  async createExpense(@Body() data: any) {
    return this.financeService.createExpense(data);
  }

  @Put('expenses/:id')
  async updateExpense(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateExpense(id, data);
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }

  // --- DASHBOARD & REPORTS ---

  @Get('dashboard/financial-summary')
  async getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getFinancialSummary({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('reports/profit-loss')
  async getProfitLossReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getProfitLossReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}