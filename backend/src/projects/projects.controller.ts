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
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ========================
  // PROJETS
  // ========================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() data: any) {
    return this.projectsService.createProject(data);
  }

  @Get()
  async findAllProjects() {
    return this.projectsService.findAllProjects();
  }

  @Get(':id')
  async findOneProject(@Param('id') id: string) {
    return this.projectsService.findOneProject(id);
  }

  @Put(':id')
  async updateProject(@Param('id') id: string, @Body() data: any) {
    return this.projectsService.updateProject(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }

  // ========================
  // TÂCHES
  // ========================

  @Post(':projectId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async createTask(@Param('projectId') projectId: string, @Body() data: any) {
    return this.projectsService.createTask(projectId, data);
  }

  @Get(':projectId/tasks')
  async findAllTasks(@Param('projectId') projectId: string) {
    return this.projectsService.findAllTasks(projectId);
  }

  @Get(':projectId/tasks/:id')
  async findOneTask(@Param('id') id: string) {
    return this.projectsService.findOneTask(id);
  }

  @Put(':projectId/tasks/:id')
  async updateTask(@Param('id') id: string, @Body() data: any) {
    return this.projectsService.updateTask(id, data);
  }

  @Delete(':projectId/tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Param('id') id: string) {
    return this.projectsService.deleteTask(id);
  }

  // ========================
  // TICKETS
  // ========================

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Body() body: any) {
    return this.projectsService.createTicket(body.projectId || null, body.customerId || null, body);
  }

  @Get('tickets')
  async findAllTickets(
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.projectsService.findAllTickets(projectId, customerId);
  }

  @Get('tickets/:id')
  async findOneTicket(@Param('id') id: string) {
    return this.projectsService.findOneTicket(id);
  }

  @Patch('tickets/:id')
  async updateTicket(@Param('id') id: string, @Body() data: any) {
    return this.projectsService.updateTicket(id, data);
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTicket(@Param('id') id: string) {
    return this.projectsService.deleteTicket(id);
  }

  // ========================
  // VERSIONS
  // ========================

  @Post(':projectId/versions')
  @HttpCode(HttpStatus.CREATED)
  async createVersion(@Param('projectId') projectId: string, @Body() data: any) {
    return this.projectsService.createVersion(projectId, data);
  }

  @Get(':projectId/versions')
  async findAllVersions(@Param('projectId') projectId: string) {
    return this.projectsService.findAllVersions(projectId);
  }

  @Get(':projectId/versions/:id')
  async findOneVersion(@Param('id') id: string) {
    return this.projectsService.findOneVersion(id);
  }

  @Put(':projectId/versions/:id')
  async updateVersion(@Param('id') id: string, @Body() data: any) {
    return this.projectsService.updateVersion(id, data);
  }

  @Delete(':projectId/versions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVersion(@Param('id') id: string) {
    return this.projectsService.deleteVersion(id);
  }

  // ========================
  // DÉPLOIEMENTS
  // ========================

  @Post(':projectId/deployments')
  @HttpCode(HttpStatus.CREATED)
  async createDeployment(@Param('projectId') projectId: string, @Body() data: any) {
    return this.projectsService.createDeployment(projectId, data);
  }

  @Get(':projectId/deployments')
  async findAllDeployments(@Param('projectId') projectId: string) {
    return this.projectsService.findAllDeployments(projectId);
  }

  // ========================
  // SUIVI DU TEMPS
  // ========================

  @Post('time-tracking')
  @HttpCode(HttpStatus.CREATED)
  async createTimeEntry(@Body() data: any) {
    return this.projectsService.createTimeEntry(data);
  }

  @Get('time-tracking')
  async findAllTimeEntries(
    @Query('projectId') projectId?: string,
    @Query('taskId') taskId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.projectsService.findAllTimeEntries(projectId, taskId, userId);
  }

  @Get('time-tracking/:id')
  async findOneTimeEntry(@Param('id') id: string) {
    return this.projectsService.findOneTimeEntry(id);
  }

  @Put('time-tracking/:id')
  async updateTimeEntry(@Param('id') id: string, @Body() data: any) {
    return this.projectsService.updateTimeEntry(id, data);
  }

  @Delete('time-tracking/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimeEntry(@Param('id') id: string) {
    return this.projectsService.deleteTimeEntry(id);
  }
}