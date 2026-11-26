import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== BON DE COMMANDE (Purchase Order) ====================

  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ACH-${timestamp}-${random}`;
  }

  async createPurchaseOrder(data: {
    reference?: string;
    supplierId: string;
    orderDate?: string;
    expectedDeliveryDate?: string;
    status?: string;
    paymentTerms?: string;
    deliveryAddress?: string;
    notes?: string;
    subtotal?: number;
    taxAmount?: number;
    discount?: number;
    total?: number;
    currency?: string;
    exchangeRate?: number;
    items?: Array<{
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
      totalLine?: number;
    }>;
  }) {
    const prisma = this.prisma as any;

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');

    const reference = data.reference || this.generateReference();

    // Calculate totals from items if not provided
    let subtotal = data.subtotal ?? 0;
    let taxAmount = data.taxAmount ?? 0;
    let discount = data.discount ?? 0;
    let total = data.total ?? 0;

    if (data.items && data.items.length > 0) {
      subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const totalTax = data.items.reduce((sum, item) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
      const totalDiscount = data.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
      taxAmount = totalTax;
      discount = totalDiscount;
      total = subtotal + totalTax - totalDiscount;
    }

    return prisma.purchaseOrder.create({
      data: {
        reference,
        supplierId: data.supplierId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
        status: data.status ?? 'PENDING',
        paymentTerms: data.paymentTerms,
        deliveryAddress: data.deliveryAddress,
        notes: data.notes,
        subtotal,
        taxAmount,
        discount,
        total,
        currency: data.currency ?? 'EUR',
        exchangeRate: data.exchangeRate ?? 1,
        items: data.items ? {
          create: data.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0,
            discount: item.discount ?? 0,
            totalLine: item.totalLine ?? (item.quantity * item.unitPrice),
          })),
        } : undefined,
      },
      include: {
        supplier: true,
        items: true,
        purchasePayments: true,
        receipts: true,
      },
    });
  }

  async findAllPurchaseOrders(filters?: {
    supplierId?: string;
    status?: string;
    search?: string;
  }) {
    const prisma = this.prisma as any;
    const where: any = {};

    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: true,
        purchasePayments: true,
        receipts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePurchaseOrder(id: string) {
    const prisma = this.prisma as any;
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        purchasePayments: true,
        receipts: { include: { items: { include: { product: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Bon de commande introuvable');
    return order;
  }

  async updatePurchaseOrder(
    id: string,
    data: {
      expectedDeliveryDate?: string;
      status?: string;
      paymentTerms?: string;
      deliveryAddress?: string;
      notes?: string;
      subtotal?: number;
      taxAmount?: number;
      discount?: number;
      total?: number;
      currency?: string;
      exchangeRate?: number;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOnePurchaseOrder(id);

    const updateData: any = { ...data };
    if (data.expectedDeliveryDate) updateData.expectedDeliveryDate = new Date(data.expectedDeliveryDate);

    return prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { supplier: true, items: true, purchasePayments: true },
    });
  }

  async deletePurchaseOrder(id: string) {
    const prisma = this.prisma as any;
    await this.findOnePurchaseOrder(id);

    // Check if any received items exist
    const receiptCount = await prisma.purchaseReceipt.count({ where: { orderId: id } });
    if (receiptCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce bon de commande car des articles ont déjà été reçus',
      );
    }

    // Delete related items first
    await prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });
    await prisma.purchasePayment.deleteMany({ where: { orderId: id } });

    return prisma.purchaseOrder.delete({ where: { id } });
  }

  // ==================== RÉCEPTION DE COMMANDE ====================

  async receivePurchaseOrder(
    id: string,
    data: {
      items: Array<{
        productId: string;
        quantityReceived: number;
        notes?: string;
      }>;
      receivingNotes?: string;
    },
  ) {
    const prisma = this.prisma as any;
    const order = await this.findOnePurchaseOrder(id);

    if (order.status === 'RECEIVED' || order.status === 'CANCELLED') {
      throw new BadRequestException(
        `Impossible de recevoir une commande "${order.status.toLowerCase()}"`,
      );
    }

    // Process each received item
    for (const item of data.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Produit "${item.productId}" introuvable`);

      if (item.quantityReceived <= 0) {
        throw new BadRequestException(`La quantité reçue pour "${product.name}" doit être positive`);
      }

      await prisma.purchaseReceipt.create({
        data: {
          orderId: id,
          reference: `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          notes: item.notes,
          items: {
            create: {
              productId: item.productId,
              quantityReceived: item.quantityReceived,
              notes: item.notes,
            },
          },
        },
        include: { items: true },
      });

      await prisma.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantityReceived } },
      });
    }

    // Update order status
    const updateData: any = {
      status: 'RECEIVED',
      receivedAt: new Date(),
    };
    if (data.receivingNotes) updateData.notes = data.receivingNotes;

    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedDate: new Date(),
        notes: data.receivingNotes ? `${order.notes || ''}\n${data.receivingNotes}` : undefined,
      },
      include: {
        supplier: true,
        items: true,
        receipts: true,
        purchasePayments: true,
      },
    });
  }

  // ==================== PAIEMENTS FOURNISSEUR ====================

  async createPurchasePayment(data: {
    purchaseOrderId: string;
    amount: number;
    paymentMethod?: string;
    paymentDate?: string;
    reference?: string;
    notes?: string;
  }) {
    const prisma = this.prisma as any;

    const order = await prisma.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId } });
    if (!order) throw new NotFoundException('Bon de commande introuvable');

    if (data.amount <= 0) {
      throw new BadRequestException('Le montant du paiement doit être positif');
    }

    // Check total payments against order total
    const totalPayments = await prisma.purchasePayment.aggregate({
      where: { orderId: data.purchaseOrderId },
      _sum: { amount: true },
    });
    const alreadyPaid = totalPayments._sum.amount ?? 0;
    if (alreadyPaid + data.amount > order.total) {
      throw new BadRequestException(
        'Le montant total des paiements ne peut pas dépasser le total de la commande',
      );
    }

    return prisma.purchasePayment.create({
      data: {
        orderId: data.purchaseOrderId,
        amount: data.amount,
        method: data.paymentMethod ?? 'BANK_TRANSFER',
        reference: data.reference,
        notes: data.notes,
        paidAt: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      },
      include: { order: true },
    });
  }

  async findAllPurchasePayments(filters?: {
    purchaseOrderId?: string;
    paymentMethod?: string;
  }) {
    const prisma = this.prisma as any;
    const where: any = {};

    if (filters?.purchaseOrderId) where.orderId = filters.purchaseOrderId;
    if (filters?.paymentMethod) where.method = filters.paymentMethod;

    return prisma.purchasePayment.findMany({
      where,
      include: { order: { include: { supplier: true } } },
      orderBy: { paidAt: 'desc' },
    });
  }

  async findOnePurchasePayment(id: string) {
    const prisma = this.prisma as any;
    const payment = await prisma.purchasePayment.findUnique({
      where: { id },
      include: { order: { include: { supplier: true } } },
    });
    if (!payment) throw new NotFoundException('Paiement fournisseur introuvable');
    return payment;
  }

  async updatePurchasePayment(
    id: string,
    data: {
      amount?: number;
      paymentMethod?: string;
      paymentDate?: string;
      reference?: string;
      notes?: string;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOnePurchasePayment(id);

    const updateData: any = { ...data };
    if (data.paymentDate) updateData.paymentDate = new Date(data.paymentDate);

    return prisma.purchasePayment.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePurchasePayment(id: string) {
    const prisma = this.prisma as any;
    await this.findOnePurchasePayment(id);
    return prisma.purchasePayment.delete({ where: { id } });
  }
}