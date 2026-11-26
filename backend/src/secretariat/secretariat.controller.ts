import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecretariatService } from './secretariat.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('secretariat')
@UseGuards(AuthGuard('jwt'))
export class SecretariatController {
  constructor(private readonly secretariatService: SecretariatService) {}

  @Post('services')
  @HttpCode(HttpStatus.CREATED)
  async createService(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.secretariatService.createService(body, userId);
  }

  @Get('services')
  async findAllServices(@Query() filters: any) {
    return this.secretariatService.findAllServices(filters);
  }

  @Get('services/:id')
  async findOneService(@Param('id') id: string) {
    return this.secretariatService.findOneService(id);
  }

  @Put('services/:id')
  async updateService(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.secretariatService.updateService(id, body, userId);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeService(@Param('id') id: string) {
    return this.secretariatService.removeService(id);
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.secretariatService.createOrder(body, userId);
  }

  @Get('orders')
  async findAllOrders(@Query() filters: any) {
    return this.secretariatService.findAllOrders(filters);
  }

  @Get('orders/:id')
  async findOneOrder(@Param('id') id: string) {
    return this.secretariatService.findOneOrder(id);
  }

  @Put('orders/:id')
  async updateOrder(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.secretariatService.updateOrder(id, body, userId);
  }

  @Delete('orders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOrder(@Param('id') id: string) {
    return this.secretariatService.removeOrder(id);
  }
}
