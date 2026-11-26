import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private get p() {
    return this.prisma as any;
  }

  // --- ACCOUNTS ---

  async findAllAccounts(params: { page?: number; limit?: number; type?: string; isActive?: boolean }) {
    const { page = 1, limit = 10, type, isActive } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.p.account.findMany({ where, skip, take: limit, orderBy: { code: 'asc' } }),
      this.p.account.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneAccount(id: string) {
    const account = await this.p.account.findUnique({
      where: { id },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!account) throw new NotFoundException(`Compte avec ID ${id} introuvable`);
    return account;
  }

  async createAccount(data: any) {
    const prisma = this.prisma as any;
    const code = data.code || `ACC-${Date.now().toString(36).toUpperCase()}`;
    const existing = await prisma.account.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`Un compte avec le code ${code} existe déjà`);
    return prisma.account.create({ data: { ...data, code, balance: 0 } });
  }

  async updateAccount(id: string, data: any) {
    await this.findOneAccount(id);
    return this.p.account.update({ where: { id }, data });
  }

  async deleteAccount(id: string) {
    await this.findOneAccount(id);
    const txCount = await this.p.accountTransaction.count({ where: { accountId: id } });
    if (txCount > 0) throw new BadRequestException(`Impossible de supprimer un compte avec des transactions`);
    return this.p.account.delete({ where: { id } });
  }

  // --- TRANSACTIONS ---

  async findAllTransactions(params: { page?: number; limit?: number; accountId?: string; type?: string; startDate?: Date; endDate?: Date }) {
    const { page = 1, limit = 10, accountId, type, startDate, endDate } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (accountId) where.accountId = accountId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.p.accountTransaction.findMany({
        where,
        skip,
        take: limit,
        include: { account: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.p.accountTransaction.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneTransaction(id: string) {
    const tx = await this.p.accountTransaction.findUnique({ where: { id }, include: { account: true } });
    if (!tx) throw new NotFoundException(`Transaction avec ID ${id} introuvable`);
    return tx;
  }

  async createTransaction(data: any) {
    const account = await this.p.account.findUnique({ where: { id: data.accountId } });
    if (!account) throw new NotFoundException(`Compte avec ID ${data.accountId} introuvable`);

    // Créer la transaction et mettre à jour le solde du compte
    const amount = Number(data.amount);
    let newBalance = Number(account.balance);
    if (data.type === 'credit') {
      newBalance += amount;
    } else if (data.type === 'debit') {
      if (newBalance < amount) throw new BadRequestException(`Solde insuffisant sur le compte ${account.name}`);
      newBalance -= amount;
    } else {
      throw new BadRequestException(`Le type de transaction doit être 'credit' ou 'debit'`);
    }

    const tx = await this.p.accountTransaction.create({ data });
    await this.p.account.update({ where: { id: account.id }, data: { balance: newBalance } });
    return tx;
  }

  async deleteTransaction(id: string) {
    const tx = await this.findOneTransaction(id);
    // Reverser le solde
    const account = await this.p.account.findUnique({ where: { id: tx.accountId } });
    const amount = Number(tx.amount);
    let newBalance = Number(account.balance);
    if (tx.type === 'credit') {
      newBalance -= amount;
    } else if (tx.type === 'debit') {
      newBalance += amount;
    }
    await this.p.account.update({ where: { id: account.id }, data: { balance: newBalance } });
    return this.p.accountTransaction.delete({ where: { id } });
  }

  // --- REVENUES ---

  async findAllRevenues(params: { page?: number; limit?: number; category?: string; startDate?: Date; endDate?: Date }) {
    const { page = 1, limit = 10, category, startDate, endDate } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.p.revenue.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.p.revenue.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneRevenue(id: string) {
    const revenue = await this.p.revenue.findUnique({ where: { id } });
    if (!revenue) throw new NotFoundException(`Revenu avec ID ${id} introuvable`);
    return revenue;
  }

  async createRevenue(data: any) {
    return this.p.revenue.create({ data });
  }

  async updateRevenue(id: string, data: any) {
    await this.findOneRevenue(id);
    return this.p.revenue.update({ where: { id }, data });
  }

  async deleteRevenue(id: string) {
    await this.findOneRevenue(id);
    return this.p.revenue.delete({ where: { id } });
  }

  // --- EXPENSES ---

  async findAllExpenses(params: { page?: number; limit?: number; category?: string; startDate?: Date; endDate?: Date }) {
    const { page = 1, limit = 10, category, startDate, endDate } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [data, total] = await Promise.all([
      this.p.expense.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.p.expense.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneExpense(id: string) {
    const expense = await this.p.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException(`Dépense avec ID ${id} introuvable`);
    return expense;
  }

  async createExpense(data: any) {
    return this.p.expense.create({ data });
  }

  async updateExpense(id: string, data: any) {
    await this.findOneExpense(id);
    return this.p.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: string) {
    await this.findOneExpense(id);
    return this.p.expense.delete({ where: { id } });
  }

  // --- DASHBOARD ---

  async getFinancialSummary(params: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = params;
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.gte = startDate;
      if (endDate) dateFilter.date.lte = endDate;
    }

    const [revenues, expenses, accounts] = await Promise.all([
      this.p.revenue.findMany({ where: dateFilter }),
      this.p.expense.findMany({ where: dateFilter }),
      this.p.account.findMany({ where: { isActive: true } }),
    ]);

    const totalRevenue = revenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const netResult = totalRevenue - totalExpense;
    const totalBalance = accounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0);

    return {
      totalRevenue,
      totalExpense,
      netResult,
      totalBalance,
      revenueCount: revenues.length,
      expenseCount: expenses.length,
      accountCount: accounts.length,
      period: { startDate, endDate },
    };
  }

  async getProfitLossReport(params: { startDate?: Date; endDate?: Date }) {
    const { startDate, endDate } = params;
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.gte = startDate;
      if (endDate) dateFilter.date.lte = endDate;
    }

    const [revenues, expenses] = await Promise.all([
      this.p.revenue.findMany({ where: dateFilter, orderBy: { date: 'desc' } }),
      this.p.expense.findMany({ where: dateFilter, orderBy: { date: 'desc' } }),
    ]);

    const totalRevenue = revenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpense;

    // Grouper par catégorie
    const revenueByCategory: Record<string, number> = {};
    revenues.forEach((r: any) => {
      const cat = r.category || 'Non catégorisé';
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(r.amount);
    });

    const expenseByCategory: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'Non catégorisé';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount);
    });

    return {
      period: { startDate, endDate },
      totalRevenue,
      totalExpense,
      netProfit,
      margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) + '%' : 'N/A',
      revenueByCategory,
      expenseByCategory,
      revenues,
      expenses,
    };
  }
}