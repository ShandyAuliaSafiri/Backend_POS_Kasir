import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailyReport(date: string) {
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');
    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: {
        items: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });
    const totalIncome = transactions.reduce(
      (sum, trx) => sum + trx.totalPrice,
      0,
    );
    const totalTx = transactions.length;
    return { date, totalIncome, totalTx, transactions };
  }

  async getMonthlyReport(year: number, month: number) {
    const start = new Date(
      `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`,
    );
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        items: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });
    const totalIncome = transactions.reduce(
      (sum, trx) => sum + trx.totalPrice,
      0,
    );
    const totalTx = transactions.length;
    return { year, month, totalIncome, totalTx, transactions };
  }

  async getYearlyReport(year: number) {
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    const transactions = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        items: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });
    const totalIncome = transactions.reduce(
      (sum, trx) => sum + trx.totalPrice,
      0,
    );
    const totalTx = transactions.length;
    return { year, totalIncome, totalTx, transactions };
  }

  async getDashboardStats() {
    // Hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dailyTx = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      include: {
        items: true,
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });
    const dailyIncome = dailyTx.reduce((sum, trx) => sum + trx.totalPrice, 0);

    // Bulan ini
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const monthlyTx = await this.prisma.transaction.findMany({
      where: { createdAt: { gte: firstDay, lt: nextMonth } },
      include: {
        user: {
          select: {
            username: true,
            role: true,
          },
        },
      },
    });
    const monthlyIncome = monthlyTx.reduce(
      (sum, trx) => sum + trx.totalPrice,
      0,
    );

    // Produk terlaris bulan ini
    const items = await this.prisma.transactionItem.findMany({
      where: { transaction: { createdAt: { gte: firstDay, lt: nextMonth } } },
      include: { product: true },
    });
    const productSales: Record<string, { name: string; qty: number }> = {};
    items.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.product.name, qty: 0 };
      }
      productSales[item.productId].qty += item.quantity;
    });
    const bestSeller = Object.values(productSales).sort(
      (a, b) => b.qty - a.qty,
    )[0];

    return {
      dailyIncome,
      dailyTxCount: dailyTx.length,
      monthlyIncome,
      monthlyTxCount: monthlyTx.length,
      bestSeller: bestSeller || null,
    };
  }

  // ...method lain...
}
