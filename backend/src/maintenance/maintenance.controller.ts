import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MaintenanceService } from './maintenance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('maintenance')
@UseGuards(AuthGuard('jwt'))
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('interventions')
  @HttpCode(HttpStatus.CREATED)
  async createIntervention(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.maintenanceService.createIntervention(body, userId);
  }

  @Get('interventions')
  async findAllInterventions(@Query() filters: any) {
    return this.maintenanceService.findAllInterventions(filters);
  }

  @Get('interventions/:id')
  async findOneIntervention(@Param('id') id: string) {
    return this.maintenanceService.findOneIntervention(id);
  }

  @Put('interventions/:id')
  async updateIntervention(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.maintenanceService.updateIntervention(id, body, userId);
  }

  @Delete('interventions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeIntervention(@Param('id') id: string) {
    return this.maintenanceService.removeIntervention(id);
  }

  @Post('equipments')
  @HttpCode(HttpStatus.CREATED)
  async createEquipment(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.maintenanceService.createEquipment(body, userId);
  }

  @Get('equipments')
  async findAllEquipments(@Query() filters: any) {
    return this.maintenanceService.findAllEquipments(filters);
  }

  @Get('equipments/:id')
  async findOneEquipment(@Param('id') id: string) {
    return this.maintenanceService.findOneEquipment(id);
  }

  @Put('equipments/:id')
  async updateEquipment(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.maintenanceService.updateEquipment(id, body, userId);
  }

  @Delete('equipments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEquipment(@Param('id') id: string) {
    return this.maintenanceService.removeEquipment(id);
  }
}
