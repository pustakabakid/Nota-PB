import React, { useState } from 'react';
import { formatRupiah } from '../services/storage';
import CustomSelect from './ui/CustomSelect';

const CATALOG_TYPE_OPTIONS = [
  { value: 'm2', label: 'Meter Persegi (m²) - Spanduk/MMT' },
  { value: 'pcs', label: 'Per Pcs / Satuan - Mug/Pin/Stempel' },
  { value: 'rim', label: 'Per Rim - Brosur/Kop Surat' },
  { value: 'pack', label: 'Per Pack / Box - Kartu Nama/Stiker' },
  { value: 'buku', label: 'Cetak Buku / Booklet - Per Eksemplar' }
];

export default function CatalogModal({ isOpen, onClose, catalog, onSavePreset, onDeletePreset, onShowToast }) {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('m2');
  const [price, setPrice] = useState('');
  const [finishing, setFinishing] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setName(item.name || '');
    setType(item.type || 'm2');
    setPrice(item.price ? item.price.toString() : '');
    setFinishing(item.finishing || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setType('m2');
    setPrice('');
    setFinishing('');
  };

  const handleModalClose = () => {
    handleCancelEdit();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price || parseFloat(price) <= 0) {
      if (onShowToast) {
        onShowToast('Mohon isi nama produk dan harga standar dengan benar.', 'warning');
      }
      return;
    }

    const isEditMode = Boolean(editingId);
    const itemData = {
      id: isEditMode ? editingId : Date.now().toString(),
      name: name.trim(),
      type,
      price: parseFloat(price),
      finishing: finishing.trim()
    };

    onSavePreset(itemData);

    if (onShowToast) {
      onShowToast(
        isEditMode
          ? `Produk preset "${name.trim()}" berhasil diperbarui!`
          : `Produk preset "${name.trim()}" berhasil ditambahkan!`,
        'success'
      );
    }

    handleCancelEdit();
  };

  const handleDelete = (id) => {
    if (editingId === id) {
      handleCancelEdit();
    }
    onDeletePreset(id);
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="ri-price-tag-3-line"></i> Manajemen Katalog Tarif Preset Produk
          </h3>
          <button className="btn-close-modal" onClick={handleModalClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Form add / edit preset */}
        <form
          onSubmit={handleSubmit}
          className={`catalog-form-container ${editingId ? 'edit-mode' : ''}`}
        >
          <div className="catalog-form-header">
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                margin: 0,
                color: editingId ? 'var(--primary)' : 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <i className={editingId ? 'ri-edit-line' : 'ri-add-circle-line'}></i>
              {editingId ? `Edit Preset: "${name}"` : 'Tambah Tarif Preset Produk Baru'}
            </h4>
            {editingId && (
              <span
                className="item-type-badge"
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.725rem',
                  padding: '0.2rem 0.6rem'
                }}
              >
                Mode Mengubah Data
              </span>
            )}
          </div>

          <div className="catalog-form-grid">
            <div className="form-group">
              <label className="form-label">Nama Produk Percetakan</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nama produk cetakan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipe Perhitungan</label>
              <CustomSelect
                options={CATALOG_TYPE_OPTIONS}
                value={type}
                onChange={(val) => setType(val)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Standar (Rp)</label>
              <input
                type="number"
                className="form-control"
                placeholder="25000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Pilihan Finishing Preset (pisahkan koma)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Finishing default (opsional)"
                value={finishing}
                onChange={(e) => setFinishing(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justify: 'flex-end',
              marginTop: '0.85rem',
              paddingTop: '0.65rem',
              borderTop: editingId ? '1px dashed rgba(0, 103, 184, 0.2)' : '1px dashed var(--border-color)'
            }}
          >
            {editingId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                <i className="ri-close-circle-line"></i> Batal Edit
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              <i className={editingId ? 'ri-save-line' : 'ri-add-line'}></i>{' '}
              {editingId ? 'Simpan Perubahan Preset' : 'Simpan Ke Katalog Preset'}
            </button>
          </div>
        </form>

        {/* Preset table */}
        <div className="table-responsive">
          <table className="fluent-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Tipe Calc</th>
                <th>Harga Base</th>
                <th>Opsi Finishing</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {catalog.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    Belum ada preset produk di katalog.
                  </td>
                </tr>
              ) : (
                catalog.map((item) => {
                  const isEditingThis = item.id === editingId;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: isEditingThis ? 'var(--primary-light)' : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <td>
                        <strong>{item.name}</strong>
                        {isEditingThis && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'block', fontWeight: 600 }}>
                            • Sedang diubah
                          </span>
                        )}
                      </td>
                      <td><span className="item-type-badge">{item.type.toUpperCase()}</span></td>
                      <td className="num-tabular">{formatRupiah(item.price)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.finishing || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleStartEdit(item)}
                            title="Ubah / Edit Preset Ini"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDelete(item.id)}
                            title="Hapus Preset Ini"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

