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
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(AuthGuard('jwt'))
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // ==================== BONS DE COMMANDE ====================

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createPurchaseOrder(@Body() body: any) {
    return this.purchasesService.createPurchaseOrder(body);
  }

  @Get('orders')
  async findAllPurchaseOrders(
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.purchasesService.findAllPurchaseOrders({ supplierId, status, search });
  }

  @Get('orders/:id')
  async findOnePurchaseOrder(@Param('id') id: string) {
    return this.purchasesService.findOnePurchaseOrder(id);
  }

  @Put('orders/:id')
  async updatePurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchasesService.updatePurchaseOrder(id, body);
  }

  @Delete('orders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePurchaseOrder(@Param('id') id: string) {
    await this.purchasesService.deletePurchaseOrder(id);
  }

  @Post('orders/:id/receive')
  async receivePurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchasesService.receivePurchaseOrder(id, body);
  }

  // ==================== PAIEMENTS FOURNISSEUR ====================

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  async createPurchasePayment(@Body() body: any) {
    return this.purchasesService.createPurchasePayment(body);
  }

  @Get('payments')
  async findAllPurchasePayments(
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.purchasesService.findAllPurchasePayments({ purchaseOrderId, paymentMethod });
  }

  @Get('payments/:id')
  async findOnePurchasePayment(@Param('id') id: string) {
    return this.purchasesService.findOnePurchasePayment(id);
  }

  @Put('payments/:id')
  async updatePurchasePayment(@Param('id') id: string, @Body() body: any) {
    return this.purchasesService.updatePurchasePayment(id, body);
  }

  @Delete('payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePurchasePayment(@Param('id') id: string) {
    await this.purchasesService.deletePurchasePayment(id);
  }
}
