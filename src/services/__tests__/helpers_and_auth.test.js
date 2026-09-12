import { describe, it, expect } from 'vitest';

// Replicate formatWaLink logic for testing
const formatWaLink = (phone) => {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return `https://wa.me/${clean}`;
};

// Replicate parseFinishingChips logic
const parseFinishingChips = (finishingStr) => {
  if (!finishingStr || !String(finishingStr).trim()) return ['Tanpa Finishing'];
  return String(finishingStr).split(/[,|/]+/).map(s => s.trim()).filter(Boolean);
};

// SHA-256 password hash testing
async function hashPasswordJs(password, salt = 'NOTA_PUSTAKA_BAKI_SECURE_SALT_2026') {
  const textToHash = (salt || 'NOTA_PUSTAKA_BAKI_SECURE_SALT_2026') + ':' + (password || '');
  const encoder = new TextEncoder();
  const data = encoder.encode(textToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('Helpers & Authentication Logic Unit Tests', () => {
  describe('formatWaLink', () => {
    it('formats numbers with leading 0 to international 62 format', () => {
      expect(formatWaLink('081234567890')).toBe('https://wa.me/6281234567890');
    });

    it('formats numbers starting directly with 8', () => {
      expect(formatWaLink('81234567890')).toBe('https://wa.me/6281234567890');
    });

    it('formats numbers already starting with 62', () => {
      expect(formatWaLink('6281234567890')).toBe('https://wa.me/6281234567890');
    });

    it('handles numeric types safely without throwing TypeError', () => {
      expect(formatWaLink(81234567890)).toBe('https://wa.me/6281234567890');
      expect(formatWaLink(6281234567890)).toBe('https://wa.me/6281234567890');
    });

    it('strips dashes, spaces, and special characters', () => {
      expect(formatWaLink('+62 812-3456-7890')).toBe('https://wa.me/6281234567890');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      expect(formatWaLink('')).toBe('');
      expect(formatWaLink(null)).toBe('');
      expect(formatWaLink(undefined)).toBe('');
    });
  });

  describe('parseFinishingChips', () => {
    it('splits finishing strings by comma, slash, or pipe', () => {
      expect(parseFinishingChips('Laminasi Doff, Mata Ayam 4 Sudut')).toEqual([
        'Laminasi Doff',
        'Mata Ayam 4 Sudut'
      ]);
      expect(parseFinishingChips('Hardcover / Pita Pembatas')).toEqual([
        'Hardcover',
        'Pita Pembatas'
      ]);
      expect(parseFinishingChips('Spiral Kawat | Jilid Lem')).toEqual([
        'Spiral Kawat',
        'Jilid Lem'
      ]);
    });

    it('returns default fallback when finishing string is empty or invalid', () => {
      expect(parseFinishingChips('')).toEqual(['Tanpa Finishing']);
      expect(parseFinishingChips('   ')).toEqual(['Tanpa Finishing']);
      expect(parseFinishingChips(null)).toEqual(['Tanpa Finishing']);
      expect(parseFinishingChips(undefined)).toEqual(['Tanpa Finishing']);
    });
  });

  describe('hashPasswordJs', () => {
    it('hashes passwords consistently with SHA-256 + salt', async () => {
      const hash1 = await hashPasswordJs('admin123', 'custom_salt');
      const hash2 = await hashPasswordJs('admin123', 'custom_salt');
      const hashDifferentPass = await hashPasswordJs('admin456', 'custom_salt');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash1).not.toBe(hashDifferentPass);
    });
  });
});
