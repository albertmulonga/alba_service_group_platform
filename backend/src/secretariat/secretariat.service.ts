import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SecretariatService {
  private readonly logger = new Logger(SecretariatService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createService(data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.printService.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category || data.type || 'GENERAL',
        basePrice: data.basePrice ?? data.price ?? null,
        isActive: data.isActive ?? true,
      },
      include: { printOrders: true },
    });
  }

  async findAllServices(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.type) where.category = filters.type;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive === 'true';
    return prisma.printService.findMany({ where, include: { printOrders: true } });
  }

  async findOneService(id: string) {
    const prisma = this.prisma as any;
    return prisma.printService.findUnique({ where: { id }, include: { printOrders: true } });
  }

  async updateService(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    return prisma.printService.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category || data.type,
        basePrice: data.basePrice ?? data.price ?? undefined,
        isActive: data.isActive,
      },
      include: { printOrders: true },
    });
  }

  async removeService(id: string) {
    const prisma = this.prisma as any;
    return prisma.printService.delete({ where: { id } });
  }

  async createOrder(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `ORD-${Date.now().toString(36).toUpperCase()}`;
    const customerId = data.customerId || (await prisma.customer.findFirst())?.id || (await prisma.customer.create({ data: { firstName: 'Client', lastName: 'Par défaut', phone: '', category: 'INDIVIDUAL', status: 'ACTIVE', registeredAt: new Date() } })).id;
    const serviceId = data.serviceId || (await prisma.printService.findFirst())?.id;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    return prisma.printOrder.create({
      data: {
        reference,
        customerId,
        serviceId,
        description: data.description || 'Commande de secrétariat',
        quantity: data.quantity || 1,
        pages: data.pages,
        paperType: data.paperType,
        paperSize: data.paperSize,
        colorMode: data.colorMode,
        finishing: data.finishing,
        designProvided: data.designProvided ?? false,
        filePath: data.filePath,
        notes: data.notes,
        subtotal,
        taxAmount: totalTax,
        discount: data.discount ?? 0,
        total,
        priority: data.priority ?? 'NORMAL',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assignedTo: data.assignedTo,
        items: data.items ? { create: data.items.map((item: any) => ({ ...item, total: item.quantity * item.unitPrice })) } : undefined,
      },
      include: { customer: true, service: true, items: true },
    });
  }

  async findAllOrders(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) where.description = { contains: filters.search, mode: 'insensitive' };
    return prisma.printOrder.findMany({ where, include: { customer: true, service: true, items: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOneOrder(id: string) {
    const prisma = this.prisma as any;
    return prisma.printOrder.findUnique({ where: { id }, include: { customer: true, service: true, items: true } });
  }

  async updateOrder(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    return prisma.printOrder.update({
      where: { id },
      data: {
        ...data,
        subtotal,
        taxAmount: totalTax,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        items: data.items ? { create: data.items.map((item: any) => ({ ...item, total: item.quantity * item.unitPrice })) } : undefined,
      },
      include: { customer: true, service: true, items: true },
    });
  }

  async removeOrder(id: string) {
    const prisma = this.prisma as any;
    return prisma.printOrder.delete({ where: { id } });
  }
}
