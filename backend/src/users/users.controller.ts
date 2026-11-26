import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Get()
  async findAll(@Query() filters: any) {
    return this.usersService.findAll(filters);
  }

  @Get('roles')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.usersService.update(id, body, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.usersService.assignRole(id, body.roleId);
  }

  @Post(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.resetPassword(id, body.newPassword);
  }
}
