import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly prisma: PrismaService) {}

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
    maxStock?: number;
    currentStock?: number;
    barcode?: string;
    image?: string;
    notes?: string;
  }) {
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
          notes: 'Stock initial',
        },
      });
    }

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
      maxStock?: number;
      currentStock?: number;
      barcode?: string;
      image?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) {
    const prisma = this.prisma as any;
    await this.findOneProduct(id);

    if (data.currentStock !== undefined && data.currentStock < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }

    return prisma.product.update({
      where: { id },
      data,
      include: { category: true, unit: true, supplier: true },
    });
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
    const prisma = this.prisma as any;
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    // Validate stock quantity
    if (data.quantity <= 0) {
      throw new BadRequestException('La quantité doit être supérieure à zéro');
    }

    // For outgoing movements, check stock availability
    const outgoingTypes = ['SALE', 'TRANSFER_OUT', 'LOSS', 'PRODUCTION'];
    if (outgoingTypes.includes(data.type) && product.currentStock < data.quantity) {
      throw new BadRequestException(
        `Stock insuffisant. Stock actuel: ${product.currentStock}, requis: ${data.quantity}`,
      );
    }

    const movement = await prisma.stockMovement.create({ data });

    // Update product stock
    let stockChange: number;
    const incomingTypes = ['PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT'];
    if (incomingTypes.includes(data.type)) {
      stockChange = data.quantity;
    } else {
      stockChange = -data.quantity;
    }

    const newStock = product.currentStock + stockChange;
    if (newStock < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }

    await prisma.product.update({
      where: { id: data.productId },
      data: { currentStock: newStock },
    });

    // Create stock alert if below min stock
    if (product.minStock > 0 && newStock <= product.minStock) {
      await prisma.stockAlert.create({
        data: {
          productId: data.productId,
          type: 'low_stock',
          message: `Le stock de "${product.name}" est bas (${newStock}/${product.minStock})`,
        },
      });
    }

    return movement;
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
    const prisma = this.prisma as any;
    const session = await this.findOneInventorySession(sessionId);
    if (session.status === 'completed') {
      throw new BadRequestException('Cette session est déjà terminée');
    }

    // Apply corrections to stock
    for (const item of session.items) {
      if (item.difference !== 0) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'ADJUSTMENT',
            quantity: Math.abs(item.difference),
            reference: session.reference,
            notes: item.difference > 0
              ? `Ajustement inventaire (+${item.difference})`
              : `Ajustement inventaire (${item.difference})`,
          },
        });

        await prisma.product.update({
          where: { id: item.productId },
          data: { currentStock: item.actualQty },
        });
      }
    }

    return prisma.inventorySession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedBy,
        completedAt: new Date(),
      },
    });
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

    // Create adjustment movement
    await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: 'ADJUSTMENT',
        quantity: Math.abs(difference),
        unitPrice: product.purchasePrice,
        totalPrice: product.purchasePrice
          ? Number(product.purchasePrice) * Math.abs(difference)
          : undefined,
        notes: `Ajustement: ${data.reason}`,
        userId: data.userId,
      },
    });

    // Update stock
    await prisma.product.update({
      where: { id: data.productId },
      data: { currentStock: data.newQuantity },
    });

    // Check min stock alert
    if (product.minStock > 0 && data.newQuantity <= product.minStock) {
      await prisma.stockAlert.create({
        data: {
          productId: data.productId,
          type: 'low_stock',
          message: `Le stock de "${product.name}" est bas (${data.newQuantity}/${product.minStock})`,
        },
      });
    }

    return {
      productId: data.productId,
      previousStock: product.currentStock,
      newStock: data.newQuantity,
      difference,
      message: `Stock ajusté de ${difference > 0 ? '+' : ''}${difference} unités`,
    };
  }
}