/**
 * Global Application Constants & Enumerations
 * Digital Printing & POS Nota System
 */

export const PAPER_SIZES = {
  THERMAL_80: '80mm',
  THERMAL_58: '58mm',
  A5: 'A5',
  A4: 'A4',
  CUSTOM: 'custom'
};

export const PAPER_TAB_OPTIONS = [
  { id: '80mm', label: 'Thermal 80mm', icon: 'ri-printer-line' },
  { id: '58mm', label: 'Thermal 58mm', icon: 'ri-receipt-line' },
  { id: 'A5', label: 'Kertas A5', icon: 'ri-file-list-2-line' },
  { id: 'A4', label: 'Kertas A4', icon: 'ri-file-text-line' },
  { id: 'custom', label: 'Kustom', icon: 'ri-ruler-2-line' }
];

export const PAY_STATUS = {
  LUNAS: 'Lunas',
  DP: 'DP',
  BELUM_BAYAR: 'Belum Bayar',
  DIBATALKAN: 'Dibatalkan'
};

export const PAY_STATUS_OPTIONS = [
  { value: 'Lunas', label: 'LUNAS' },
  { value: 'DP', label: 'DP (Uang Muka)' },
  { value: 'Belum Bayar', label: 'Belum Bayar' }
];

export const HISTORY_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'Lunas', label: 'LUNAS' },
  { value: 'DP', label: 'Uang Muka (DP)' },
  { value: 'Belum Bayar', label: 'BELUM LUNAS' },
  { value: 'Dibatalkan', label: 'DIBATALKAN' }
];

export const ORDER_STATUS = {
  PROSES_CETAK: 'Proses Cetak',
  DESAIN_EDIT: 'Desain / Edit',
  SELESAI_SIAP_AMBIL: 'Selesai Siap Ambil',
  TELAH_DIAMBIL: 'Telah Diambil'
};

export const ORDER_STATUS_OPTIONS = [
  { value: 'Proses Cetak', label: 'Proses Cetak' },
  { value: 'Desain / Edit', label: 'Desain / Edit' },
  { value: 'Selesai Siap Ambil', label: 'Selesai Siap Ambil' },
  { value: 'Telah Diambil', label: 'Telah Diambil' }
];

export const PAY_METHOD = {
  TRANSFER: 'Transfer',
  CASH: 'Cash',
  QRIS: 'QRIS',
  COD: 'COD'
};

export const PAY_METHOD_OPTIONS = [
  { value: 'Transfer', label: 'Transfer Bank' },
  { value: 'Cash', label: 'Tunai / Cash' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'COD', label: 'COD (Bayar di Tempat)' }
];

export const PICKUP_METHOD = {
  DITUNGGU: 'Ditunggu',
  DIAMBIL: 'Diambil',
  DIANTAR: 'Diantar'
};

export const PICKUP_OPTIONS = [
  { value: 'Ditunggu', label: 'Ditunggu' },
  { value: 'Diambil', label: 'Diambil Sendiri' },
  { value: 'Diantar', label: 'Diantar / Kurir' }
];

export const ITEM_TYPE = {
  M2: 'm2',
  PCS: 'pcs',
  RIM: 'rim',
  PACK: 'pack',
  BUKU: 'buku'
};

export const ITEM_TYPE_OPTIONS = [
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Pcs / Satuan' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Cetak Buku / Booklet' }
];

export const CATALOG_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Satuan (pcs)' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Buku / Booklet' }
];

export const BOOK_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4 (21×29.7cm)' },
  { value: 'A5', label: 'A5 (14.8×21cm)' },
  { value: 'B5', label: 'B5 (17.6×25cm)' },
  { value: 'F4', label: 'F4 / Folio' },
  { value: 'Custom', label: 'Ukuran Custom' }
];

export const BOOK_BINDING_OPTIONS = [
  { value: 'Perfect Binding', label: 'Perfect Binding (Lem Panas)' },
  { value: 'Saddle Stitch', label: 'Saddle Stitch (Staples Tengah)' },
  { value: 'Hard Cover', label: 'Hard Cover (Jilid Keras)' },
  { value: 'Spiral', label: 'Spiral / Ring' },
  { value: 'Staples', label: 'Staples Samping' }
];

export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin'
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin / Operator Kasir (Hanya Cetak Nota)' },
  { value: 'superadmin', label: 'Superadmin (Akses Bebas Tanpa Batas)' }
];
