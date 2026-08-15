import React from 'react';
import { formatRupiah } from '../../services/storage';

/**
 * MobileBottomBar — Sticky POS Action Bar (mobile only, hidden on desktop via CSS)
 *
 * Shows:  [N Item • Total • Status ▶]  [+ Tambah]  [Simpan ▶]
 * Tapping summary card switches immediately to Preview Nota tab.
 */
export default function MobileBottomBar({
  itemCount = 0,
  grandTotal = 0,
  payStatus = 'Lunas',
  isSaved = false,
  onSaveTransaction,
  onAddItem,
  onOpenPreview
}) {
  const payStatusClass =
    payStatus === 'Lunas' ? 'lunas' : payStatus === 'DP' ? 'dp' : 'unpaid';

  const hasItems = itemCount > 0;

  return (
    <div className="mobile-bottom-bar no-print" role="region" aria-label="Aksi Kasir">
      <div className="mobile-bottom-bar-inner">

        {/* ── Left: Summary Info (Clickable to switch to Preview Nota) ── */}
        <div
          className="mbb-summary"
          onClick={onOpenPreview}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          aria-label={`${itemCount} item • ${formatRupiah(grandTotal)} — Ketuk untuk melihat nota`}
          title="Ketuk untuk melihat preview nota"
        >
          {hasItems ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span className="mbb-total num-tabular">{formatRupiah(grandTotal)}</span>
                <i className="ri-arrow-right-s-line" style={{ fontSize: '0.9rem', opacity: 0.7 }} aria-hidden="true" />
              </div>
              <div className="mbb-meta">
                <span className="mbb-count">{itemCount} Item</span>
                <span className={`mbb-status-chip ${payStatusClass}`}>
                  {payStatus === 'Lunas' ? 'LUNAS' : payStatus.toUpperCase()}
                </span>
              </div>
            </>
          ) : (
            <span className="mbb-empty-hint">
              <i className="ri-shopping-basket-line" aria-hidden="true" />
              Belum ada item
            </span>
          )}
        </div>

        {/* ── Right: Action Buttons ── */}
        <div className="mbb-actions">
          {/* Add Item */}
          <button
            type="button"
            className="mbb-btn mbb-btn-add"
            onClick={onAddItem}
            aria-label="Tambah item baru"
          >
            <i className="ri-add-line" aria-hidden="true" />
          </button>

          {/* Save / Update */}
          <button
            type="button"
            className="mbb-btn mbb-btn-save"
            onClick={onSaveTransaction}
            aria-label={isSaved ? 'Update nota' : 'Simpan nota'}
          >
            <i
              className={isSaved ? 'ri-checkbox-circle-line' : 'ri-save-line'}
              aria-hidden="true"
            />
            <span>{isSaved ? 'Update' : 'Simpan'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
