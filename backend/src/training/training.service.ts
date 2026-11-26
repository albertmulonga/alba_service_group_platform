import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createCourse(data: any, userId: string) {
    const prisma = this.prisma as any;
    if (!data.code) {
      data.code = `TRAIN-${Date.now().toString(36).toUpperCase()}`;
    }
    const existing = await prisma.trainingCourse.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Code formation déjà utilisé');
    return prisma.trainingCourse.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        duration: Number(data.duration || data.durationHours || 0),
        price: data.price ? parseFloat(data.price) : undefined,
        maxStudents: data.maxStudents ? parseInt(data.maxStudents) : undefined,
        prerequisites: data.prerequisites,
        objectives: data.objectives,
        program: data.program,
        isActive: data.isActive ?? true,
      },
      include: { category: true, sessions: true },
    });
  }

  async findAllCourses(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive === 'true';
    if (filters?.search) where.name = { contains: filters.search, mode: 'insensitive' };
    return prisma.trainingCourse.findMany({ where, include: { category: true, sessions: true } });
  }

  async findOneCourse(id: string) {
    const prisma = this.prisma as any;
    return prisma.trainingCourse.findUnique({ where: { id }, include: { category: true, sessions: true } });
  }

  async updateCourse(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    const allowed = ['code', 'name', 'description', 'categoryId', 'duration', 'price', 'maxStudents', 'prerequisites', 'objectives', 'program', 'isActive'];
    const clean = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
    return prisma.trainingCourse.update({ where: { id }, data: clean, include: { category: true, sessions: true } });
  }

  async removeCourse(id: string) {
    const prisma = this.prisma as any;
    return prisma.trainingCourse.delete({ where: { id } });
  }

  async createSession(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.trainingSession.create({ data, include: { course: true, trainer: true, enrollments: true } });
  }

  async findAllSessions(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.courseId) where.courseId = filters.courseId;
    if (filters?.status) where.status = filters.status;
    return prisma.trainingSession.findMany({ where, include: { course: true, trainer: true, enrollments: true } });
  }

  async findOneSession(id: string) {
    const prisma = this.prisma as any;
    return prisma.trainingSession.findUnique({ where: { id }, include: { course: true, trainer: true, enrollments: true } });
  }

  async updateSession(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.trainingSession.update({ where: { id }, data, include: { course: true, trainer: true, enrollments: true } });
  }

  async removeSession(id: string) {
    const prisma = this.prisma as any;
    return prisma.trainingSession.delete({ where: { id } });
  }
}
