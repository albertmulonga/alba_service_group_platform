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
import { PrintingService } from './printing.service';

@Controller('print')
@UseGuards(AuthGuard('jwt'))
export class PrintingController {
  constructor(private readonly printingService: PrintingService) {}

  // ==================== SERVICES D'IMPRESSION ====================

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  async createPrintService(
    @Body() body: { name: string; description?: string; category: string; basePrice?: number },
  ) {
    return this.printingService.createPrintService(body);
  }

  @Get('services')
  async findAllPrintServices() {
    return this.printingService.findAllPrintServices();
  }

  @Get('services/:id')
  async findOnePrintService(@Param('id') id: string) {
    return this.printingService.findOnePrintService(id);
  }

  @Put('services/:id')
  async updatePrintService(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      category?: string;
      basePrice?: number;
      isActive?: boolean;
    },
  ) {
    return this.printingService.updatePrintService(id, body);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrintService(@Param('id') id: string) {
    await this.printingService.deletePrintService(id);
  }

  // ==================== COMMANDES D'IMPRESSION ====================

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createPrintOrder(
    @Body() body: {
      customerId: string;
      serviceId?: string;
      description: string;
      quantity: number;
      pages?: number;
      paperType?: string;
      paperSize?: string;
      colorMode?: string;
      finishing?: string;
      designProvided?: boolean;
      filePath?: string;
      notes?: string;
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      total?: number;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      dueDate?: string;
    },
  ) {
    return this.printingService.createPrintOrder(body);
  }

  @Get('orders')
  async findAllPrintOrders(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.printingService.findAllPrintOrders({ customerId, status, priority, search });
  }

  @Get('orders/:id')
  async findOnePrintOrder(@Param('id') id: string) {
    return this.printingService.findOnePrintOrder(id);
  }

  @Put('orders/:id')
  async updatePrintOrder(
    @Param('id') id: string,
    @Body() body: {
      serviceId?: string;
      description?: string;
      quantity?: number;
      pages?: number;
      paperType?: string;
      paperSize?: string;
      colorMode?: string;
      finishing?: string;
      designProvided?: boolean;
      filePath?: string;
      notes?: string;
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      total?: number;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      dueDate?: string;
      assignedTo?: string;
    },
  ) {
    return this.printingService.updatePrintOrder(id, body);
  }

  @Put('orders/:id/status')
  async updatePrintOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.printingService.updatePrintOrderStatus(id, body.status);
  }

  @Delete('orders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrintOrder(@Param('id') id: string) {
    await this.printingService.deletePrintOrder(id);
  }

  // ==================== ÉTAPES DE PRODUCTION ====================

  @Get('orders/:id/production-steps')
  async getProductionSteps(@Param('id') id: string) {
    return this.printingService.getProductionSteps(id);
  }

  @Post('orders/:id/production-steps')
  @HttpCode(HttpStatus.CREATED)
  async addProductionStep(
    @Param('id') id: string,
    @Body() body: { stepName: string; assignedTo?: string; notes?: string },
  ) {
    return this.printingService.addProductionStep(id, body);
  }

  @Post('production-steps/:stepId/complete')
  @HttpCode(HttpStatus.OK)
  async completeProductionStep(@Param('stepId') stepId: string) {
    return this.printingService.completeProductionStep(stepId);
  }

  // ==================== LIVRAISON ====================

  @Post('orders/:id/delivery')
  @HttpCode(HttpStatus.CREATED)
  async deliverOrder(
    @Param('id') id: string,
    @Body() body: { deliveredTo?: string; receivedBy?: string; notes?: string; signature?: string },
  ) {
    return this.printingService.deliverOrder(id, body);
  }
}