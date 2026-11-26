import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.calendarEvent.create({
      data: {
        title: data.title || data.subject || 'Nouvel événement',
        description: data.description || data.notes,
        type: data.type || 'OTHER',
        startDate: data.startDate ? new Date(data.startDate) : (data.date ? new Date(data.date) : new Date()),
        endDate: data.endDate ? new Date(data.endDate) : (data.date ? new Date(new Date(data.date).getTime() + 60 * 60 * 1000) : undefined),
        allDay: data.allDay ?? false,
        location: data.location,
        color: data.color,
        createdBy: userId,
        relatedId: data.relatedId || data.customerId,
        relatedType: data.relatedType,
        status: data.status || 'confirmed',
      },
      include: { attendees: true },
    });
  }

  async findAllEvents(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) where.title = { contains: filters.search, mode: 'insensitive' };
    if (filters?.startDate) where.startDate = { gte: new Date(filters.startDate) };
    if (filters?.endDate) where.endDate = { lte: new Date(filters.endDate) };
    return prisma.calendarEvent.findMany({ where, include: { attendees: true }, orderBy: { startDate: 'asc' } });
  }

  async findOneEvent(id: string) {
    const prisma = this.prisma as any;
    return prisma.calendarEvent.findUnique({ where: { id }, include: { attendees: true } });
  }

  async updateEvent(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        allDay: data.allDay,
        location: data.location,
        color: data.color,
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        status: data.status,
      },
      include: { attendees: true },
    });
  }

  async removeEvent(id: string) {
    const prisma = this.prisma as any;
    return prisma.calendarEvent.delete({ where: { id } });
  }
}
