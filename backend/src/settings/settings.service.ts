import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const prisma = this.prisma as any;
    const company = await prisma.company.findFirst();
    const companyId = company?.id ?? 'global';
    return prisma.systemSetting.findMany({ where: { companyId } });
  }

  async findOne(key: string) {
    const prisma = this.prisma as any;
    const company = await prisma.company.findFirst();
    const companyId = company?.id ?? 'global';
    const setting = await prisma.systemSetting.findFirst({ where: { key, companyId } });
    if (!setting) throw new NotFoundException('Paramètre introuvable');
    return setting;
  }

  async update(key: string, value: string) {
    const prisma = this.prisma as any;
    const company = await prisma.company.findFirst();
    const companyId = company?.id ?? 'global';
    const existing = await prisma.systemSetting.findFirst({ where: { key, companyId } });

    if (existing) {
      return prisma.systemSetting.update({ where: { id: existing.id }, data: { value } });
    }

    return prisma.systemSetting.create({
      data: { key, value, type: 'string', module: 'general', companyId },
    });
  }
}
