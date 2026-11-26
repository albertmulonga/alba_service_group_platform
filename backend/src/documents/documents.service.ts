import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, userId: string) {
    const prisma = this.prisma as any;
    const categoryId = data.categoryId || (await this.getOrCreateRootCategory());
    return prisma.document.create({
      data: {
        ...data,
        categoryId,
        uploadedBy: userId,
        isArchived: data.isArchived ?? false,
      },
      include: { category: true },
    });
  }

  async findAll(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.isArchived !== undefined) where.isArchived = filters.isArchived === 'true';
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.document.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const prisma = this.prisma as any;
    const document = await prisma.document.findUnique({ where: { id }, include: { category: true, versions: true } });
    if (!document) throw new NotFoundException('Document introuvable');
    return document;
  }

  async update(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    return prisma.document.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { category: true },
    });
  }

  async remove(id: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    return prisma.document.update({ where: { id }, data: { isArchived: true } });
  }

  private async getOrCreateRootCategory() {
    const prisma = this.prisma as any;
    let category = await prisma.documentCategory.findFirst({ where: { parentId: null } });
    if (!category) {
      category = await prisma.documentCategory.create({
        data: { name: 'Général', slug: 'general', description: 'Catégorie racine' },
      });
    }
    return category.id;
  }
}
