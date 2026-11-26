import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ========================
  // PROJETS (SoftwareProject)
  // ========================

  async createProject(data: any) {
    const prisma = this.prisma as any;
    // Générer un code unique
    const count = await prisma.softwareProject.count();
    const code = `PROJ-${String(count + 1).padStart(4, '0')}`;
    return prisma.softwareProject.create({
      data: { ...data, code },
    });
  }

  async findAllProjects() {
    const prisma = this.prisma as any;
    return prisma.softwareProject.findMany({
      include: { members: true, tasks: true, tickets: true, versions: true },
    });
  }

  async findOneProject(id: string) {
    const prisma = this.prisma as any;
    const project = await prisma.softwareProject.findUnique({
      where: { id },
      include: {
        members: true,
        tasks: { include: { comments: true } },
        tickets: { include: { messages: true } },
        versions: true,
        deployments: true,
        documents: true,
      },
    });
    if (!project) throw new NotFoundException(`Projet ${id} introuvable`);
    return project;
  }

  async updateProject(id: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneProject(id);
    return prisma.softwareProject.update({
      where: { id },
      data,
    });
  }

  async deleteProject(id: string) {
    const prisma = this.prisma as any;
    await this.findOneProject(id);
    return prisma.softwareProject.delete({ where: { id } });
  }

  // ========================
  // TÂCHES (ProjectTask)
  // ========================

  async createTask(projectId: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneProject(projectId);
    return prisma.projectTask.create({
      data: { ...data, projectId },
    });
  }

  async findAllTasks(projectId: string) {
    const prisma = this.prisma as any;
    return prisma.projectTask.findMany({
      where: { projectId },
      include: { comments: true, children: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTask(id: string) {
    const prisma = this.prisma as any;
    const task = await prisma.projectTask.findUnique({
      where: { id },
      include: { comments: true, children: true, parent: true },
    });
    if (!task) throw new NotFoundException(`Tâche ${id} introuvable`);
    return task;
  }

  async updateTask(id: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneTask(id);
    return prisma.projectTask.update({
      where: { id },
      data,
    });
  }

  async deleteTask(id: string) {
    const prisma = this.prisma as any;
    await this.findOneTask(id);
    return prisma.projectTask.delete({ where: { id } });
  }

  // ========================
  // TICKETS (SupportTicket) avec workflow OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED
  // ========================

  private readonly ticketWorkflow: Record<string, string[]> = {
    OPEN: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: ['REOPENED'],
    REOPENED: ['IN_PROGRESS'],
  };

  private validateTicketTransition(currentStatus: string, newStatus: string) {
    const allowed = this.ticketWorkflow[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transition impossible : statut ${currentStatus} -> ${newStatus} non autorisée`,
      );
    }
  }

  async createTicket(projectId: string | null, customerId: string | null, data: any) {
    const prisma = this.prisma as any;
    return prisma.supportTicket.create({
      data: {
        ...data,
        projectId: projectId || undefined,
        customerId: customerId || undefined,
        status: 'OPEN',
      },
    });
  }

  async findAllTickets(projectId?: string, customerId?: string) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    return prisma.supportTicket.findMany({
      where,
      include: { messages: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTicket(id: string) {
    const prisma = this.prisma as any;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: true, project: true, customer: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${id} introuvable`);
    return ticket;
  }

  async updateTicketStatus(id: string, newStatus: string) {
    const prisma = this.prisma as any;
    const ticket = await this.findOneTicket(id);
    this.validateTicketTransition(ticket.status, newStatus);
    const updateData: any = { status: newStatus };
    if (newStatus === 'RESOLVED') updateData.resolvedAt = new Date();
    if (newStatus === 'CLOSED') updateData.closedAt = new Date();
    return prisma.supportTicket.update({
      where: { id },
      data: updateData,
    });
  }

  async updateTicket(id: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneTicket(id);
    if (data.status) {
      return this.updateTicketStatus(id, data.status);
    }
    return prisma.supportTicket.update({ where: { id }, data });
  }

  async deleteTicket(id: string) {
    const prisma = this.prisma as any;
    await this.findOneTicket(id);
    return prisma.supportTicket.delete({ where: { id } });
  }

  // ========================
  // VERSIONS (SoftwareVersion)
  // ========================

  async createVersion(projectId: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneProject(projectId);
    return prisma.softwareVersion.create({
      data: { ...data, projectId },
    });
  }

  async findAllVersions(projectId: string) {
    const prisma = this.prisma as any;
    return prisma.softwareVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneVersion(id: string) {
    const prisma = this.prisma as any;
    const version = await prisma.softwareVersion.findUnique({ where: { id } });
    if (!version) throw new NotFoundException(`Version ${id} introuvable`);
    return version;
  }

  async updateVersion(id: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneVersion(id);
    return prisma.softwareVersion.update({ where: { id }, data });
  }

  async deleteVersion(id: string) {
    const prisma = this.prisma as any;
    await this.findOneVersion(id);
    return prisma.softwareVersion.delete({ where: { id } });
  }

  // ========================
  // DÉPLOIEMENTS (Deployment)
  // ========================

  async createDeployment(projectId: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneProject(projectId);
    return prisma.deployment.create({
      data: { ...data, projectId, status: 'pending' },
    });
  }

  async findAllDeployments(projectId: string) {
    const prisma = this.prisma as any;
    return prisma.deployment.findMany({
      where: { projectId },
      orderBy: { deployedAt: 'desc' },
    });
  }

  // ========================
  // SUIVI DU TEMPS (TimeTracking)
  // ========================

  async createTimeEntry(data: any) {
    const prisma = this.prisma as any;
    return prisma.timeTracking.create({ data });
  }

  async findAllTimeEntries(projectId?: string, taskId?: string, userId?: string) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (userId) where.userId = userId;
    return prisma.timeTracking.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOneTimeEntry(id: string) {
    const prisma = this.prisma as any;
    const entry = await prisma.timeTracking.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Entrée de temps ${id} introuvable`);
    return entry;
  }

  async updateTimeEntry(id: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOneTimeEntry(id);
    return prisma.timeTracking.update({ where: { id }, data });
  }

  async deleteTimeEntry(id: string) {
    const prisma = this.prisma as any;
    await this.findOneTimeEntry(id);
    return prisma.timeTracking.delete({ where: { id } });
  }
}