import { describe, it, expect } from 'vitest';
import {
  calculateItemTotal,
  formatRupiah,
  formatDateId,
  formatItemSummary,
  generateReceiptNumber,
  generateCompactNotaText
} from '../storage';

describe('Storage & Calculation Unit Tests', () => {
  describe('calculateItemTotal', () => {
    it('calculates m2 item total accurately (length in cm x width in cm x qty x price)', () => {
      const item = {
        type: 'm2',
        length: 200, // 2m
        width: 150,  // 1.5m -> 3 m2
        qty: 2,      // 6 m2 total
        price: 25000
      };
      // 2m * 1.5m * 2 * 25000 = 150,000
      expect(calculateItemTotal(item)).toBe(150000);
    });

    it('calculates standard pcs / rim / pack items (qty x price)', () => {
      const pcsItem = { type: 'pcs', qty: 10, price: 5000 };
      expect(calculateItemTotal(pcsItem)).toBe(50000);

      const rimItem = { type: 'rim', qty: 3, price: 45000 };
      expect(calculateItemTotal(rimItem)).toBe(135000);

      const bookItem = { type: 'buku', qty: 50, price: 20000 };
      expect(calculateItemTotal(bookItem)).toBe(1000000);
    });

    it('handles negative or invalid values safely with non-negative clamping', () => {
      const negativeItem = { type: 'pcs', qty: -5, price: 5000 };
      expect(calculateItemTotal(negativeItem)).toBe(0);

      const negativePriceItem = { type: 'pcs', qty: 5, price: -5000 };
      expect(calculateItemTotal(negativePriceItem)).toBe(0);

      expect(calculateItemTotal(null)).toBe(0);
    });
  });

  describe('formatRupiah', () => {
    it('formats numbers into standard Indonesian Rupiah currency', () => {
      const formatted = formatRupiah(50000);
      expect(formatted).toContain('50.000');
      expect(formatted).toContain('Rp');

      const zeroFormatted = formatRupiah(0);
      expect(zeroFormatted).toContain('0');
      expect(zeroFormatted).toContain('Rp');
    });

    it('handles null and undefined safely without throwing', () => {
      expect(formatRupiah(null)).toContain('0');
      expect(formatRupiah(undefined)).toContain('0');
    });
  });

  describe('formatDateId', () => {
    it('formats ISO YYYY-MM-DD date string into DD/MM/YYYY', () => {
      expect(formatDateId('2026-08-13')).toBe('13/08/2026');
      expect(formatDateId('2026-01-05')).toBe('05/01/2026');
    });

    it('handles empty date string gracefully', () => {
      expect(formatDateId('')).toBe('');
      expect(formatDateId(null)).toBe('');
    });
  });

  describe('formatItemSummary', () => {
    it('formats single-line item summary for reports and tables', () => {
      const item = {
        name: 'Brosur Promosi',
        type: 'pcs',
        qty: 100,
        price: 500
      };
      const summary = formatItemSummary(item, 'single-line');
      expect(summary).toContain('Brosur Promosi');
      expect(summary).toContain('100 PCS');
      expect(summary).toContain('50.000');
    });

    it('formats item specs correctly', () => {
      const banner = {
        name: 'Spanduk Banner',
        type: 'm2',
        length: 300,
        width: 100,
        finishing: 'Mata Ayam 4 Sudut'
      };
      const specs = formatItemSummary(banner, 'specs');
      expect(specs).toContain('300×100 cm');
      expect(specs).toContain('Finishing: Mata Ayam 4 Sudut');
    });
  });

  describe('generateReceiptNumber', () => {
    it('generates standard receipt number matching NOTA-YYYYMMDD-XXX format', () => {
      const receiptNo = generateReceiptNumber();
      expect(receiptNo).toMatch(/^NOTA-\d{8}-\d{3}$/);
    });
  });

  describe('generateCompactNotaText', () => {
    it('generates compact QR text with Sisa for Belum Lunas and DP statuses', () => {
      const store = { name: 'Pustaka Bakid' };
      const transaction = {
        noNota: 'NOTA-20260815-123',
        custName: 'Ahmad',
        date: '2026-08-15',
        payStatus: 'Belum Lunas'
      };
      const items = [{ name: 'Spanduk', type: 'pcs', qty: 2, price: 50000 }];
      const text = generateCompactNotaText(store, transaction, items, 100000, 100000);
      expect(text).toContain('E-NOTA [Pustaka Bakid]');
      expect(text).toContain('NOTA-20260815-123');
      expect(text).toContain('Belum Lunas');
      expect(text).toContain('Sisa:');
    });
  });
});
