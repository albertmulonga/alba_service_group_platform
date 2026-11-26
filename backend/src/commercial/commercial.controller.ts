import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommercialService } from './commercial.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('commercial')
@UseGuards(AuthGuard('jwt'))
export class CommercialController {
  constructor(private readonly commercialService: CommercialService) {}

  @Post('quotes')
  @HttpCode(HttpStatus.CREATED)
  async createQuote(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.commercialService.createQuote(body, userId);
  }

  @Get('quotes')
  async findAllQuotes(@Query() filters: any) {
    return this.commercialService.findAllQuotes(filters);
  }

  @Get('quotes/:id')
  async findOneQuote(@Param('id') id: string) {
    return this.commercialService.findOneQuote(id);
  }

  @Put('quotes/:id')
  async updateQuote(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.commercialService.updateQuote(id, body, userId);
  }

  @Post('quotes/:id/convert')
  async convertQuote(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.commercialService.convertQuote(id, userId);
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.commercialService.createOrder(body, userId);
  }

  @Get('orders')
  async findAllOrders(@Query() filters: any) {
    return this.commercialService.findAllOrders(filters);
  }

  @Get('orders/:id')
  async findOneOrder(@Param('id') id: string) {
    return this.commercialService.findOneOrder(id);
  }

  @Put('orders/:id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.commercialService.updateOrderStatus(id, body.status);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.commercialService.createInvoice(body, userId);
  }

  @Get('invoices')
  async findAllInvoices(@Query() filters: any) {
    return this.commercialService.findAllInvoices(filters);
  }

  @Get('invoices/:id')
  async findOneInvoice(@Param('id') id: string) {
    return this.commercialService.findOneInvoice(id);
  }

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.commercialService.createPayment(body, userId);
  }

  @Get('payments')
  async findAllPayments(@Query('invoiceId') invoiceId?: string) {
    return this.commercialService.findAllPayments(invoiceId);
  }
}
