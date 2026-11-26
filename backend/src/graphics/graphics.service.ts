import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GraphicsService {
  private readonly logger = new Logger(GraphicsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createProject(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.designProject.create({ data: { ...data, designerId: userId }, include: { order: true, files: true } });
  }

  async findAllProjects(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) where.name = { contains: filters.search, mode: 'insensitive' };
    return prisma.designProject.findMany({ where, include: { order: true, files: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOneProject(id: string) {
    const prisma = this.prisma as any;
    return prisma.designProject.findUnique({ where: { id }, include: { order: true, files: true } });
  }

  async updateProject(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.designProject.update({ where: { id }, data: { ...data, designerId: userId }, include: { order: true, files: true } });
  }

  async removeProject(id: string) {
    const prisma = this.prisma as any;
    return prisma.designProject.delete({ where: { id } });
  }
}
