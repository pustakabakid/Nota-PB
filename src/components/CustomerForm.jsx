import React from 'react';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';

const ORDER_STATUS_OPTIONS = [
  { value: 'Proses Cetak', label: 'Proses Cetak' },
  { value: 'Desain / Edit', label: 'Desain / Edit' },
  { value: 'Selesai Siap Ambil', label: 'Selesai Siap Ambil' },
  { value: 'Telah Diambil', label: 'Telah Diambil' }
];

const PAY_METHOD_OPTIONS = [
  { value: 'Transfer', label: 'Transfer Bank' },
  { value: 'Cash', label: 'Tunai / Cash' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'COD', label: 'COD (Bayar di Tempat)' }
];

const PICKUP_OPTIONS = [
  { value: 'Ditunggu', label: 'Ditunggu' },
  { value: 'Diambil', label: 'Diambil Sendiri' },
  { value: 'Diantar', label: 'Diantar / Kurir' }
];

export default function CustomerForm({ transaction, onChange }) {
  return (
    <div className="fluent-card">
      <h2 className="card-title">
        <i className="ri-user-3-line"></i> Informasi Pelanggan & Transaksi
      </h2>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="custName">Nama Pelanggan / Instansi</label>
          <input
            type="text"
            id="custName"
            className="form-control"
            placeholder="Nama pelanggan / instansi"
            value={transaction.custName}
            onChange={(e) => onChange('custName', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="custPhone">Nomor WhatsApp / HP</label>
          <input
            type="tel"
            id="custPhone"
            className="form-control"
            placeholder="081234567890"
            value={transaction.custPhone}
            onChange={(e) => onChange('custPhone', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="custAddress">Alamat Pelanggan</label>
          <input
            type="text"
            id="custAddress"
            className="form-control"
            placeholder="Alamat / kota pelanggan"
            value={transaction.custAddress || ''}
            onChange={(e) => onChange('custAddress', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal Transaksi</label>
          <CustomDatePicker
            value={transaction.date}
            onChange={(newDate) => onChange('date', newDate)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status Pekerjaan</label>
          <CustomSelect
            options={ORDER_STATUS_OPTIONS}
            value={transaction.orderStatus}
            onChange={(val) => onChange('orderStatus', val)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Metode Pembayaran</label>
          <CustomSelect
            options={PAY_METHOD_OPTIONS}
            value={transaction.payMethod || 'Transfer'}
            onChange={(val) => onChange('payMethod', val)}
          />
        </div>
        {transaction.payMethod === 'Transfer' && (
          <div className="form-group">
            <label className="form-label">Nama Bank</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nama bank / e-wallet"
              value={transaction.bankName || ''}
              onChange={(e) => onChange('bankName', e.target.value)}
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Pengambilan</label>
          <CustomSelect
            options={PICKUP_OPTIONS}
            value={transaction.pickupMethod || 'Ditunggu'}
            onChange={(val) => onChange('pickupMethod', val)}
          />
        </div>
      </div>
    </div>
  );
}
