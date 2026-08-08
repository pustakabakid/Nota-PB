import React, { useState, useEffect } from 'react';

export default function StoreModal({ isOpen, onClose, storeProfile, onSave }) {
  const [form, setForm] = useState(storeProfile);

  useEffect(() => {
    setForm(storeProfile);
  }, [storeProfile]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title"><i className="ri-store-2-line"></i> Pengaturan Profil Percetakan</h3>
          <button className="btn-close-modal" onClick={onClose}><i className="ri-close-line"></i></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Nama Toko / Percetakan</label>
            <input
              type="text"
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Sub-Judul / Slogan</label>
            <input
              type="text"
              className="form-control"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Alamat Lengkap</label>
            <input
              type="text"
              className="form-control"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">No. Telepon / WhatsApp</label>
            <input
              type="text"
              className="form-control"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Pesan Catatan Kaki (Footer Nota)</label>
            <input
              type="text"
              className="form-control"
              value={form.footerMsg}
              onChange={(e) => setForm({ ...form, footerMsg: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Simpan Profil Toko
          </button>
        </form>
      </div>
    </div>
  );
}
