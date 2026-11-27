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
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StockService } from './stock.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stock')
@UseGuards(AuthGuard('jwt'))
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ==================== CATÉGORIES ====================

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() body: { name: string; description?: string; parentId?: string }) {
    return this.stockService.createCategory(body);
  }

  @Get('categories')
  async findAllCategories() {
    return this.stockService.findAllCategories();
  }

  @Get('categories/:id')
  async findOneCategory(@Param('id') id: string) {
    return this.stockService.findOneCategory(id);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; parentId?: string },
  ) {
    return this.stockService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    await this.stockService.deleteCategory(id);
  }

  // ==================== PRODUITS ====================

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body()
    body: {
      code: string;
      name: string;
      description?: string;
      categoryId?: string;
      unitId?: string;
      supplierId?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      minStock?: number;
      criticalStock?: number;
      maxStock?: number;
      currentStock?: number;
      barcode?: string;
      image?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.createProduct(body, userId);
  }

  @Get('products')
  async findAllProducts(
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.stockService.findAllProducts({
      categoryId,
      supplierId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      lowStock: lowStock === 'true',
    });
  }

  @Get('products/:id')
  async findOneProduct(@Param('id') id: string) {
    return this.stockService.findOneProduct(id);
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      code?: string;
      name?: string;
      description?: string;
      categoryId?: string;
      unitId?: string;
      supplierId?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      minStock?: number;
      criticalStock?: number;
      maxStock?: number;
      currentStock?: number;
      barcode?: string;
      image?: string;
      notes?: string;
      isActive?: boolean;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.updateProduct(id, body, userId);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    await this.stockService.deleteProduct(id);
  }

  // ==================== FOURNISSEURS ====================

  @Post('suppliers')
  @HttpCode(HttpStatus.CREATED)
  async createSupplier(
    @Body()
    body: {
      code: string;
      name: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      province?: string;
      country?: string;
      website?: string;
      taxId?: string;
      paymentTerms?: string;
      notes?: string;
    },
  ) {
    return this.stockService.createSupplier(body);
  }

  @Get('suppliers')
  async findAllSuppliers() {
    return this.stockService.findAllSuppliers();
  }

  @Get('suppliers/:id')
  async findOneSupplier(@Param('id') id: string) {
    return this.stockService.findOneSupplier(id);
  }

  @Put('suppliers/:id')
  async updateSupplier(
    @Param('id') id: string,
    @Body()
    body: {
      code?: string;
      name?: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      province?: string;
      country?: string;
      website?: string;
      taxId?: string;
      paymentTerms?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    return this.stockService.updateSupplier(id, body);
  }

  @Delete('suppliers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSupplier(@Param('id') id: string) {
    await this.stockService.deleteSupplier(id);
  }

  // ==================== MOUVEMENTS DE STOCK ====================

  @Post('stock-movements')
  @HttpCode(HttpStatus.CREATED)
  async createStockMovement(
    @Body()
    body: {
      productId: string;
      type: 'PURCHASE' | 'SALE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'PRODUCTION' | 'RETURN' | 'LOSS';
      quantity: number;
      unitPrice?: number;
      totalPrice?: number;
      locationId?: string;
      toLocationId?: string;
      reference?: string;
      notes?: string;
    },
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.createStockMovement({ ...body, userId });
  }

  @Get('stock-movements')
  async findAllStockMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stockService.findAllStockMovements({ productId, type, startDate, endDate });
  }

  // ==================== INVENTAIRE ====================

  @Post('inventory')
  @HttpCode(HttpStatus.CREATED)
  async createInventorySession(
    @Body() body: { type: 'full' | 'partial'; notes?: string },
  ) {
    return this.stockService.createInventorySession(body);
  }

  @Get('inventory')
  async findAllInventorySessions() {
    return this.stockService.findAllInventorySessions();
  }

  @Get('inventory/:id')
  async findOneInventorySession(@Param('id') id: string) {
    return this.stockService.findOneInventorySession(id);
  }

  @Post('inventory/:id/items')
  async addInventoryItem(
    @Param('id') id: string,
    @Body() body: { productId: string; actualQty: number; notes?: string },
  ) {
    return this.stockService.addInventoryItem(id, body);
  }

  @Post('inventory/:id/complete')
  async completeInventorySession(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.stockService.completeInventorySession(id, userId);
  }

  // ==================== ALERTES ====================

  @Get('alerts')
  async getStockAlerts(@Query('includeResolved') includeResolved?: string) {
    return this.stockService.getStockAlerts(includeResolved === 'true');
  }

  @Get('reports')
  async listStockReports(@Query('period') period?: string) {
    if (period && period !== 'DAILY' && period !== 'WEEKLY') {
      throw new BadRequestException('La période doit être DAILY ou WEEKLY.');
    }
    return this.stockService.listStockReports(period as 'DAILY' | 'WEEKLY' | undefined);
  }

  @Post('reports/:period/generate')
  async generateStockReport(
    @Param('period') period: string,
    @Query('startDate') startDate?: string,
  ) {
    if (period !== 'DAILY' && period !== 'WEEKLY') {
      throw new BadRequestException('La période doit être DAILY ou WEEKLY.');
    }
    return this.stockService.generateStockReport(period, startDate);
  }

  @Post('alerts/:id/resolve')
  async resolveStockAlert(@Param('id') id: string) {
    return this.stockService.resolveStockAlert(id);
  }

  // ==================== AJUSTEMENT ====================

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Body() body: { productId: string; newQuantity: number; reason: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.stockService.adjustStock({ ...body, userId });
  }
}