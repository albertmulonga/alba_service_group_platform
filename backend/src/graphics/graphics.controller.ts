import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GraphicsService } from './graphics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('graphics')
@UseGuards(AuthGuard('jwt'))
export class GraphicsController {
  constructor(private readonly graphicsService: GraphicsService) {}

  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.graphicsService.createProject(body, userId);
  }

  @Get('projects')
  async findAllProjects(@Query() filters: any) {
    return this.graphicsService.findAllProjects(filters);
  }

  @Get('projects/:id')
  async findOneProject(@Param('id') id: string) {
    return this.graphicsService.findOneProject(id);
  }

  @Put('projects/:id')
  async updateProject(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.graphicsService.updateProject(id, body, userId);
  }

  @Delete('projects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProject(@Param('id') id: string) {
    return this.graphicsService.removeProject(id);
  }
}
