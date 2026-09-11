import React, { useState } from 'react';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';
import { ORDER_STATUS_OPTIONS, PAY_METHOD_OPTIONS, PICKUP_OPTIONS } from '../constants/appConstants';

/* ─────────────────────────────────────────────────────────────
   MOBILE LAYOUT — Progressive Disclosure
   Priority visible: Nama, WA, Tanggal
   Collapsed by default: Alamat, Status, Metode Bayar, Pengambilan
   ───────────────────────────────────────────────────────────── */
function CustomerFormMobile({ transaction, onChange, onSwitchMobileTab }) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="cf-mobile-card" role="region" aria-label="Informasi Pelanggan">
      {/* ── Priority Fields (always visible) ── */}
      <div className="cf-mobile-priority">
        <div className="form-group">
          <label className="form-label" htmlFor="custName-m">
            <span className="material-symbols-outlined" aria-hidden="true">person</span> Nama Pelanggan
          </label>
          <input
            type="text"
            id="custName-m"
            className="form-control"
            placeholder="Nama / instansi pelanggan"
            value={transaction.custName}
            onChange={(e) => onChange('custName', e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="cf-mobile-row2">
          <div className="form-group">
            <label className="form-label" htmlFor="custPhone-m">
              <span className="material-symbols-outlined" aria-hidden="true">phone</span> No. WA / HP
            </label>
            <input
              type="tel"
              id="custPhone-m"
              className="form-control"
              placeholder="0812..."
              value={transaction.custPhone}
              onChange={(e) => onChange('custPhone', e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              <span className="material-symbols-outlined" aria-hidden="true">calendar_today</span> Tanggal
            </label>
            <CustomDatePicker
              value={transaction.date}
              onChange={(newDate) => onChange('date', newDate)}
            />
          </div>
        </div>
      </div>

      {/* ── Progressive Disclosure Toggle ── */}
      <button
        type="button"
        className="cf-mobile-expand-btn"
        onClick={() => setIsDetailOpen((v) => !v)}
        aria-expanded={isDetailOpen}
        aria-controls="cf-detail-panel"
      >
        <span>
          <span className="material-symbols-outlined" aria-hidden="true">tune</span>
          {isDetailOpen ? 'Sembunyikan Detail' : 'Detail Transaksi'}
          {!isDetailOpen && transaction.orderStatus && (
            <span className="cf-status-preview"> · {transaction.orderStatus}</span>
          )}
        </span>
        <span
          className={`material-symbols-outlined cf-expand-chevron${isDetailOpen ? ' open' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* ── Expanded Detail Fields ── */}
      {isDetailOpen && (
        <div id="cf-detail-panel" className="cf-mobile-detail">
          <div className="form-group">
            <label className="form-label" htmlFor="custAddress-m">Alamat Pelanggan</label>
            <input
              type="text"
              id="custAddress-m"
              className="form-control"
              placeholder="Alamat / kota"
              value={transaction.custAddress || ''}
              onChange={(e) => onChange('custAddress', e.target.value)}
              autoComplete="street-address"
            />
          </div>

          <div className="cf-mobile-row2">
            <div className="form-group">
              <label className="form-label">Status Pekerjaan</label>
              <CustomSelect
                options={ORDER_STATUS_OPTIONS}
                value={transaction.orderStatus}
                onChange={(val) => onChange('orderStatus', val)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Metode Bayar</label>
              <CustomSelect
                options={PAY_METHOD_OPTIONS}
                value={transaction.payMethod || 'Transfer'}
                onChange={(val) => onChange('payMethod', val)}
              />
            </div>
          </div>

          {transaction.payMethod === 'Transfer' && (
            <div className="form-group">
              <label className="form-label" htmlFor="bankName-m">Bank / E-Wallet</label>
              <input
                type="text"
                id="bankName-m"
                className="form-control"
                placeholder="BCA / Mandiri / BRI"
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
      )}

      {onSwitchMobileTab && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
            onClick={() => onSwitchMobileTab('preview')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">description</span>
            <span>Lihat Preview Dokumen Nota</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DESKTOP / TABLET LAYOUT — Full grid, all fields visible
   ───────────────────────────────────────────────────────────── */
function CustomerFormDesktop({ transaction, onChange }) {
  return (
    <div className="fluent-card">
      <h2 className="card-title">
        <span className="material-symbols-outlined" aria-hidden="true">person</span> Informasi Pelanggan &amp; Transaksi
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
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="custPhone">No WhatsApp / HP</label>
          <input
            type="tel"
            id="custPhone"
            className="form-control"
            placeholder="081234567890"
            value={transaction.custPhone}
            onChange={(e) => onChange('custPhone', e.target.value)}
            autoComplete="tel"
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
          <label className="form-label" htmlFor="custAddress">Alamat Pelanggan</label>
          <input
            type="text"
            id="custAddress"
            className="form-control"
            placeholder="Alamat / kota"
            value={transaction.custAddress || ''}
            onChange={(e) => onChange('custAddress', e.target.value)}
            autoComplete="street-address"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Status Pesanan</label>
          <CustomSelect
            options={ORDER_STATUS_OPTIONS}
            value={transaction.orderStatus || 'Proses Cetak'}
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
            <label className="form-label" htmlFor="bankName">Nama Bank / E-Wallet</label>
            <input
              type="text"
              id="bankName"
              className="form-control"
              placeholder="Bank BCA / Mandiri / BRI"
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

function CustomerForm({ transaction, onChange, isMobile = false, onSwitchMobileTab }) {
  if (isMobile) {
    return <CustomerFormMobile transaction={transaction} onChange={onChange} onSwitchMobileTab={onSwitchMobileTab} />;
  }
  return <CustomerFormDesktop transaction={transaction} onChange={onChange} />;
}

export default React.memo(CustomerForm);
