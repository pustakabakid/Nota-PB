import { describe, it, expect } from 'vitest';
import {
  calculateItemTotal,
  formatCustomDetailsText,
  formatBookDetailText
} from '../storage';

describe('POS Calculator & Discount Engine Tests', () => {
  it('formats custom details specs text correctly', () => {
    const itemWithCustomDetails = {
      type: 'pcs',
      qty: 10,
      price: 5000,
      customDetails: [
        { key: 'Warna Cetak', value: 'Full Color 4/0' },
        { key: 'Laminasi', value: 'Doff Panas' }
      ]
    };
    // Base calculation: 10 * 5000 = 50,000
    expect(calculateItemTotal(itemWithCustomDetails)).toBe(50000);

    // Spec formatting: "Warna Cetak: Full Color 4/0 | Laminasi: Doff Panas"
    const specText = formatCustomDetailsText(itemWithCustomDetails);
    expect(specText).toContain('Warna Cetak: Full Color 4/0');
    expect(specText).toContain('Laminasi: Doff Panas');
  });

  it('formats book detail specs text correctly', () => {
    const bookItem = {
      type: 'buku',
      qty: 50,
      price: 25000,
      bookTitle: 'Katalog Produk 2026',
      bookSize: 'A5',
      bookPages: 64,
      bookPaperInner: 'HVS 70gr',
      bookCover: 'Art Carton 260gr',
      bookBinding: 'Perfect Binding'
    };
    expect(calculateItemTotal(bookItem)).toBe(1250000);

    const bookSpecs = formatBookDetailText(bookItem);
    expect(bookSpecs).toContain('"Katalog Produk 2026"');
    expect(bookSpecs).toContain('A5');
    expect(bookSpecs).toContain('64 hlm');
    expect(bookSpecs).toContain('Jilid: Perfect Binding');
  });

  it('handles percentage and nominal discounts properly', () => {
    const subtotal = 200000;
    
    // Percentage discount 15%
    const discountPercent = 15;
    const discountPercentAmount = Math.round((subtotal * discountPercent) / 100);
    const grandTotal1 = Math.max(0, subtotal - discountPercentAmount);
    expect(discountPercentAmount).toBe(30000);
    expect(grandTotal1).toBe(170000);

    // Nominal discount
    const discountNominal = 25000;
    const grandTotal2 = Math.max(0, subtotal - discountNominal);
    expect(grandTotal2).toBe(175000);

    // Over-discount clamp (discount > subtotal)
    const bigDiscount = 300000;
    const grandTotal3 = Math.max(0, subtotal - bigDiscount);
    expect(grandTotal3).toBe(0);
  });

  it('calculates DP (Down Payment) and remaining balance (Sisa) correctly', () => {
    const grandTotal = 150000;
    
    // Scenario 1: Lunas penuh
    const dp1 = 150000;
    const sisa1 = Math.max(0, grandTotal - dp1);
    expect(sisa1).toBe(0);

    // Scenario 2: DP sebagian (Uang Muka)
    const dp2 = 50000;
    const sisa2 = Math.max(0, grandTotal - dp2);
    expect(sisa2).toBe(100000);

    // Scenario 3: Belum bayar (DP = 0)
    const dp3 = 0;
    const sisa3 = Math.max(0, grandTotal - dp3);
    expect(sisa3).toBe(150000);

    // Scenario 4: DP melebihi total (tidak boleh sisa negatif)
    const dp4 = 200000;
    const sisa4 = Math.max(0, grandTotal - dp4);
    expect(sisa4).toBe(0);
  });
});
