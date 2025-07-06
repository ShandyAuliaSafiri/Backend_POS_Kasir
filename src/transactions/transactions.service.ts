import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

interface TransactionItem {
  productId: string;
  quantity: number;
  subtotal: number;
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(dto: CreateTransactionDto) {
    console.log('Creating transaction with data:', dto);

    try {
      // Jalankan semua operasi dalam satu transaksi database dengan isolasi
      const result = await this.prisma.$transaction(
        async (prisma) => {
          // 1. Ambil data produk terbaru
          const products = await prisma.product.findMany({
            where: {
              id: {
                in: dto.items.map((i) => i.productId),
              },
            },
            orderBy: { id: 'asc' }, // Untuk menghindari deadlock
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
            },
          });

          console.log('Found products:', products);

          if (products.length !== dto.items.length) {
            throw new BadRequestException('Beberapa produk tidak ditemukan');
          }

          let totalPrice = 0;
          const transactionItems: TransactionItem[] = [];

          // 2. Update stok untuk setiap item
          for (const item of dto.items) {
            const product = products.find((p) => p.id === item.productId);
            if (!product) {
              throw new BadRequestException(
                `Produk dengan ID ${item.productId} tidak ditemukan`,
              );
            }

            console.log(`Processing item ${product.name}:`, {
              currentStock: product.stock,
              requestedQuantity: item.quantity,
            });

            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `Stok tidak mencukupi untuk produk ${product.name}. Sisa stok: ${product.stock}`,
              );
            }

            const subtotal = product.price * item.quantity;
            totalPrice += subtotal;

            // Update stok produk
            console.log(
              `Updating stock for ${product.name}: ${product.stock} -> ${product.stock - item.quantity}`,
            );

            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });

            // Verifikasi update berhasil
            const updatedProduct = await prisma.product.findUnique({
              where: { id: item.productId },
              select: {
                id: true,
                name: true,
                stock: true,
              },
            });

            if (
              !updatedProduct ||
              updatedProduct.stock !== product.stock - item.quantity
            ) {
              throw new Error(`Gagal update stok untuk produk ${product.name}`);
            }

            transactionItems.push({
              productId: item.productId,
              quantity: item.quantity,
              subtotal,
            });
          }

          const change = dto.paidAmount - totalPrice;

          // 3. Buat record transaksi
          console.log('Creating transaction record...');
          const transaction = await prisma.transaction.create({
            data: {
              userId: dto.userId,
              totalPrice,
              paidAmount: dto.paidAmount,
              change,
              items: {
                create: transactionItems,
              },
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
              user: true,
            },
          });

          // 4. Verifikasi stok setelah update
          const updatedProducts = await prisma.product.findMany({
            where: {
              id: {
                in: dto.items.map((i) => i.productId),
              },
            },
            select: {
              id: true,
              name: true,
              stock: true,
            },
          });

          console.log(
            'Final products stock:',
            updatedProducts.map((p) => ({
              id: p.id,
              name: p.name,
              stock: p.stock,
            })),
          );

          return transaction;
        },
        {
          timeout: 10000, // 10 detik timeout
          isolationLevel: 'Serializable', // Level isolasi tertinggi
        },
      );

      console.log('Transaction completed successfully');
      return result;
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    }
  }

  async findAll() {
    return this.prisma.transaction.findMany({
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
  }

  async findOne(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async getReceipt(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, role: true } },
        items: {
          include: {
            product: { select: { name: true, price: true } },
          },
        },
      },
    });
  }
}
