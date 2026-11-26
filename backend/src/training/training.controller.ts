import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TrainingService } from './training.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('training')
@UseGuards(AuthGuard('jwt'))
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  async createCourse(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.trainingService.createCourse(body, userId);
  }

  @Get('courses')
  async findAllCourses(@Query() filters: any) {
    return this.trainingService.findAllCourses(filters);
  }

  @Get('courses/:id')
  async findOneCourse(@Param('id') id: string) {
    return this.trainingService.findOneCourse(id);
  }

  @Put('courses/:id')
  async updateCourse(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.trainingService.updateCourse(id, body, userId);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCourse(@Param('id') id: string) {
    return this.trainingService.removeCourse(id);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.trainingService.createSession(body, userId);
  }

  @Get('sessions')
  async findAllSessions(@Query() filters: any) {
    return this.trainingService.findAllSessions(filters);
  }

  @Get('sessions/:id')
  async findOneSession(@Param('id') id: string) {
    return this.trainingService.findOneSession(id);
  }

  @Put('sessions/:id')
  async updateSession(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.trainingService.updateSession(id, body, userId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSession(@Param('id') id: string) {
    return this.trainingService.removeSession(id);
  }
}
