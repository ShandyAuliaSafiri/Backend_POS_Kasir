import ExcelJS from 'exceljs';

interface Column {
  header: string;
  key: string;
  width: number;
}

interface Transaction {
  id: string;
  totalPrice: number;
  userId: string;
  createdAt: Date;
}

export async function exportReportToExcel(
  data: Transaction[],
  filename: string,
  columns: Column[],
) {
  try {
    // Validasi input
    if (!Array.isArray(data)) {
      throw new Error('Data harus berupa array');
    }

    if (!Array.isArray(columns)) {
      throw new Error('Columns harus berupa array');
    }

    if (data.length === 0) {
      throw new Error('Data kosong');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan');

    // Set properti workbook
    workbook.creator = 'Kasir App';
    workbook.created = new Date();

    // Set kolom dengan style
    worksheet.columns = columns.map((col) => ({
      ...col,
      style: {
        alignment: { vertical: 'middle' },
        numFmt: col.key === 'totalPrice' ? '#,##0' : undefined,
      },
    }));

    // Format data sebelum ditambahkan
    const formattedData = data.map((item) => {
      const row = {};
      columns.forEach((col) => {
        if (col.key === 'createdAt' && item[col.key]) {
          // Format tanggal
          const date = new Date(item[col.key]);
          row[col.key] = date.toLocaleString('id-ID', {
            dateStyle: 'full',
            timeStyle: 'short',
          });
        } else if (col.key === 'totalPrice') {
          // Format angka tanpa pemisah ribuan (akan diformat oleh Excel)
          row[col.key] = item[col.key];
        } else {
          row[col.key] = item[col.key];
        }
      });
      return row;
    });

    // Tambahkan data
    worksheet.addRows(formattedData);

    // Styling header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column) {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 30);
      }
    });

    // Border untuk semua cell
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Buffer file
    const buffer = await workbook.xlsx.writeBuffer();

    // Validasi buffer menggunakan Buffer.isBuffer
    if (!Buffer.isBuffer(buffer) || !buffer.byteLength) {
      throw new Error('Gagal membuat file Excel');
    }

    return buffer;
  } catch (error) {
    console.error('Error saat membuat file Excel:', error);
    throw error;
  }
}
