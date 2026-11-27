import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(data: any, userId: string) {
    const prisma = this.prisma as any;
    if (!data.code) {
      const last = await prisma.customer.findFirst({ orderBy: { createdAt: 'desc' } });
      data.code = `CLI-${Date.now().toString().slice(-6)}`;
    }
    if (data.code && (await prisma.customer.findUnique({ where: { code: data.code } }))) {
      throw new BadRequestException('Code client déjà utilisé');
    }
    const customer = await prisma.customer.create({
      data: {
        ...data,
        registeredAt: data.registeredAt ? new Date(data.registeredAt) : new Date(),
      },
      include: { branch: true, contacts: true, addresses: true },
    });
    await prisma.customerActivity.create({
      data: { customerId: customer.id, userId, type: 'call', description: 'Création du client' },
    });
    await this.notifications.notifyEmployees({
      eventType: 'CUSTOMER_REGISTERED',
      eventId: customer.id,
      title: 'Nouveau client enregistré',
      content: `${customer.firstName} ${customer.lastName} (${customer.code}) vient d’être enregistré.`,
      module: 'Clients',
      link: '/clients',
      type: 'info',
    });
    return customer;
  }

  async findAll(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const page = filters?.page ? parseInt(filters.page, 10) : 1;
    const limit = filters?.limit ? parseInt(filters.limit, 10) : 20;
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, skip: (page - 1) * limit, take: limit, include: { branch: true } }),
      prisma.customer.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const prisma = this.prisma as any;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { branch: true, contacts: true, addresses: true, documents: true },
    });
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }

  async update(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: { branch: true, contacts: true, addresses: true },
    });
    await prisma.customerActivity.create({
      data: { customerId: id, userId, type: 'meeting', description: 'Mise à jour client' },
    });
    return customer;
  }

  async remove(id: string) {
    const prisma = this.prisma as any;
    await this.findOne(id);
    await prisma.customer.update({ where: { id }, data: { status: 'BLACKLISTED' } });
  }

  async createContact(customerId: string, data: any) {
    const prisma = this.prisma as any;
    await this.findOne(customerId);
    return prisma.customerContact.create({ data: { ...data, customerId }, include: { customer: true } });
  }

  async findActivities(customerId: string, limit: number) {
    const prisma = this.prisma as any;
    await this.findOne(customerId);
    return prisma.customerActivity.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
  }

  async createActivity(customerId: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOne(customerId);
    return prisma.customerActivity.create({ data: { ...data, customerId, userId } });
  }
}
