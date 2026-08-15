import React, { useState } from 'react';
import { formatRupiah, calculateItemTotal } from '../services/storage';
import CustomSelect from './ui/CustomSelect';
import CustomTooltip from './ui/CustomTooltip';
import {
  ITEM_TYPE_OPTIONS,
  BOOK_SIZE_OPTIONS,
  BOOK_BINDING_OPTIONS,
  PAY_STATUS_OPTIONS
} from '../constants/appConstants';

function ItemCalculator({
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
  // New props — layout/UX only, no business logic
  _isMobile = false,
  _isSaved = false,
  _onSaveTransaction = null,
  _onResetForm = null,
}) {
  // Accordion open/close state map keyed by item index
  const [openAccordions, setOpenAccordions] = useState({});

  const toggleAccordion = (index, key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [`${index}-${key}`]: !prev[`${index}-${key}`]
    }));
  };

  const catalogPresetOptions = [
    { value: '', label: '-- Pilih dari Preset Katalog --' },
    ...catalog.map(c => ({
      value: c.id,
      label: `${c.name} (${c.type.toUpperCase()} - ${formatRupiah(c.price)})`
    }))
  ];

  const getQtyLabel = (type) => {
    switch (type) {
      case 'pcs': return 'Jumlah Satuan (Pcs)';
      case 'rim': return 'Jumlah Rim';
      case 'pack': return 'Jumlah Pack / Box';
      case 'buku': return 'Jumlah Buku (Pcs)';
      case 'm2': return 'Jumlah Lembar (Qty)';
      default: return 'Jumlah Satuan (Pcs)';
    }
  };

  return (
    <div className="fluent-card item-calculator-card compact-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 className="card-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
          <i className="ri-calculator-line" aria-hidden="true"></i> Rincian Pesanan Percetakan
        </h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAddItem}>
          <i className="ri-add-line" aria-hidden="true"></i> Tambah Item
        </button>
      </div>

      {/* Dynamic Item Rows */}
      <div className="items-container">
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            background: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
            marginBottom: '1rem'
          }}>
            <i className="ri-shopping-basket-line" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}></i>
            <p style={{ margin: '0.5rem 0 1rem 0', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              Belum ada item pesanan pada nota ini.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={onAddItem}>
              <i className="ri-add-line"></i> Tambah Item Pesanan Baru
            </button>
          </div>
        ) : (
          items.map((item, index) => {
            const itemTotal = calculateItemTotal(item);
            const isBookDetailOpen = !!openAccordions[`${index}-book`];
            const isCustomDetailOpen = !!openAccordions[`${index}-custom`];

            return (
              <div className="item-row compact-item-row" key={item.id || index}>
                
                {/* Header: Item index & Preset Selector */}
                <div className="item-row-header">
                  <div className="item-header-left">
                    <span className="item-number-badge">#{index + 1}</span>
                    <CustomSelect
                      options={catalogPresetOptions}
                      value={item.presetId || ''}
                      placeholder="-- Pilih dari Preset Katalog --"
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
                      aria-label={`Hapus item #${index + 1}`}
                    >
                      <i className="ri-delete-bin-line" aria-hidden="true"></i>
                    </button>
                  </CustomTooltip>
                </div>

                {/* Main Product Info Grid (2-Column Mobile Grid) */}
                <div className="item-main-grid mobile-2col-grid">
                  <div className="form-group" style={{ gridColumn: 'span 1' }}>
                    <label className="form-label" htmlFor={`item-name-${index}`}>Nama Barang / Pekerjaan</label>
                    <input
                      type="text"
                      id={`item-name-${index}`}
                      className="form-control"
                      placeholder="Pilih dari Preset atau ketik nama..."
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

                {/* Dimensions Inputs (2-Column Mobile Grid) */}
                <div className="dimension-inputs mobile-2col-grid">
                  {item.type === 'm2' && (
                    <>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`item-length-${index}`}>Panjang (cm)</label>
                        <input
                          type="number"
                          id={`item-length-${index}`}
                          className="form-control"
                          value={item.length}
                          min="1"
                          onChange={(e) => onUpdateItem(index, { length: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`item-width-${index}`}>Lebar (cm)</label>
                        <input
                          type="number"
                          id={`item-width-${index}`}
                          className="form-control"
                          value={item.width}
                          min="1"
                          onChange={(e) => onUpdateItem(index, { width: Math.max(0, parseFloat(e.target.value) || 0) })}
                        />
                      </div>
                    </>
                  )}
                  <div className="form-group">
                    <label className="form-label" htmlFor={`item-qty-${index}`}>{getQtyLabel(item.type)}</label>
                    <input
                      type="number"
                      id={`item-qty-${index}`}
                      className="form-control"
                      value={item.qty}
                      min="1"
                      onChange={(e) => onUpdateItem(index, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor={`item-price-${index}`}>Harga Satuan (Rp)</label>
                    <input
                      type="number"
                      id={`item-price-${index}`}
                      className="form-control num-tabular"
                      value={item.price}
                      min="0"
                      onChange={(e) => onUpdateItem(index, { price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    />
                  </div>
                </div>

                {/* Progressive Disclosure: Accordion for Book Details */}
                {item.type === 'buku' && (
                  <div className="accordion-wrapper">
                    <button
                      type="button"
                      className="accordion-trigger"
                      onClick={() => toggleAccordion(index, 'book')}
                      aria-expanded={isBookDetailOpen}
                    >
                      <span><i className="ri-book-open-line"></i> Detail Cetak Buku & Jilid</span>
                      <i className={`ri-arrow-down-s-line accordion-chevron ${isBookDetailOpen ? 'open' : ''}`}></i>
                    </button>
                    {isBookDetailOpen && (
                      <div className="accordion-content">
                        <div className="form-grid mobile-2col-grid">
                          <div className="form-group">
                            <label className="form-label" htmlFor={`book-title-${index}`}>Judul Buku</label>
                            <input
                              type="text"
                              id={`book-title-${index}`}
                              className="form-control"
                              placeholder="Judul / deskripsi"
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
                          <div className="form-group">
                            <label className="form-label" htmlFor={`book-pages-${index}`}>Halaman</label>
                            <input
                              type="number"
                              id={`book-pages-${index}`}
                              className="form-control"
                              placeholder="120"
                              value={item.bookPages || ''}
                              min="1"
                              onChange={(e) => onUpdateItem(index, { bookPages: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor={`book-paper-inner-${index}`}>Kertas Isi</label>
                            <input
                              type="text"
                              id={`book-paper-inner-${index}`}
                              className="form-control"
                              placeholder="HVS 70g"
                              value={item.bookPaperInner || ''}
                              onChange={(e) => onUpdateItem(index, { bookPaperInner: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor={`book-cover-${index}`}>Kertas Cover</label>
                            <input
                              type="text"
                              id={`book-cover-${index}`}
                              className="form-control"
                              placeholder="Art Carton 260g"
                              value={item.bookCover || ''}
                              onChange={(e) => onUpdateItem(index, { bookCover: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Jenis Jilid</label>
                            <CustomSelect
                              options={BOOK_BINDING_OPTIONS}
                              value={item.bookBinding || 'Perfect Binding'}
                              onChange={(val) => onUpdateItem(index, { bookBinding: val })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Finishing & Subtotal Item Footer Grid */}
                <div className="item-footer-grid mobile-2col-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor={`item-finishing-${index}`}>Finishing / Opsi Tambahan</label>
                    <input
                      type="text"
                      id={`item-finishing-${index}`}
                      className="form-control"
                      placeholder="Laminasi, potong, dll."
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

                {/* Progressive Disclosure: Accordion for Custom Key-Value Details */}
                <div className="accordion-wrapper">
                  <button
                    type="button"
                    className="accordion-trigger"
                    onClick={() => toggleAccordion(index, 'custom')}
                    aria-expanded={isCustomDetailOpen}
                  >
                    <span><i className="ri-list-settings-line"></i> Detail Tambahan Specs ({(item.customDetails || []).length})</span>
                    <i className={`ri-arrow-down-s-line accordion-chevron ${isCustomDetailOpen ? 'open' : ''}`}></i>
                  </button>
                  {isCustomDetailOpen && (
                    <div className="accordion-content">
                      <div className="custom-details-section" style={{ border: 'none', padding: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
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
                            <i className="ri-add-line" aria-hidden="true"></i> Tambah Detail Specs
                          </button>
                        </div>
                        {(item.customDetails || []).map((detail, dIdx) => (
                          <div className="custom-detail-row" key={dIdx}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Label (mis: Warna)"
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
                            <button
                              type="button"
                              className="btn-remove-detail"
                              onClick={() => {
                                const updated = (item.customDetails || []).filter((_, di) => di !== dIdx);
                                onUpdateItem(index, { customDetails: updated });
                              }}
                              aria-label="Hapus detail"
                            >
                              <i className="ri-close-line" aria-hidden="true"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Summary Box */}
      <div className="summary-box">
        <div className="summary-row">
          <span>Subtotal Item:</span>
          <span className="num-tabular">{formatRupiah(subtotal)}</span>
        </div>

        <div className="form-grid mobile-2col-grid" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="discount-input">Potongan / Diskon (Rp)</label>
            <input
              type="number"
              id="discount-input"
              className="form-control num-tabular"
              value={discount}
              min="0"
              onChange={(e) => onChangeTransaction('discount', Math.max(0, parseFloat(e.target.value) || 0))}
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
              <label className="form-label" htmlFor="dp-input">Jumlah DP (Rp)</label>
              <input
                type="number"
                id="dp-input"
                className="form-control num-tabular"
                value={dp}
                min="0"
                onChange={(e) => onChangeTransaction('dp', Math.max(0, parseFloat(e.target.value) || 0))}
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

      {/* Catatan Tambahan (Progressive Disclosure / Accordion on Mobile) */}
      <div className="accordion-wrapper" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="accordion-trigger"
          onClick={() => toggleAccordion('global', 'catatan')}
          aria-expanded={!!openAccordions['global-catatan']}
        >
          <span><i className="ri-file-text-line"></i> Catatan Tambahan Pesanan</span>
          <i className={`ri-arrow-down-s-line accordion-chevron ${openAccordions['global-catatan'] ? 'open' : ''}`}></i>
        </button>
        {openAccordions['global-catatan'] && (
          <div className="accordion-content">
            <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
              <textarea
                id="catatan-input"
                className="form-control"
                rows="2"
                placeholder="Catatan bahan, instruksi desain, atau ketentuan..."
                value={catatan}
                onChange={(e) => onChangeTransaction('catatan', e.target.value)}
              ></textarea>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default React.memo(ItemCalculator);

