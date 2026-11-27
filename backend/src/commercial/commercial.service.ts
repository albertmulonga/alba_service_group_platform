import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommercialService {
  private readonly logger = new Logger(CommercialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
    if (quote.status === 'SENT') {
      await this.notifications.notifyCustomer(quote.customerId, {
        eventType: 'QUOTE_SENT',
        eventId: quote.id,
        title: 'Votre devis est disponible',
        content: `Le devis ${quote.reference} d’un montant de ${quote.total} est disponible.`,
        module: 'Commercial',
        link: '/commercial/quotes',
        payload: { reference: quote.reference, total: Number(quote.total), status: quote.status },
      });
    }
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
    const previous = await this.findOneQuote(id);
    const quote = await prisma.quote.update({
      where: { id },
      data: { ...data, validatedBy: data.status === 'VALIDATED' ? userId : undefined },
      include: { customer: true, items: true },
    });
    if (previous.status !== quote.status && quote.status === 'SENT') {
      await this.notifications.notifyCustomer(quote.customerId, {
        eventType: 'QUOTE_SENT',
        eventId: `${quote.id}:${quote.updatedAt.toISOString()}`,
        title: 'Votre devis est disponible',
        content: `Le devis ${quote.reference} d’un montant de ${quote.total} est disponible.`,
        module: 'Commercial',
        link: '/commercial/quotes',
        payload: { reference: quote.reference, total: Number(quote.total), status: quote.status },
      });
    }
    return quote;
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
    await this.notifications.notifyCustomer(order.customerId, {
      eventType: 'ORDER_CREATED',
      eventId: order.id,
      title: 'Votre commande est enregistrée',
      content: `La commande ${order.reference} a été créée à partir du devis ${quote.reference}.`,
      module: 'Commercial',
      link: '/commercial/orders',
      payload: { reference: order.reference, status: order.status, total: Number(order.total) },
    });
    return order;
  }

  async createOrder(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `CMD-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    const order = await prisma.salesOrder.create({
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
    await this.notifications.notifyCustomer(order.customerId, {
      eventType: 'ORDER_CREATED',
      eventId: order.id,
      title: 'Commande reçue',
      content: `La commande ${order.reference} a été enregistrée. Statut : ${order.status}.`,
      module: 'Commercial',
      link: '/commercial/orders',
      payload: {
        reference: order.reference,
        status: order.status,
        total: Number(order.total),
        items: order.items.map((item: any) => ({ name: item.name, quantity: item.quantity, total: Number(item.total) })),
      },
    });
    return order;
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
    const previous = await this.findOneOrder(id);
    if (previous.status === status) return previous;
    const order = await prisma.salesOrder.update({
      where: { id },
      data: { status },
      include: { customer: true, items: true },
    });
    const eventTypes: Record<string, string> = {
      VALIDATED: 'ORDER_CONFIRMED',
      CANCELLED: 'ORDER_CANCELLED',
      SENT: 'ORDER_SENT',
    };
    const eventType = eventTypes[status] || 'ORDER_STATUS_CHANGED';
    await this.notifications.notifyCustomer(order.customerId, {
      eventType,
      eventId: `${order.id}:${order.updatedAt.toISOString()}`,
      title: status === 'CANCELLED' ? 'Commande annulée' : 'Mise à jour de votre commande',
      content: `La commande ${order.reference} est passée du statut ${previous.status} au statut ${order.status}.`,
      module: 'Commercial',
      link: '/commercial/orders',
      payload: { reference: order.reference, previousStatus: previous.status, status: order.status },
    });
    return order;
  }

  async createInvoice(data: any, userId: string) {
    const prisma = this.prisma as any;
    const reference = data.reference || `FAC-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = (data.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = (data.items || []).reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice) * (item.taxRate ?? 0) / 100), 0);
    const total = subtotal + totalTax;
    const invoice = await prisma.invoice.create({
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
    await this.notifications.notifyCustomer(invoice.customerId, {
      eventType: 'INVOICE_GENERATED',
      eventId: invoice.id,
      title: 'Votre facture est disponible',
      content: `La facture ${invoice.reference} d’un montant de ${invoice.total} a été générée.`,
      module: 'Commercial',
      link: '/commercial/invoices',
      payload: { reference: invoice.reference, total: Number(invoice.total), status: invoice.status },
    });
    return invoice;
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
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Le montant du paiement doit être supérieur à zéro.');
    const result = await this.prisma.$transaction(async (transaction: any) => {
      const invoice = await transaction.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { customer: true, items: true },
      });
      if (!invoice) throw new NotFoundException('Facture introuvable');
      const remaining = Number(invoice.total) - Number(invoice.paidAmount);
      if (amount > remaining) throw new BadRequestException('Le paiement dépasse le solde de la facture.');

      const changed = await transaction.invoice.updateMany({
        where: { id: invoice.id, paidAmount: invoice.paidAmount },
        data: { paidAmount: { increment: amount } },
      });
      if (changed.count !== 1) throw new BadRequestException('La facture a été modifiée simultanément. Réessayez.');

      const payment = await transaction.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount,
          methodId: data.methodId,
          reference: data.reference || `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          notes: data.notes,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          receivedBy: userId,
          status: 'CONFIRMED',
        },
        include: { invoice: true, method: true },
      });
      const newPaidAmount = Number(invoice.paidAmount) + amount;
      const invoiceStatus = newPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIAL';
      await transaction.invoice.update({
        where: { id: invoice.id },
        data: { status: invoiceStatus },
      });
      if (invoice.orderId) {
        await transaction.salesOrder.update({
          where: { id: invoice.orderId },
          data: { paidAmount: { increment: amount } },
        });
      }
      return { payment, customerId: invoice.customerId, reference: invoice.reference, remaining: Number(invoice.total) - newPaidAmount };
    });
    if (result.payment.status === 'CONFIRMED') {
      await this.notifications.notifyCustomer(result.customerId, {
        eventType: 'PAYMENT_CONFIRMED',
        eventId: result.payment.id,
        title: 'Paiement confirmé',
        content: `Le paiement ${result.payment.reference} de ${result.payment.amount} a été confirmé pour la facture ${result.reference}. Solde restant : ${result.remaining}.`,
        module: 'Finance',
        link: '/commercial/payments',
        payload: {
          paymentReference: result.payment.reference,
          invoiceReference: result.reference,
          amount: Number(result.payment.amount),
          method: result.payment.method?.name || 'Non précisé',
          balance: result.remaining,
        },
      });
    }
    return result.payment;
  }

  async findAllPayments(invoiceId?: string) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;
    return prisma.payment.findMany({ where, include: { invoice: { include: { customer: true } } }, orderBy: { paymentDate: 'desc' } });
  }
}
