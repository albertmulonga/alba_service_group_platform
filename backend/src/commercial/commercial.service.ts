import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommercialService {
  private readonly logger = new Logger(CommercialService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createQuote(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `QT-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;

    const quote = await prisma.quote.create({
      data: {
        reference,
        customerId: data.customerId,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        subtotal,
        taxAmount: totalTax,
        taxRate: data.taxRate ?? 0,
        discount: data.discount ?? 0,
        total,
        notes: data.notes,
        terms: data.terms,
        createdBy: userId,
        items: data.items ? { create: data.items.map((item: any) => ({ ...item, total: item.quantity * item.unitPrice })) } : undefined,
      },
      include: { customer: true, items: true },
    });
    return quote;
  }

  async findAllQuotes(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.quote.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneQuote(id: string) {
    const prisma = this.prisma as any;
    const quote = await prisma.quote.findUnique({ where: { id }, include: { customer: true, items: true } });
    if (!quote) throw new NotFoundException('Devis introuvable');
    return quote;
  }

  async updateQuote(id: string, data: any, userId: string) {
    const prisma = this.prisma as any;
    await this.findOneQuote(id);
    return prisma.quote.update({
      where: { id },
      data: { ...data, validatedBy: data.status === 'VALIDATED' ? userId : undefined },
      include: { customer: true, items: true },
    });
  }

  async convertQuote(id: string, userId: string) {
    const prisma = this.prisma as any;
    const quote = await this.findOneQuote(id);
    if (quote.status === 'CONVERTED') throw new BadRequestException('Devis déjà converti');
    const reference = `CMD-${Date.now().toString(36).toUpperCase()}`;
    const order = await prisma.salesOrder.create({
      data: {
        reference,
        customerId: quote.customerId,
        quoteId: quote.id,
        status: 'DRAFT',
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        taxRate: quote.taxRate,
        discount: quote.discount,
        total: quote.total,
        notes: quote.notes,
        createdBy: userId,
        items: {
          create: quote.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
      include: { customer: true, items: true },
    });
    await prisma.quote.update({ where: { id }, data: { status: 'CONVERTED', convertedAt: new Date() } });
    return order;
  }

  async createOrder(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `CMD-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    return prisma.salesOrder.create({
      data: {
        reference,
        customerId: data.customerId,
        status: data.status ?? 'DRAFT',
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        subtotal,
        taxAmount: totalTax,
        taxRate: data.taxRate ?? 0,
        discount: data.discount ?? 0,
        total,
        notes: data.notes,
        createdBy: userId,
        items: data.items ? { create: data.items.map((item: any) => ({ ...item, total: item.quantity * item.unitPrice })) } : undefined,
      },
      include: { customer: true, items: true },
    });
  }

  async findAllOrders(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.salesOrder.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneOrder(id: string) {
    const prisma = this.prisma as any;
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: { customer: true, items: true, invoices: true } });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async updateOrderStatus(id: string, status: string) {
    const prisma = this.prisma as any;
    await this.findOneOrder(id);
    return prisma.salesOrder.update({ where: { id }, data: { status }, include: { customer: true } });
  }

  async createInvoice(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `FAC-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    return prisma.invoice.create({
      data: {
        reference,
        customerId: data.customerId,
        orderId: data.orderId,
        status: data.status ?? 'DRAFT',
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        subtotal,
        taxAmount: totalTax,
        taxRate: data.taxRate ?? 0,
        discount: data.discount ?? 0,
        total,
        notes: data.notes,
        createdBy: userId,
        items: data.items ? { create: data.items.map((item: any) => ({ ...item, total: item.quantity * item.unitPrice })) } : undefined,
      },
      include: { customer: true, items: true },
    });
  }

  async findAllInvoices(filters: any) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.invoice.findMany({
      where,
      include: { customer: true, items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneInvoice(id: string) {
    const prisma = this.prisma as any;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  async createPayment(data: any, userId: string) {
    const prisma = this.prisma as any;
    const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    const payment = await prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        methodId: data.methodId,
        reference: data.reference,
        notes: data.notes,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        receivedBy: userId,
      },
      include: { invoice: true },
    });
    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { paidAmount: { increment: data.amount } },
    });
    return payment;
  }

  async findAllPayments(invoiceId?: string) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    return prisma.payment.findMany({ where, include: { invoice: { include: { customer: true } } }, orderBy: { paymentDate: 'desc' } });
  }
}
