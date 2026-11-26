
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgendaService } from './agenda.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('agenda')
@UseGuards(AuthGuard('jwt'))
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.agendaService.createEvent(body, userId);
  }

  @Get('events')
  async findAllEvents(@Query() filters: any) {
    return this.agendaService.findAllEvents(filters);
  }

  @Get('events/:id')
  async findOneEvent(@Param('id') id: string) {
    return this.agendaService.findOneEvent(id);
  }

  @Put('events/:id')
  async updateEvent(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.agendaService.updateEvent(id, body, userId);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(@Param('id') id: string) {
    return this.agendaService.removeEvent(id);
  }
}
