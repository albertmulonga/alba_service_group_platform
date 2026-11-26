import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== SERVICES D'IMPRESSION ====================

  async createPrintService(data: {
    name: string;
    description?: string;
    category: string;
    basePrice?: number;
  }) {
    const prisma = this.prisma as any;
    return prisma.printService.create({ data });
  }

  async findAllPrintServices() {
    const prisma = this.prisma as any;
    return prisma.printService.findMany({
      include: { _count: { select: { printOrders: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOnePrintService(id: string) {
    const prisma = this.prisma as any;
    const service = await prisma.printService.findUnique({
      where: { id },
      include: { printOrders: true },
    });
    if (!service) throw new NotFoundException('Service d\'impression introuvable');
    return service;
  }

  async updatePrintService(
    id: string,
    data: {
      name?: string;
      description?: string;
      category?: string;
      basePrice?: number;
      isActive?: boolean;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOnePrintService(id);
    return prisma.printService.update({ where: { id }, data });
  }

  async deletePrintService(id: string) {
    const prisma = this.prisma as any;
    await this.findOnePrintService(id);

    const ordersCount = await prisma.printOrder.count({ where: { serviceId: id } });
    if (ordersCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce service car il est lié à des commandes',
      );
    }

    return prisma.printService.delete({ where: { id } });
  }

  // ==================== COMMANDES D'IMPRESSION ====================

  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `IMP-${timestamp}-${random}`;
  }

  private readonly ORDER_FLOW = [
    'PENDING',
    'DESIGN',
    'VALIDATION',
    'PRODUCTION',
    'QUALITY_CONTROL',
    'FINISHED',
    'DELIVERED',
  ];

  async createPrintOrder(data: {
    customerId: string;
    serviceId?: string;
    description: string;
    quantity: number;
    pages?: number;
    paperType?: string;
    paperSize?: string;
    colorMode?: string;
    finishing?: string;
    designProvided?: boolean;
    filePath?: string;
    notes?: string;
    subtotal?: number;
    taxAmount?: number;
    discount?: number;
    total?: number;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    dueDate?: string;
  }) {
    const prisma = this.prisma as any;

    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) throw new NotFoundException('Client introuvable');

    if (data.quantity <= 0) {
      throw new BadRequestException('La quantité doit être supérieure à zéro');
    }

    const reference = this.generateReference();

    return prisma.printOrder.create({
      data: {
        reference,
        customerId: data.customerId,
        serviceId: data.serviceId,
        description: data.description,
        quantity: data.quantity,
        pages: data.pages,
        paperType: data.paperType,
        paperSize: data.paperSize,
        colorMode: data.colorMode,
        finishing: data.finishing,
        designProvided: data.designProvided ?? false,
        filePath: data.filePath,
        notes: data.notes,
        subtotal: data.subtotal ?? 0,
        taxAmount: data.taxAmount ?? 0,
        discount: data.discount ?? 0,
        total: data.total ?? 0,
        priority: data.priority ?? 'NORMAL',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        orderedAt: new Date(),
      },
      include: { customer: true, service: true },
    });
  }

  async findAllPrintOrders(filters?: {
    customerId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const prisma = this.prisma as any;
    const where: any = {};

    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.printOrder.findMany({
      where,
      include: {
        customer: true,
        service: true,
        productionSteps: true,
        items: true,
        delivery: true,
      },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async findOnePrintOrder(id: string) {
    const prisma = this.prisma as any;
    const order = await prisma.printOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        items: true,
        productionSteps: { orderBy: { createdAt: 'asc' } },
        delivery: true,
        designProjects: { include: { files: true } },
      },
    });
    if (!order) throw new NotFoundException('Commande d\'impression introuvable');
    return order;
  }

  async updatePrintOrder(
    id: string,
    data: {
      serviceId?: string;
      description?: string;
      quantity?: number;
      pages?: number;
      paperType?: string;
      paperSize?: string;
      colorMode?: string;
      finishing?: string;
      designProvided?: boolean;
      filePath?: string;
      notes?: string;
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      total?: number;
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      dueDate?: string;
      assignedTo?: string;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOnePrintOrder(id);

    const updateData: any = { ...data };
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    return prisma.printOrder.update({
      where: { id },
      data: updateData,
      include: { customer: true, service: true },
    });
  }

  async deletePrintOrder(id: string) {
    const prisma = this.prisma as any;
    await this.findOnePrintOrder(id);
    return prisma.printOrder.delete({ where: { id } });
  }

  // ==================== WORKFLOW STATUS ====================

  async updatePrintOrderStatus(id: string, newStatus: string) {
    const prisma = this.prisma as any;
    const order = await this.findOnePrintOrder(id);

    const currentIndex = this.ORDER_FLOW.indexOf(order.status);
    const newIndex = this.ORDER_FLOW.indexOf(newStatus);

    if (newIndex === -1) {
      throw new BadRequestException(`Statut "${newStatus}" invalide`);
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new BadRequestException(
        `Impossible de modifier le statut d\'une commande "${order.status.toLowerCase()}"`,
      );
    }

    // Allow going forward or one step back (for corrections)
    if (newIndex < currentIndex - 1) {
      throw new BadRequestException(
        `Transition invalide: impossible de passer de "${order.status}" à "${newStatus}"`,
      );
    }

    const updateData: any = { status: newStatus };

    // Track timestamps
    if (newStatus === 'PRODUCTION' && !order.startedAt) {
      updateData.startedAt = new Date();
    }
    if (newStatus === 'FINISHED') {
      updateData.completedAt = new Date();
    }
    if (newStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    // Create production step tracking
    if (newStatus !== order.status) {
      await prisma.productionStep.create({
        data: {
          orderId: id,
          stepName: newStatus,
          status: 'completed',
          completedAt: new Date(),
          notes: `Transition de "${order.status}" vers "${newStatus}"`,
        },
      });
    }

    return prisma.printOrder.update({
      where: { id },
      data: updateData,
      include: { customer: true, service: true, productionSteps: true },
    });
  }

  // ==================== PRODUCTION STEPS ====================

  async getProductionSteps(orderId: string) {
    const prisma = this.prisma as any;
    await this.findOnePrintOrder(orderId);
    return prisma.productionStep.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addProductionStep(
    orderId: string,
    data: {
      stepName: string;
      assignedTo?: string;
      notes?: string;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOnePrintOrder(orderId);

    return prisma.productionStep.create({
      data: {
        orderId,
        stepName: data.stepName,
        status: 'in_progress',
        assignedTo: data.assignedTo,
        startedAt: new Date(),
        notes: data.notes,
      },
      include: { order: true },
    });
  }

  async completeProductionStep(stepId: string) {
    const prisma = this.prisma as any;
    const step = await prisma.productionStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException('Étape de production introuvable');

    if (step.status === 'completed') {
      throw new BadRequestException('Cette étape est déjà terminée');
    }

    return prisma.productionStep.update({
      where: { id: stepId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }

  // ==================== LIVRAISON ====================

  async deliverOrder(
    orderId: string,
    data: {
      deliveredTo?: string;
      receivedBy?: string;
      notes?: string;
      signature?: string;
    },
  ) {
    const prisma = this.prisma as any;
    const order = await this.findOnePrintOrder(orderId);

    if (order.status === 'DELIVERED') {
      throw new BadRequestException('Cette commande a déjà été livrée');
    }

    if (order.status !== 'FINISHED') {
      throw new BadRequestException(
        `La commande doit être terminée avant livraison (statut actuel: ${order.status})`,
      );
    }

    // Create delivery record
    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        deliveredTo: data.deliveredTo,
        receivedBy: data.receivedBy,
        notes: data.notes,
        signature: data.signature,
        deliveryDate: new Date(),
      },
    });

    // Update order status
    await prisma.printOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    return delivery;
  }
}