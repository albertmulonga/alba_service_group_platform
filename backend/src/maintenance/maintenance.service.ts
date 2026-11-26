import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createIntervention(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.supportTicket.create({
      data: {
        ...data,
        assignedTo: userId,
        description: data.description || data.subject || 'Intervention de maintenance',
      },
      include: { project: true },
    });
  }

  async findAllInterventions(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.search) where.subject = { contains: filters.search, mode: 'insensitive' };
    return prisma.supportTicket.findMany({ where, include: { project: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOneIntervention(id: string) {
    const prisma = this.prisma as any;
    return prisma.supportTicket.findUnique({ where: { id }, include: { project: true } });
  }

  async updateIntervention(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.supportTicket.update({ where: { id }, data: { ...data, assignedTo: userId }, include: { project: true } });
  }

  async removeIntervention(id: string) {
    const prisma = this.prisma as any;
    return prisma.supportTicket.delete({ where: { id } });
  }

  async createEquipment(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceContract.create({
      data: {
        projectId: data.projectId,
        customerId: data.customerId,
        type: data.type || 'yearly',
        amount: data.amount || 0,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : new Date(),
        status: data.status || 'active',
        notes: data.notes || data.description,
      },
    });
  }

  async findAllEquipments(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) where.notes = { contains: filters.search, mode: 'insensitive' };
    return prisma.maintenanceContract.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOneEquipment(id: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceContract.findUnique({ where: { id } });
  }

  async updateEquipment(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceContract.update({
      where: { id },
      data: {
        type: data.type,
        amount: data.amount,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
        notes: data.notes || data.description,
      },
    });
  }

  async removeEquipment(id: string) {
    const prisma = this.prisma as any;
    return prisma.maintenanceContract.delete({ where: { id } });
  }
}
