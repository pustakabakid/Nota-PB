import React from 'react';
import { formatRupiah, calculateItemTotal } from '../services/storage';
import CustomSelect from './ui/CustomSelect';
import CustomTooltip from './ui/CustomTooltip';

const ITEM_TYPE_OPTIONS = [
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Pcs / Satuan' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Cetak Buku / Booklet' }
];

const BOOK_SIZE_OPTIONS = [
  { value: 'A4', label: 'A4 (21×29.7cm)' },
  { value: 'A5', label: 'A5 (14.8×21cm)' },
  { value: 'B5', label: 'B5 (17.6×25cm)' },
  { value: 'F4', label: 'F4 / Folio' },
  { value: 'Custom', label: 'Ukuran Custom' }
];

const BOOK_BINDING_OPTIONS = [
  { value: 'Perfect Binding', label: 'Perfect Binding (Lem Panas)' },
  { value: 'Saddle Stitch', label: 'Saddle Stitch (Staples Tengah)' },
  { value: 'Hard Cover', label: 'Hard Cover (Jilid Keras)' },
  { value: 'Spiral', label: 'Spiral / Ring' },
  { value: 'Staples', label: 'Staples Samping' }
];

const PAY_STATUS_OPTIONS = [
  { value: 'Lunas', label: 'LUNAS' },
  { value: 'DP', label: 'DP (Uang Muka)' },
  { value: 'Belum Bayar', label: 'Belum Bayar' }
];

export default function ItemCalculator({
  items,
  catalog,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  discount,
  paymentStatus,
  dp,
  catatan,
  onChangeTransaction,
  subtotal,
  grandTotal,
  sisa,
  isSaved,
  onSaveTransaction,
  onResetForm
}) {
  const catalogPresetOptions = [
    { value: '', label: '-- Pilih dari Preset Katalog (Opsional) --' },
    ...catalog.map(c => ({
      value: c.id,
      label: `${c.name} (${c.type.toUpperCase()} - ${formatRupiah(c.price)})`
    }))
  ];

  return (
    <div className="fluent-card item-calculator-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
          <i className="ri-calculator-line"></i> Rincian Pesanan Percetakan
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAddItem}>
          <i className="ri-add-line"></i> Tambah Item
        </button>
      </div>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Pilih produk dari preset atau masukkan rincian dimensi ($m^2$) & satuan secara manual.
      </p>

      {/* Dynamic Item Rows */}
      <div className="items-container">
        {items.map((item, index) => {
          const itemTotal = calculateItemTotal(item);

          return (
            <div className="item-row" key={item.id || index}>
              <div className="item-row-header">
                <div className="item-header-left">
                  <span className="item-number-badge">#{index + 1}</span>
                  <CustomSelect
                    options={catalogPresetOptions}
                    value={item.presetId || ''}
                    placeholder="-- Pilih dari Preset Katalog (Opsional) --"
                    className="select-preset-product"
                    onChange={(val) => {
                      const preset = catalog.find(c => c.id === val);
                      if (preset) {
                        onUpdateItem(index, {
                          presetId: preset.id,
                          name: preset.name,
                          type: preset.type,
                          price: preset.price,
                          finishing: preset.finishing || ''
                        });
                      }
                    }}
                  />
                </div>
                <CustomTooltip text="Hapus Item Ini">
                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => onRemoveItem(index)}
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </CustomTooltip>
              </div>

              {/* Main Product Info Grid */}
              <div className="item-main-grid">
                <div className="form-group">
                  <label className="form-label">Nama Barang / Rincian Pekerjaan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama barang / produk cetakan"
                    value={item.name}
                    onChange={(e) => onUpdateItem(index, { name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipe Perhitungan</label>
                  <CustomSelect
                    options={ITEM_TYPE_OPTIONS}
                    value={item.type}
                    onChange={(val) => onUpdateItem(index, { type: val })}
                  />
                </div>
              </div>

              {/* Dimensions Inputs */}
              <div className={`dimension-inputs ${item.type !== 'm2' ? 'two-cols' : ''}`}>
                {item.type === 'm2' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Panjang (cm)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={item.length}
                        min="1"
                        onChange={(e) => onUpdateItem(index, { length: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Lebar (cm)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={item.width}
                        min="1"
                        onChange={(e) => onUpdateItem(index, { width: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Jumlah (Qty)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={item.qty}
                    min="1"
                    onChange={(e) => onUpdateItem(index, { qty: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    className="form-control num-tabular"
                    value={item.price}
                    min="0"
                    onChange={(e) => onUpdateItem(index, { price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Book Detail Fields */}
              {item.type === 'buku' && (
                <div className="book-detail-fields">
                  <div className="book-detail-fields-title">
                    <i className="ri-book-open-line"></i> Detail Cetak Buku
                  </div>
                  <div className="item-main-grid" style={{ marginBottom: '0.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">Judul Buku</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Judul / deskripsi buku"
                        value={item.bookTitle || ''}
                        onChange={(e) => onUpdateItem(index, { bookTitle: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ukuran Buku</label>
                      <CustomSelect
                        options={BOOK_SIZE_OPTIONS}
                        value={item.bookSize || 'A5'}
                        onChange={(val) => onUpdateItem(index, { bookSize: val })}
                      />
                    </div>
                  </div>
                  <div className="form-grid" style={{ marginBottom: '0.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="form-group">
                      <label className="form-label">Jumlah Halaman</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="120"
                        value={item.bookPages || ''}
                        min="1"
                        onChange={(e) => onUpdateItem(index, { bookPages: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kertas Isi</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="HVS 70g, Art Paper 100g"
                        value={item.bookPaperInner || ''}
                        onChange={(e) => onUpdateItem(index, { bookPaperInner: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Kertas Cover</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Art Carton 260g"
                        value={item.bookCover || ''}
                        onChange={(e) => onUpdateItem(index, { bookCover: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ maxWidth: '300px' }}>
                    <label className="form-label">Jenis Jilid</label>
                    <CustomSelect
                      options={BOOK_BINDING_OPTIONS}
                      value={item.bookBinding || 'Perfect Binding'}
                      onChange={(val) => onUpdateItem(index, { bookBinding: val })}
                    />
                  </div>
                </div>
              )}

              {/* Finishing & Subtotal Item Footer Grid */}
              <div className="item-footer-grid">
                <div className="form-group">
                  <label className="form-label">Finishing / Opsi Tambahan</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Finishing / opsi tambahan"
                    value={item.finishing}
                    onChange={(e) => onUpdateItem(index, { finishing: e.target.value })}
                  />
                </div>
                <div className="item-subtotal-box">
                  <span className="item-subtotal-label">Subtotal Item</span>
                  <span className="item-subtotal-value num-tabular">
                    {formatRupiah(itemTotal)}
                  </span>
                </div>
              </div>

              {/* Custom Detail Key-Value Pairs */}
              <div className="custom-details-section">
                <div className="custom-details-header">
                  <span className="custom-details-label">
                    <i className="ri-list-settings-line"></i> Detail Tambahan
                  </span>
                  <button
                    type="button"
                    className="btn-add-detail"
                    onClick={() => {
                      const current = item.customDetails || [];
                      onUpdateItem(index, {
                        customDetails: [...current, { key: '', value: '' }]
                      });
                    }}
                  >
                    <i className="ri-add-line"></i> Tambah Detail
                  </button>
                </div>
                {(item.customDetails || []).map((detail, dIdx) => (
                  <div className="custom-detail-row" key={dIdx}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Label (mis: Warna Cetak)"
                      value={detail.key}
                      onChange={(e) => {
                        const updated = [...(item.customDetails || [])];
                        updated[dIdx] = { ...updated[dIdx], key: e.target.value };
                        onUpdateItem(index, { customDetails: updated });
                      }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Isi (mis: Full Color)"
                      value={detail.value}
                      onChange={(e) => {
                        const updated = [...(item.customDetails || [])];
                        updated[dIdx] = { ...updated[dIdx], value: e.target.value };
                        onUpdateItem(index, { customDetails: updated });
                      }}
                    />
                    <CustomTooltip text="Hapus detail ini">
                      <button
                        type="button"
                        className="btn-remove-detail"
                        onClick={() => {
                          const updated = (item.customDetails || []).filter((_, di) => di !== dIdx);
                          onUpdateItem(index, { customDetails: updated });
                        }}
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </CustomTooltip>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div className="summary-box">
        <div className="summary-row">
          <span>Subtotal Item:</span>
          <span className="num-tabular">{formatRupiah(subtotal)}</span>
        </div>
        <div className="form-grid" style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Potongan / Diskon (Rp)</label>
            <input
              type="number"
              className="form-control num-tabular"
              value={discount}
              min="0"
              onChange={(e) => onChangeTransaction('discount', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status Pembayaran</label>
            <CustomSelect
              options={PAY_STATUS_OPTIONS}
              value={paymentStatus}
              onChange={(val) => onChangeTransaction('payStatus', val)}
            />
          </div>
          {paymentStatus === 'DP' && (
            <div className="form-group">
              <label className="form-label">Jumlah DP (Rp)</label>
              <input
                type="number"
                className="form-control num-tabular"
                value={dp}
                min="0"
                onChange={(e) => onChangeTransaction('dp', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        <div className="summary-row total">
          <span>TOTAL AKHIR:</span>
          <span className="num-tabular">{formatRupiah(grandTotal)}</span>
        </div>

        {paymentStatus !== 'Lunas' && (
          <div className="summary-row" style={{ fontWeight: 600, color: 'var(--danger)' }}>
            <span>Sisa Tagihan Pelunasan:</span>
            <span className="num-tabular">{formatRupiah(sisa)}</span>
          </div>
        )}
      </div>

      <div className="form-group full-width" style={{ marginTop: '1rem' }}>
        <label className="form-label">Catatan Tambahan (Bahan / File / Ketentuan)</label>
        <textarea
          className="form-control"
          rows="2"
          placeholder="Catatan tambahan (opsional)"
          value={catatan}
          onChange={(e) => onChangeTransaction('catatan', e.target.value)}
        ></textarea>
      </div>
    </div>
  );
}
