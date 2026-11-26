import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('customers')
@UseGuards(AuthGuard('jwt'))
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.customersService.create(body, userId);
  }

  @Get()
  async findAll(@Query() filters: any) {
    return this.customersService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.customersService.update(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
  }

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  async createContact(@Param('id') id: string, @Body() body: any) {
    return this.customersService.createContact(id, body);
  }

  @Get(':id/activities')
  async findActivities(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.customersService.findActivities(id, limit ? parseInt(limit, 10) : 20);
  }

  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  async createActivity(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.customersService.createActivity(id, body, userId);
  }
}
