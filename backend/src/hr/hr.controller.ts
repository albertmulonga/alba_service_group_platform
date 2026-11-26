import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HrService } from './hr.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('hr')
@UseGuards(AuthGuard('jwt'))
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // --- EMPLOYEES ---

  @Get('employees')
  async findAllEmployees(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.hrService.findAllEmployees({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      departmentId,
    });
  }

  @Get('employees/:id')
  async findOneEmployee(@Param('id') id: string) {
    return this.hrService.findOneEmployee(id);
  }

  @Post('employees')
  async createEmployee(@Body() data: any) {
    return this.hrService.createEmployee(data);
  }

  @Put('employees/:id')
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    return this.hrService.updateEmployee(id, data);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmployee(@Param('id') id: string) {
    return this.hrService.deleteEmployee(id);
  }

  // --- CONTRACTS ---

  @Get('employees/:employeeId/contracts')
  async findAllContracts(@Param('employeeId') employeeId: string) {
    return this.hrService.findAllContracts(employeeId);
  }

  @Get('employees/:employeeId/contracts/:id')
  async findOneContract(
    @Param('employeeId') employeeId: string,
    @Param('id') id: string,
  ) {
    return this.hrService.findOneContract(employeeId, id);
  }

  @Post('employees/:employeeId/contracts')
  async createContract(
    @Param('employeeId') employeeId: string,
    @Body() data: any,
  ) {
    return this.hrService.createContract(employeeId, data);
  }

  @Put('employees/:employeeId/contracts/:id')
  async updateContract(
    @Param('employeeId') employeeId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.hrService.updateContract(employeeId, id, data);
  }

  @Delete('employees/:employeeId/contracts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContract(
    @Param('employeeId') employeeId: string,
    @Param('id') id: string,
  ) {
    return this.hrService.deleteContract(employeeId, id);
  }

  // --- ATTENDANCE ---

  @Get('employees/:employeeId/attendance')
  async findAllAttendance(
    @Param('employeeId') employeeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.findAllAttendance(employeeId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Post('employees/:employeeId/attendance')
  async createAttendance(
    @Param('employeeId') employeeId: string,
    @Body() data: any,
  ) {
    return this.hrService.createAttendance(employeeId, data);
  }

  @Put('employees/:employeeId/attendance/:id')
  async updateAttendance(
    @Param('employeeId') employeeId: string,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.hrService.updateAttendance(employeeId, id, data);
  }

  @Delete('employees/:employeeId/attendance/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttendance(
    @Param('employeeId') employeeId: string,
    @Param('id') id: string,
  ) {
    return this.hrService.deleteAttendance(employeeId, id);
  }

  // --- LEAVES ---

  @Get('leaves')
  async findAllLeaves(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.hrService.findAllLeaves({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      employeeId,
    });
  }

  @Get('leaves/:id')
  async findOneLeave(@Param('id') id: string) {
    return this.hrService.findOneLeave(id);
  }

  @Post('leaves')
  async createLeave(@Body() data: any) {
    return this.hrService.createLeave(data);
  }

  @Post('leaves/:id/approve')
  async approveLeave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.hrService.approveLeave(id, userId);
  }

  @Post('leaves/:id/reject')
  async rejectLeave(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('notes') notes?: string,
  ) {
    return this.hrService.rejectLeave(id, userId, notes);
  }

  @Delete('leaves/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLeave(@Param('id') id: string) {
    return this.hrService.deleteLeave(id);
  }

  // --- SALARIES ---

  @Get('salaries/my')
  async findMySalaries(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.findMySalaries(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Post('salaries/:id/confirm')
  async confirmSalary(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.hrService.confirmSalary(id, userId);
  }

  @Get('salaries')
  async findAllSalaries(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.findAllSalaries({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      employeeId,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  @Get('salaries/:id')
  async findOneSalary(@Param('id') id: string) {
    return this.hrService.findOneSalary(id);
  }

  @Post('salaries')
  async createSalary(@Body() data: any) {
    return this.hrService.createSalary(data);
  }

  @Put('salaries/:id')
  async updateSalary(@Param('id') id: string, @Body() data: any) {
    return this.hrService.updateSalary(id, data);
  }

  @Post('salaries/:id/pay')
  async paySalary(@Param('id') id: string, @Body() data?: any) {
    return this.hrService.paySalary(id, data);
  }

  @Delete('salaries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSalary(@Param('id') id: string) {
    return this.hrService.deleteSalary(id);
  }
}