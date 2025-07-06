import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import { exportReportToExcel } from './utils/export-excel';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  quantity: number;
  subtotal: number;
}

interface User {
  id: string;
  username: string;
}

interface Transaction {
  id: string;
  userId: string;
  user?: User;
  totalPrice: number;
  paidAmount: number;
  change: number;
  paymentMethod?: string;
  items: TransactionItem[];
  createdAt: Date;
}

interface DailyReport {
  date: string;
  totalIncome: number;
  totalTx: number;
  transactions: {
    id: string;
    userId: string;
    totalPrice: number;
    paidAmount: number;
    change: number;
    createdAt: Date;
    paymentMethod: string;
    user: {
      username: string;
      role: string;
    };
    items: {
      id: string;
      transactionId: string;
      productId: string;
      quantity: number;
      subtotal: number;
    }[];
  }[];
}

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('daily')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kasir')
  getDaily(@Query('date') date: string) {
    return this.reportsService.getDailyReport(date);
  }

  @Get('monthly')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getMonthly(@Query('year') year: string, @Query('month') month: string) {
    return this.reportsService.getMonthlyReport(Number(year), Number(month));
  }

  @Get('yearly')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getYearly(@Query('year') year: string) {
    return this.reportsService.getYearlyReport(Number(year));
  }

  @Get('export/daily')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async exportDaily(@Query('date') date: string, @Res() res: Response) {
    try {
      if (!date) {
        return res.status(400).json({ message: 'Tanggal harus diisi' });
      }

      // Validasi format tanggal
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res
          .status(400)
          .json({ message: 'Format tanggal harus YYYY-MM-DD' });
      }

      // Cek apakah tanggal valid
      const isValidDate = !isNaN(new Date(date).getTime());
      if (!isValidDate) {
        return res.status(400).json({ message: 'Tanggal tidak valid' });
      }

      // Cek apakah tanggal di masa depan
      const inputDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (inputDate > today) {
        return res.status(400).json({
          message: 'Tidak bisa mengunduh laporan untuk tanggal di masa depan',
        });
      }

      const report = (await this.reportsService.getDailyReport(
        date,
      )) as DailyReport;

      // Cek apakah ada transaksi
      if (!report.transactions || report.transactions.length === 0) {
        return res
          .status(404)
          .json({ message: 'Tidak ada transaksi untuk tanggal ini' });
      }

      // Format data transaksi dengan informasi user
      const formattedTransactions = report.transactions.map((trx) => ({
        ...trx,
        kasir: trx.user?.username || trx.userId,
        totalItems: trx.items.reduce((sum, item) => sum + item.quantity, 0),
        metodePembayaran: trx.paymentMethod || 'Tunai',
      }));

      const columns = [
        { header: 'ID Transaksi', key: 'id', width: 30 },
        { header: 'Total (Rp)', key: 'totalPrice', width: 15 },
        { header: 'Jumlah Item', key: 'totalItems', width: 12 },
        { header: 'Metode Pembayaran', key: 'metodePembayaran', width: 18 },
        { header: 'Kasir', key: 'kasir', width: 20 },
        { header: 'Waktu Transaksi', key: 'createdAt', width: 25 },
      ];

      const buffer = await exportReportToExcel(
        formattedTransactions,
        `laporan-harian-${date}.xlsx`,
        columns,
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=laporan-harian-${date}.xlsx`,
      );
      return res.send(buffer);
    } catch (error) {
      console.error('Error saat export laporan:', error);
      if (error.message === 'Data kosong') {
        return res
          .status(404)
          .json({ message: 'Tidak ada transaksi untuk tanggal ini' });
      }
      return res.status(500).json({
        message: 'Gagal mengekspor laporan: ' + error.message,
      });
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kasir')
  @Get('dashboard')
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }
}
