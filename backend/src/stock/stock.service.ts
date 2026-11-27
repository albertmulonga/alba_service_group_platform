import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

function getLocalDateTimeParts(date: Date, timezone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function getLocalDateKey(date: Date, timezone: string): string {
  const parts = getLocalDateTimeParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validateDateKey(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new BadRequestException('La date du rapport doit respecter le format AAAA-MM-JJ.');
  }
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new BadRequestException('La date du rapport est invalide.');
  }
  return dateKey;
}

function localMidnightToUtc(dateKey: string, timezone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const targetUtc = Date.UTC(year, month - 1, day);
  const approximateDate = new Date(targetUtc);
  const localParts = getLocalDateTimeParts(approximateDate, timezone);
  const localClockAsUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
  );
  return new Date(targetUtc - (localClockAsUtc - targetUtc));
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  private reportWorker?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.STOCK_REPORT_WORKER_ENABLED === 'false') {
      return;
    }
    this.reportWorker = setInterval(() => {
      void this.generateDueStockReports().catch(error => {
        this.logger.error(
          'Stock report generation failed.',
          error instanceof Error ? error.stack : undefined,
        );
      });
    }, 5 * 60_000);
    this.reportWorker.unref();
    void this.generateDueStockReports().catch(error => {
      this.logger.error(
        'Stock report generation failed.',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  onModuleDestroy() {
    if (this.reportWorker) clearInterval(this.reportWorker);
  }

  // ==================== CATÉGORIES ====================

  async createCategory(data: { name: string; description?: string; parentId?: string }) {
    const prisma = this.prisma as any;
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const existing = await prisma.productCategory.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Une catégorie avec ce nom existe déjà');
    }

    return prisma.productCategory.create({
      data: { name: data.name, slug, description: data.description, parentId: data.parentId },
      include: { parent: true, children: true },
    });
  }

  async findAllCategories() {
    const prisma = this.prisma as any;
    return prisma.productCategory.findMany({
      include: { parent: true, children: true, _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneCategory(id: string) {
    const prisma = this.prisma as any;
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: { parent: true, children: true, products: true },
    });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    return category;
  }

  async updateCategory(id: string, data: { name?: string; description?: string; parentId?: string }) {
    const prisma = this.prisma as any;
    await this.findOneCategory(id);

    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
      updateData.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    return prisma.productCategory.update({
      where: { id },
      data: updateData,
      include: { parent: true, children: true },
    });
  }

  async deleteCategory(id: string) {
    const prisma = this.prisma as any;
    await this.findOneCategory(id);

    const productsCount = await prisma.product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer cette catégorie car elle contient des produits',
      );
    }

    return prisma.productCategory.delete({ where: { id } });
  }

  // ==================== PRODUITS ====================

  async createProduct(data: {
    code?: string;
    name: string;
    description?: string;
    categoryId?: string;
    unitId?: string;
    supplierId?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    minStock?: number;
    criticalStock?: number;
    maxStock?: number;
    currentStock?: number;
    barcode?: string;
    image?: string;
    notes?: string;
  }, userId?: string) {
    const prisma = this.prisma as any;

    const code = data.code || `PRD-${Date.now().toString(36).toUpperCase()}`;
    const existing = await prisma.product.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Un produit avec ce code existe déjà');
    }

    const product = await prisma.product.create({
      data: {
        code,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        unitId: data.unitId,
        supplierId: data.supplierId,
        purchasePrice: data.purchasePrice ?? 0,
        sellingPrice: data.sellingPrice ?? 0,
        minStock: data.minStock ?? 0,
        criticalStock: data.criticalStock ?? 0,
        maxStock: data.maxStock,
        currentStock: data.currentStock ?? 0,
        barcode: data.barcode,
        image: data.image,
        notes: data.notes,
      },
      include: { category: true, unit: true, supplier: true },
    });

    if (data.currentStock && data.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: 'ADJUSTMENT',
          quantity: data.currentStock,
          quantityDelta: data.currentStock,
          userId,
          notes: 'Stock initial',
        },
      });
    }

    await this.syncStockAlert(product, product.currentStock, 0);
    return product;
  }

  async findAllProducts(filters?: {
    categoryId?: string;
    supplierId?: string;
    isActive?: boolean;
    search?: string;
    lowStock?: boolean;
  }) {
    const prisma = this.prisma as any;
    const where: any = {};

    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.lowStock) {
      where.currentStock = { lte: prisma.product.minStock };
    }

    return prisma.product.findMany({
      where,
      include: { category: true, unit: true, supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOneProduct(id: string) {
    const prisma = this.prisma as any;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, unit: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async updateProduct(
    id: string,
    data: {
      code?: string;
      name?: string;
      description?: string;
      categoryId?: string;
      unitId?: string;
      supplierId?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      minStock?: number;
      criticalStock?: number;
      maxStock?: number;
      currentStock?: number;
      barcode?: string;
      image?: string;
      notes?: string;
      isActive?: boolean;
    },
    userId?: string,
  ) {
    const prisma = this.prisma as any;
    const previous = await this.findOneProduct(id);

    if (data.currentStock !== undefined && data.currentStock < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }

    const stockChanged = data.currentStock !== undefined && data.currentStock !== previous.currentStock;
    const { currentStock, ...productData } = data;
    const updated = await this.prisma.$transaction(async (transaction: any) => {
      if (stockChanged) {
        const change = currentStock! - previous.currentStock;
        const result = await transaction.product.updateMany({
          where: { id, currentStock: previous.currentStock },
          data: { ...productData, currentStock },
        });
        if (result.count !== 1) {
          throw new BadRequestException('Le stock a été modifié simultanément. Actualisez puis réessayez.');
        }
        await transaction.stockMovement.create({
          data: {
            productId: id,
            type: 'ADJUSTMENT',
            quantity: Math.abs(change),
            quantityDelta: change,
            userId,
            notes: 'Ajustement via mise à jour du produit',
          },
        });
      } else {
        await transaction.product.update({ where: { id }, data: productData });
      }
      return transaction.product.findUnique({
        where: { id },
        include: { category: true, unit: true, supplier: true },
      });
    });
    if (stockChanged) {
      await this.syncStockAlert(updated, updated.currentStock, previous.currentStock);
      if (updated.currentStock > previous.currentStock) {
        await this.notifyReplenishment(updated, updated.currentStock, `product-update:${id}:${updated.updatedAt.toISOString()}`);
      }
    }
    return updated;
  }

  async deleteProduct(id: string) {
    const prisma = this.prisma as any;
    await this.findOneProduct(id);
    return prisma.product.delete({ where: { id } });
  }

  // ==================== FOURNISSEURS ====================

  async createSupplier(data: {
    code?: string;
    name: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    province?: string;
    country?: string;
    website?: string;
    taxId?: string;
    paymentTerms?: string;
    notes?: string;
  }) {
    const prisma = this.prisma as any;

    const code = data.code || `SUP-${Date.now().toString(36).toUpperCase()}`;
    const existing = await prisma.supplier.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException('Un fournisseur avec ce code existe déjà');
    }

    return prisma.supplier.create({
      data: {
        code,
        name: data.name,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        province: data.province,
        country: data.country ?? 'RDC',
        website: data.website,
        taxId: data.taxId,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
      },
    });
  }

  async findAllSuppliers() {
    const prisma = this.prisma as any;
    return prisma.supplier.findMany({
      include: { _count: { select: { products: true, purchaseOrders: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOneSupplier(id: string) {
    const prisma = this.prisma as any;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { contacts: true, documents: true, products: true, purchaseOrders: true },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');
    return supplier;
  }

  async updateSupplier(
    id: string,
    data: {
      code?: string;
      name?: string;
      contactName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      province?: string;
      country?: string;
      website?: string;
      taxId?: string;
      paymentTerms?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOneSupplier(id);
    return prisma.supplier.update({ where: { id }, data });
  }

  async deleteSupplier(id: string) {
    const prisma = this.prisma as any;
    await this.findOneSupplier(id);

    const productsCount = await prisma.product.count({ where: { supplierId: id } });
    if (productsCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer ce fournisseur car il est lié à des produits',
      );
    }

    return prisma.supplier.delete({ where: { id } });
  }

  // ==================== MOUVEMENTS DE STOCK ====================

  async createStockMovement(data: {
    productId: string;
    type: 'PURCHASE' | 'SALE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT' | 'PRODUCTION' | 'RETURN' | 'LOSS';
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    locationId?: string;
    toLocationId?: string;
    reference?: string;
    notes?: string;
    userId?: string;
  }) {
    if (data.quantity <= 0) {
      throw new BadRequestException('La quantité doit être supérieure à zéro');
    }

    const incomingTypes = ['PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT'];
    const quantityDelta = incomingTypes.includes(data.type) ? data.quantity : -data.quantity;
    const result = await this.prisma.$transaction(async (transaction: any) => {
      const product = await transaction.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new NotFoundException('Produit introuvable');
      if (quantityDelta < 0 && product.currentStock < Math.abs(quantityDelta)) {
        throw new BadRequestException(
          `Stock insuffisant. Stock actuel: ${product.currentStock}, requis: ${Math.abs(quantityDelta)}`,
        );
      }

      const updated = await transaction.product.updateMany({
        where: { id: data.productId, currentStock: product.currentStock },
        data: { currentStock: { increment: quantityDelta } },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Le stock a été modifié simultanément. Actualisez puis réessayez.');
      }
      const movement = await transaction.stockMovement.create({
        data: { ...data, quantityDelta },
      });
      return { movement, product, newStock: product.currentStock + quantityDelta };
    });

    await this.syncStockAlert(result.product, result.newStock, result.product.currentStock);
    if (quantityDelta > 0) {
      await this.notifyReplenishment(result.product, result.newStock, result.movement.id);
    }
    return result.movement;
  }

  async findAllStockMovements(filters?: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const prisma = this.prisma as any;
    const where: any = {};

    if (filters?.productId) where.productId = filters.productId;
    if (filters?.type) where.type = filters.type;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters?.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return prisma.stockMovement.findMany({
      where,
      include: { product: true, location: true, toLocation: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== INVENTAIRE ====================

  async createInventorySession(data: {
    type: 'full' | 'partial';
    notes?: string;
    startedBy?: string;
  }) {
    const prisma = this.prisma as any;
    const reference = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Close any open sessions
    await prisma.inventorySession.updateMany({
      where: { status: { in: ['open', 'in_progress'] } },
      data: { status: 'cancelled' },
    });

    return prisma.inventorySession.create({
      data: {
        reference,
        type: data.type,
        status: 'open',
        notes: data.notes,
        startedBy: data.startedBy,
        startedAt: new Date(),
      },
    });
  }

  async findAllInventorySessions() {
    const prisma = this.prisma as any;
    return prisma.inventorySession.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOneInventorySession(id: string) {
    const prisma = this.prisma as any;
    const session = await prisma.inventorySession.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { include: { category: true, unit: true } } },
        },
      },
    });
    if (!session) throw new NotFoundException('Session d\'inventaire introuvable');
    return session;
  }

  async addInventoryItem(
    sessionId: string,
    data: { productId: string; actualQty: number; notes?: string },
  ) {
    const prisma = this.prisma as any;
    const session = await this.findOneInventorySession(sessionId);
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new BadRequestException('Cette session d\'inventaire est déjà terminée');
    }

    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const theoreticalQty = product.currentStock;
    const difference = data.actualQty - theoreticalQty;

    return prisma.inventoryItem.upsert({
      where: {
        sessionId_productId: { sessionId, productId: data.productId },
      },
      update: {
        actualQty: data.actualQty,
        difference,
        notes: data.notes,
      },
      create: {
        sessionId,
        productId: data.productId,
        theoreticalQty,
        actualQty: data.actualQty,
        difference,
        unitPrice: product.purchasePrice,
        notes: data.notes,
      },
    });
  }

  async completeInventorySession(sessionId: string, completedBy?: string) {
    const session = await this.findOneInventorySession(sessionId);
    if (session.status === 'completed') {
      throw new BadRequestException('Cette session est déjà terminée');
    }

    const changes: { product: any; previousStock: number; newStock: number; movementId: string }[] = [];
    const completed = await this.prisma.$transaction(async (transaction: any) => {
      for (const item of session.items) {
        if (item.difference === 0) continue;
        const product = await transaction.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException('Produit introuvable');

        const movement = await transaction.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'ADJUSTMENT',
            quantity: Math.abs(item.difference),
            quantityDelta: item.difference,
            reference: session.reference,
            userId: completedBy,
            notes: `Ajustement inventaire (${item.difference > 0 ? '+' : ''}${item.difference})`,
          },
        });
        const updated = await transaction.product.updateMany({
          where: { id: item.productId, currentStock: product.currentStock },
          data: { currentStock: item.actualQty },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Un produit a été modifié pendant l’inventaire. Réessayez.');
        }
        changes.push({
          product,
          previousStock: product.currentStock,
          newStock: item.actualQty,
          movementId: movement.id,
        });
      }

      return transaction.inventorySession.update({
        where: { id: sessionId },
        data: { status: 'completed', completedBy, completedAt: new Date() },
      });
    });

    await Promise.all(changes.map(async change => {
      await this.syncStockAlert(change.product, change.newStock, change.previousStock);
      if (change.newStock > change.previousStock) {
        await this.notifyReplenishment(change.product, change.newStock, change.movementId);
      }
    }));
    return completed;
  }

  // ==================== ALERTES STOCK ====================

  async getStockAlerts(includeResolved = false) {
    const prisma = this.prisma as any;
    const where: any = {};
    if (!includeResolved) where.isResolved = false;

    return prisma.stockAlert.findMany({
      where,
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listStockReports(period?: 'DAILY' | 'WEEKLY') {
    const prisma = this.prisma as any;
    return prisma.stockReport.findMany({
      where: period ? { period } : {},
      orderBy: [{ periodStart: 'desc' }, { generatedAt: 'desc' }],
      take: 100,
    });
  }

  async generateStockReport(period: 'DAILY' | 'WEEKLY', requestedStart?: string) {
    const prisma = this.prisma as any;
    const timezone = process.env.STOCK_REPORT_TIMEZONE || 'Africa/Lubumbashi';
    const today = getLocalDateKey(new Date(), timezone);
    const periodStartKey = requestedStart
      ? validateDateKey(requestedStart)
      : period === 'DAILY'
        ? shiftDateKey(today, -1)
        : shiftDateKey(today, -7 - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
    const periodStart = localMidnightToUtc(periodStartKey, timezone);
    const periodEnd = localMidnightToUtc(
      shiftDateKey(periodStartKey, period === 'DAILY' ? 1 : 7),
      timezone,
    );
    const uniqueKey = { period_periodStart: { period, periodStart } };
    const existing = await prisma.stockReport.findUnique({ where: uniqueKey });
    if (existing) return existing;

    const [products, movements] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          currentStock: true,
          minStock: true,
          criticalStock: true,
          purchasePrice: true,
          category: { select: { name: true } },
          unit: { select: { name: true, code: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: periodStart, lt: periodEnd } },
        select: {
          id: true,
          type: true,
          quantity: true,
          quantityDelta: true,
          reference: true,
          notes: true,
          createdAt: true,
          product: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const stockItems = products.map((product: any) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category?.name || null,
      unit: product.unit?.name || product.unit?.code || null,
      currentStock: product.currentStock,
      minStock: product.minStock,
      criticalStock: product.criticalStock,
      purchasePrice: Number(product.purchasePrice || 0),
      stockValue: product.currentStock * Number(product.purchasePrice || 0),
      isLowStock: product.currentStock <= product.minStock,
      isOutOfStock: product.currentStock <= 0,
    }));
    const movementItems = movements.map((movement: any) => ({
      id: movement.id,
      type: movement.type,
      quantity: movement.quantity,
      quantityDelta: movement.quantityDelta ?? movement.quantity,
      reference: movement.reference,
      notes: movement.notes,
      createdAt: movement.createdAt.toISOString(),
      product: movement.product,
    }));
    const totalsByType = movementItems.reduce((totals: Record<string, number>, movement: any) => {
      totals[movement.type] = (totals[movement.type] || 0) + movement.quantity;
      return totals;
    }, {});
    const data = {
      generatedAt: new Date().toISOString(),
      productCount: stockItems.length,
      totalStockValue: stockItems.reduce((total: number, item: any) => total + item.stockValue, 0),
      lowStockCount: stockItems.filter((item: any) => item.isLowStock).length,
      outOfStockCount: stockItems.filter((item: any) => item.isOutOfStock).length,
      movementCount: movementItems.length,
      totalsByType,
      products: stockItems,
      movements: movementItems,
    };
    const report = await prisma.stockReport.upsert({
      where: uniqueKey,
      update: {},
      create: { period, periodStart, periodEnd, data },
    });

    const label = period === 'DAILY' ? 'journalier' : 'hebdomadaire';
    await this.notifications.notifyEmployees({
      eventType: `STOCK_REPORT_${period}`,
      eventId: report.id,
      title: `Rapport de stock ${label}`,
      content: `${movementItems.length} mouvement(s), ${data.lowStockCount} produit(s) sous le seuil et ${data.outOfStockCount} rupture(s).`,
      module: 'Stock',
      link: '/stock',
      type: data.outOfStockCount > 0 ? 'warning' : 'info',
      payload: { reportId: report.id, period, periodStart: periodStartKey },
    }, ['super-admin', 'admin', 'stock-manager', 'warehouse-manager'], ['stock.manage']);

    return report;
  }

  private async generateDueStockReports() {
    const timezone = process.env.STOCK_REPORT_TIMEZONE || 'Africa/Lubumbashi';
    const now = new Date();
    const localParts = getLocalDateTimeParts(now, timezone);
    const reportHour = Number(process.env.STOCK_REPORT_HOUR || 8);
    if (Number.isNaN(reportHour) || reportHour < 0 || reportHour > 23) {
      throw new Error('STOCK_REPORT_HOUR must be an hour between 0 and 23.');
    }
    if (Number(localParts.hour) < reportHour) return;

    const today = `${localParts.year}-${localParts.month}-${localParts.day}`;
    await this.generateStockReport('DAILY', shiftDateKey(today, -1));
    if (localParts.weekday === 'Mon') {
      const currentMonday = shiftDateKey(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
      await this.generateStockReport('WEEKLY', shiftDateKey(currentMonday, -7));
    }
  }

  async resolveStockAlert(id: string) {
    const prisma = this.prisma as any;
    const alert = await prisma.stockAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerte introuvable');

    return prisma.stockAlert.update({
      where: { id },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }

  // ==================== AJUSTEMENT DE STOCK ====================

  async adjustStock(data: {
    productId: string;
    newQuantity: number;
    reason: string;
    userId?: string;
  }) {
    const prisma = this.prisma as any;
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    if (data.newQuantity < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }

    const difference = data.newQuantity - product.currentStock;
    if (difference === 0) {
      throw new BadRequestException('La quantité est identique au stock actuel');
    }

    const movement = await this.prisma.$transaction(async (transaction: any) => {
      const updated = await transaction.product.updateMany({
        where: { id: data.productId, currentStock: product.currentStock },
        data: { currentStock: data.newQuantity },
      });
      if (updated.count !== 1) {
        throw new BadRequestException('Le stock a été modifié simultanément. Actualisez puis réessayez.');
      }

      return transaction.stockMovement.create({
        data: {
          productId: data.productId,
          type: 'ADJUSTMENT',
          quantity: Math.abs(difference),
          quantityDelta: difference,
          unitPrice: product.purchasePrice,
          totalPrice: product.purchasePrice
            ? Number(product.purchasePrice) * Math.abs(difference)
            : undefined,
          notes: `Ajustement: ${data.reason}`,
          userId: data.userId,
        },
      });
    });

    await this.syncStockAlert(product, data.newQuantity, product.currentStock);
    if (data.newQuantity > product.currentStock) {
      await this.notifyReplenishment(product, data.newQuantity, movement.id);
    }

    return {
      productId: data.productId,
      previousStock: product.currentStock,
      newStock: data.newQuantity,
      difference,
      message: `Stock ajusté de ${difference > 0 ? '+' : ''}${difference} unités`,
    };
  }

  private getStockSeverity(product: any, stock: number): 'NORMAL' | 'LOW' | 'CRITICAL' | 'OUT' {
    if (stock <= 0) return 'OUT';
    const minimum = Number(product.minStock || 0);
    if (minimum <= 0 || stock > minimum) return 'NORMAL';
    const critical = Number(product.criticalStock || 0) || Math.max(1, Math.floor(minimum * 0.3));
    if (stock <= critical) return 'CRITICAL';
    return 'LOW';
  }

  private async syncStockAlert(product: any, stock: number, previousStock: number) {
    const prisma = this.prisma as any;
    const severity = this.getStockSeverity(product, stock);
    const openAlerts = await prisma.stockAlert.findMany({
      where: { productId: product.id, isResolved: false },
      orderBy: { createdAt: 'desc' },
    });

    if (severity === 'NORMAL') {
      if (openAlerts.length) {
        await prisma.stockAlert.updateMany({
          where: { productId: product.id, isResolved: false },
          data: { isResolved: true, resolvedAt: new Date() },
        });
      }
      return;
    }
    if (openAlerts[0]?.severity === severity) return;
    if (openAlerts.length) {
      await prisma.stockAlert.updateMany({
        where: { productId: product.id, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });
    }

    const minimum = Number(product.minStock || 0);
    const labels: Record<string, string> = {
      LOW: 'stock faible',
      CRITICAL: 'stock critique',
      OUT: 'rupture de stock',
    };
    const types: Record<string, string> = {
      LOW: 'low_stock',
      CRITICAL: 'critical_stock',
      OUT: 'out_of_stock',
    };
    const message = `${product.name}: ${labels[severity]} (${stock} disponibles, seuil minimum ${minimum}).`;
    const alert = await prisma.stockAlert.create({
      data: {
        productId: product.id,
        type: types[severity],
        severity,
        message,
        lastNotifiedAt: new Date(),
      },
    });
    const eventTypes: Record<string, string> = {
      LOW: 'STOCK_LOW',
      CRITICAL: 'STOCK_CRITICAL',
      OUT: 'STOCK_OUT',
    };
    await this.notifications.notifyEmployees({
      eventType: eventTypes[severity],
      eventId: alert.id,
      title: 'Alerte stock — réapprovisionnement nécessaire',
      content: `${message} Quantité à réapprovisionner pour atteindre le seuil : ${Math.max(0, minimum - stock)}.`,
      module: 'Stock',
      link: '/stock',
      type: severity === 'OUT' || severity === 'CRITICAL' ? 'danger' : 'warning',
      payload: {
        productId: product.id,
        code: product.code,
        name: product.name,
        stock,
        minimum,
        severity,
      },
    }, ['super-admin', 'admin', 'stock-manager', 'warehouse-manager'], ['stock.manage']);
    this.logger.warn(`Stock alert created for product ${product.code} (${severity}, previous ${previousStock}).`);
  }

  private async notifyReplenishment(product: any, stock: number, eventId: string) {
    await this.notifications.notifyEmployees({
      eventType: 'STOCK_REPLENISHED',
      eventId,
      title: 'Réapprovisionnement enregistré',
      content: `${product.name} (${product.code}) a été réapprovisionné. Stock actuel : ${stock}.`,
      module: 'Stock',
      link: '/stock',
      type: 'success',
      payload: { productId: product.id, code: product.code, name: product.name, stock },
    }, ['super-admin', 'admin', 'stock-manager', 'warehouse-manager'], ['stock.manage']);
  }
}