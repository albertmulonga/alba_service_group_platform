import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId: string) {
    const prisma = this.prisma as any;
    let branchId = data.branchId || (await this.getDefaultBranch())?.id;
    if (!branchId) {
      const companyId = data.companyId || (await this.getDefaultCompany())?.id;
      const branch = await prisma.branch.create({ data: { name: 'Agence principale', companyId: companyId || 'default', address: '', city: '', phone: '', email: '', isHead: true } });
      branchId = branch.id;
    }
    if (!data.code) {
      data.code = `DEPT-${Date.now().toString().slice(-6)}`;
    }
    const department = await prisma.department.create({
      data: { ...data, branchId, companyId: data.companyId || (await this.getDefaultCompany())?.id },
      include: { branch: true, company: true, users: true, employees: true },
    });
    await prisma.activityLog.create({ data: { userId, action: 'create', module: 'departments', entityId: department.id, entityType: 'department', description: `Création du département ${department.name}` } });
    return department;
  }

  async findAll(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.search) where.name = { contains: filters.search, mode: 'insensitive' };
    return prisma.department.findMany({ where, include: { branch: true, company: true, _count: { select: { users: true, employees: true } } }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const prisma = this.prisma as any;
    const department = await prisma.department.findUnique({ where: { id }, include: { branch: true, company: true, users: true, employees: true } });
    if (!department) throw new NotFoundException('Département introuvable');
    return department;
  }

  async update(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    const department = await prisma.department.update({ where: { id }, data, include: { branch: true, company: true, users: true, employees: true } });
    await prisma.activityLog.create({ data: { userId, action: 'update', module: 'departments', entityId: id, entityType: 'department', description: `Mise à jour du département ${department.name}` } });
    return department;
  }

  async remove(id: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    const usersCount = await prisma.user.count({ where: { departmentId: id } });
    if (usersCount > 0) throw new BadRequestException('Impossible de supprimer ce département car il contient des utilisateurs');
    return prisma.department.delete({ where: { id } });
  }

  private async getDefaultBranch() {
    const prisma = this.prisma as any;
    return prisma.branch.findFirst();
  }

  private async getDefaultCompany() {
    const prisma = this.prisma as any;
    return prisma.company.findFirst();
  }
}
