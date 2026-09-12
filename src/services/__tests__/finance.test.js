import { describe, it, expect } from 'vitest';
import {
  calculateFinanceSummary,
  generatePurchaseNumber,
  exportFinanceToCsv
} from '../storage';

describe('Finance Engine & Reporting Unit Tests', () => {
  const mockHistory = [
    {
      id: 'nota-1',
      date: '2026-09-10',
      grandTotal: 500000,
      payStatus: 'Lunas',
      notaNumber: 'NOTA-20260910-001',
      customerName: 'Customer A'
    },
    {
      id: 'nota-2',
      date: '2026-09-12',
      grandTotal: 300000,
      payStatus: 'Lunas',
      notaNumber: 'NOTA-20260912-002',
      customerName: 'Customer B'
    },
    {
      id: 'nota-3',
      date: '2026-09-12',
      grandTotal: 200000,
      payStatus: 'Dibatalkan', // Cancelled notes should not be counted in revenue
      notaNumber: 'NOTA-20260912-003',
      customerName: 'Customer C'
    }
  ];

  const mockPurchases = [
    {
      id: 'pur-1',
      tanggal: '2026-09-10',
      namaP1: 'Vendor Kertas',
      noPembelian: 'BLI-20260910-101',
      grandTotal: 250000,
      kategori: 'Pembelian P1'
    }
  ];

  const mockExpenses = [
    {
      id: 'exp-1',
      tanggal: '2026-09-11',
      kategori: 'Transport',
      keterangan: 'Bensin kurir delivery',
      jumlah: 50000
    },
    {
      id: 'exp-2',
      tanggal: '2026-09-12',
      kategori: 'Listrik & Utilitas',
      keterangan: 'Token listrik workshop',
      jumlah: 100000
    }
  ];

  const mockOtherIncome = [
    {
      id: 'inc-1',
      tanggal: '2026-09-12',
      sumber: 'Infaq / Hibah',
      keterangan: 'Dana hibah peralatan',
      jumlah: 150000
    }
  ];

  describe('calculateFinanceSummary', () => {
    it('calculates total revenue, expense, and net profit correctly', () => {
      const summary = calculateFinanceSummary(
        mockHistory,
        mockPurchases,
        mockExpenses,
        mockOtherIncome
      );

      // Total Pemasukan: nota-1 (500k) + nota-2 (300k) [nota-3 cancelled ignored] + otherIncome (150k) = 950,000
      expect(summary.totalPemasukan).toBe(950000);
      expect(summary.totalOmsetNota).toBe(800000);
      expect(summary.totalOtherIncome).toBe(150000);
      expect(summary.countNota).toBe(2);
      expect(summary.countOtherIncome).toBe(1);

      // Total Pengeluaran: purchases (250k) + expenses (50k + 100k = 150k) = 400,000
      expect(summary.totalPengeluaran).toBe(400000);
      expect(summary.totalPurchasesP1).toBe(250000);
      expect(summary.totalExpenses).toBe(150000);

      // Laba Bersih: 950,000 - 400,000 = 550,000
      expect(summary.labaBersih).toBe(550000);
    });

    it('filters financial records correctly by date range', () => {
      const filtered = calculateFinanceSummary(
        mockHistory,
        mockPurchases,
        mockExpenses,
        mockOtherIncome,
        '2026-09-12',
        '2026-09-12'
      );

      // Only records from 2026-09-12:
      // In: nota-2 (300k) + otherIncome (150k) = 450,000
      // Out: exp-2 (100k) = 100,000
      // Net: 350,000
      expect(filtered.totalPemasukan).toBe(450000);
      expect(filtered.totalPengeluaran).toBe(100000);
      expect(filtered.labaBersih).toBe(350000);
    });

    it('handles empty inputs safely without throwing NaN or crashing', () => {
      const empty = calculateFinanceSummary([], [], [], []);
      expect(empty.totalPemasukan).toBe(0);
      expect(empty.totalPengeluaran).toBe(0);
      expect(empty.labaBersih).toBe(0);
    });
  });

  describe('generatePurchaseNumber', () => {
    it('generates unique purchase reference numbers with BLI-YYYYMMDD-XXX format', () => {
      const existing = [{ noPembelian: 'BLI-20260912-111' }];
      const no = generatePurchaseNumber(existing);
      expect(no).toMatch(/^BLI-\d{8}-\d{3}$/);
      expect(no).not.toBe('BLI-20260912-111');
    });
  });

  describe('exportFinanceToCsv', () => {
    it('generates valid CSV content with headers and summary rows', () => {
      const summary = calculateFinanceSummary(
        mockHistory,
        mockPurchases,
        mockExpenses,
        mockOtherIncome
      );
      const csv = exportFinanceToCsv(
        summary,
        mockHistory,
        mockPurchases,
        mockExpenses,
        mockOtherIncome
      );

      expect(csv).toContain('LAPORAN KEUANGAN NOTA PERCETAKAN');
      expect(csv).toContain('RINGKASAN KEUANGAN');
      expect(csv).toContain('RINCIAN MEMBAYAR (PENGELUARAN)');
      expect(csv).toContain('RINCIAN MENERIMA (PEMASUKAN)');
      expect(csv).toContain('Vendor Kertas');
      expect(csv).toContain('Bensin kurir delivery');
    });
  });
});
