import React, { useState } from 'react';
import { formatRupiah, formatDateId } from '../../services/storage';
import { ITEM_TYPE_OPTIONS, CATALOG_TYPE_FILTER_OPTIONS } from '../../constants/appConstants';
import CustomTooltip from '../ui/CustomTooltip';
import CustomSelect from '../ui/CustomSelect';

const getProductCueIcon = (name = '', type = '') => {
  const n = (name || '').toLowerCase();
  if (type === 'buku' || n.includes('buku') || n.includes('booklet') || n.includes('novel') || n.includes('majalah')) return 'menu_book';
  if (n.includes('brosur') || n.includes('flyer') || n.includes('leaflets') || n.includes('poster')) return 'description';
  if (n.includes('card') || n.includes('kartu') || n.includes('id card') || n.includes('namecard')) return 'badge';
  if (n.includes('modul') || n.includes('katalog') || n.includes('proposal')) return 'format_list_bulleted';
  if (type === 'pack' || n.includes('box') || n.includes('kemasan') || n.includes('dus')) return 'inventory_2';
  if (type === 'm2' || n.includes('banner') || n.includes('mmt') || n.includes('spanduk') || n.includes('stiker')) return 'flag';
  return 'sell';
};

const parseFinishingChips = (finishingStr) => {
  if (!finishingStr || !finishingStr.trim()) return ['Tanpa Finishing'];
  return finishingStr.split(/[,|/]+/).map(s => s.trim()).filter(Boolean);
};

export default function CatalogTab({
  catalog = [],
  onSavePreset,
  onDeletePreset,
  onShowToast
}) {
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('ALL');

  const handleOpenPresetForm = (preset = null) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetForm({ ...preset });
    } else {
      setEditingPreset(null);
      setPresetForm({
        id: 'preset-' + Date.now(),
        name: '',
        type: 'm2',
        price: 0,
        finishing: ''
      });
    }
  };

  const handleSavePresetForm = (e) => {
    e.preventDefault();
    if (!presetForm.name.trim()) {
      if (onShowToast) onShowToast('Nama produk preset tidak boleh kosong.', 'warning');
      return;
    }
    onSavePreset({
      ...presetForm,
      price: Math.max(0, parseFloat(presetForm.price) || 0),
      updatedAt: new Date().toISOString()
    });
    setEditingPreset(null);
    setPresetForm({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
    if (onShowToast) onShowToast('Preset katalog berhasil disimpan!', 'success');
  };

  const handleDuplicatePreset = (item) => {
    const duplicated = {
      ...item,
      id: 'preset-' + Date.now(),
      name: `${item.name} (Salinan)`,
      updatedAt: new Date().toISOString()
    };
    onSavePreset(duplicated);
    if (onShowToast) onShowToast(`Preset "${item.name}" berhasil diduplikasi!`, 'success');
  };

  const filteredCatalog = catalog.filter(item => {
    const searchLower = catalogSearch.toLowerCase();
    const matchesSearch = (
      (item.name || '').toLowerCase().includes(searchLower) ||
      (item.finishing || '').toLowerCase().includes(searchLower)
    );
    const matchesType = catalogTypeFilter === 'ALL' || item.type === catalogTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Dense Toolbar */}
      <div className="dense-toolbar catalog-toolbar">
        {/* Search */}
        <div className="toolbar-search-box">
          <span className="material-symbols-outlined toolbar-search-icon" aria-hidden="true">search</span>
          <input
            type="text"
            className="form-control toolbar-search-input"
            placeholder="Cari preset produk..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
          />
        </div>

        {/* Filter Jenis */}
        <div className="toolbar-filter-box">
          <CustomSelect
            options={CATALOG_TYPE_FILTER_OPTIONS}
            value={catalogTypeFilter}
            onChange={(val) => setCatalogTypeFilter(val)}
            placeholder="Semua Jenis"
          />
        </div>

        {/* Add Button */}
        <div className="toolbar-action-box">
          <button
            type="button"
            className="btn btn-primary btn-sm toolbar-btn-add"
            onClick={() => handleOpenPresetForm()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span> <span>Tambah Preset Baru</span>
          </button>
        </div>
      </div>

      {/* Form Inline Box */}
      {(editingPreset || presetForm.id) && (
        <form onSubmit={handleSavePresetForm} style={{
          background: 'var(--bg-surface-solid)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--primary)',
          marginBottom: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="material-symbols-outlined">edit_note</span> {editingPreset ? 'Edit Preset Produk' : 'Tambah Preset Produk Baru'}
            </h4>
            <button type="button" className="btn-close-modal" onClick={() => setEditingPreset(null)} aria-label="Tutup">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="catalog-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 1' }}>
              <label className="form-label" htmlFor="preset-name">Nama Barang / Produk Cetakan</label>
              <input
                type="text"
                id="preset-name"
                className="form-control"
                placeholder="Nama produk cetakan"
                value={presetForm.name}
                onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipe Perhitungan Satuan</label>
              <CustomSelect
                options={ITEM_TYPE_OPTIONS}
                value={presetForm.type}
                onChange={(val) => setPresetForm(prev => ({ ...prev, type: val }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="preset-price">Harga Default (Rp)</label>
              <input
                type="number"
                id="preset-price"
                className="form-control num-tabular"
                placeholder="20000"
                value={presetForm.price}
                onChange={(e) => setPresetForm(prev => ({ ...prev, price: e.target.value }))}
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="preset-finishing">Finishing Default</label>
              <input
                type="text"
                id="preset-finishing"
                className="form-control"
                placeholder="Laminasi Glossy, Staples"
                value={presetForm.finishing}
                onChange={(e) => setPresetForm(prev => ({ ...prev, finishing: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPreset(null)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <span className="material-symbols-outlined">save</span> Simpan Preset
            </button>
          </div>
        </form>
      )}

      {/* Empty State vs Table View */}
      {filteredCatalog.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>sell</span>
          <h4 style={{ margin: '0.75rem 0 0.25rem 0', color: 'var(--text-main)', fontSize: 'var(--text-md)' }}>
            Tidak Ada Preset Produk
          </h4>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            {catalogSearch || catalogTypeFilter !== 'ALL'
              ? 'Tidak ada produk preset yang cocok dengan filter pencarian.' 
              : 'Belum ada tarif katalog preset yang ditambahkan.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="dense-table-container catalog-desktop-table">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th style={{ width: '100px' }}>Kategori</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Harga Default</th>
                  <th>Finishing</th>
                  <th style={{ width: '120px' }}>Terakhir Diubah</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((item) => {
                  const cueIcon = getProductCueIcon(item.name, item.type);
                  const chips = parseFinishingChips(item.finishing);

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '1.2rem' }} aria-hidden="true">{cueIcon}</span>
                          <strong style={{ color: 'var(--text-main)', fontSize: 'var(--text-xs)' }} className="text-wrap-break">{item.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="item-number-badge">{item.type.toUpperCase()}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} className="num-tabular">
                        {formatRupiah(item.price)}
                      </td>
                      <td>
                        <div className="chip-group">
                          {chips.map((chip, cIdx) => (
                            <span key={cIdx} className="chip-finishing">
                              {chip}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formatDateId(item.updatedAt || new Date().toISOString())}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                          <CustomTooltip text="Edit Preset">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => handleOpenPresetForm(item)}
                              aria-label="Edit Preset"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                            </button>
                          </CustomTooltip>
                          <CustomTooltip text="Duplikat Preset">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => handleDuplicatePreset(item)}
                              aria-label="Duplikat Preset"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>content_copy</span>
                            </button>
                          </CustomTooltip>
                          <CustomTooltip text="Hapus Preset">
                            <button
                              type="button"
                              className="btn-icon-action danger"
                              onClick={() => onDeletePreset(item.id)}
                              aria-label="Hapus Preset"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                            </button>
                          </CustomTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Native Cards Feed (< 768px - No Horizontal Scroll!) */}
          <div className="catalog-mobile-list" role="feed" aria-label="Daftar Preset Katalog">
            {filteredCatalog.map((item) => {
              const cueIcon = getProductCueIcon(item.name, item.type);
              const chips = parseFinishingChips(item.finishing);

              return (
                <article key={`cm_${item.id}`} className="catalog-mobile-card">
                  {/* Header: Icon + Name + Category Badge */}
                  <div className="cmc-header">
                    <div className="cmc-title-wrapper">
                      <span className="material-symbols-outlined cmc-cue-icon" aria-hidden="true">{cueIcon}</span>
                      <strong className="cmc-product-name text-wrap-break">{item.name}</strong>
                    </div>
                    <span className="item-number-badge">{item.type.toUpperCase()}</span>
                  </div>

                  {/* Price & Finishing Chips */}
                  <div className="cmc-body">
                    <div className="cmc-price-box">
                      <span className="cmc-price-label">Tarif Default</span>
                      <span className="cmc-price-value num-tabular">{formatRupiah(item.price)}</span>
                    </div>
                    <div className="cmc-chips-wrap">
                      {chips.map((chip, cIdx) => (
                        <span key={cIdx} className="chip-finishing">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Row (44px touch targets) */}
                  <div className="cmc-actions-row">
                    <button
                      type="button"
                      className="cmc-action-btn cmc-btn-edit"
                      onClick={() => handleOpenPresetForm(item)}
                      aria-label="Edit Preset Produk"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="cmc-action-btn cmc-btn-copy"
                      onClick={() => handleDuplicatePreset(item)}
                      aria-label="Duplikat Preset"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                      <span>Salin</span>
                    </button>
                    <button
                      type="button"
                      className="cmc-action-btn cmc-btn-delete"
                      onClick={() => onDeletePreset(item.id)}
                      aria-label="Hapus Preset"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                      <span>Hapus</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
