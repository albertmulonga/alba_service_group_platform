import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const prisma = this.prisma as any;
    const [
      totalCustomers,
      totalOrders,
      totalInvoices,
      totalEmployees,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.salesOrder.count(),
      prisma.invoice.count(),
      prisma.employee.count(),
      prisma.salesOrder.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: true } }),
      prisma.product.findMany({ where: { currentStock: { lte: prisma.product.minStock } }, include: { category: true } }),
    ]);
    return { totalCustomers, totalOrders, totalInvoices, totalEmployees, recentOrders, lowStockProducts };
  }

  async getSalesReport(filters: any) {
    const prisma = this.prisma as any;
    return prisma.salesOrder.findMany({ include: { customer: true, items: true } });
  }

  async getFinanceReport(filters: any) {
    const prisma = this.prisma as any;
    const [revenues, expenses] = await Promise.all([
      prisma.revenue.findMany(),
      prisma.expense.findMany(),
    ]);
    const totalRevenue = revenues.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    return { revenues, expenses, totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses };
  }
}
