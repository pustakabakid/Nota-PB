import React, { useState } from 'react';
import CustomSelect from './ui/CustomSelect';
import CustomTooltip from './ui/CustomTooltip';

export default function AccountManagementModal({
  accounts,
  onSaveAccount,
  onDeleteAccount,
  onClose,
  onShowToast
}) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'admin',
    name: ''
  });

  const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin / Operator Kasir (Hanya Cetak Nota)' },
    { value: 'superadmin', label: 'Superadmin (Akses Bebas Tanpa Batas)' }
  ];

  const handleOpenAdd = () => {
    setForm({
      username: '',
      password: '',
      role: 'admin',
      name: ''
    });
    setEditingAccount({ isNew: true });
  };

  const handleOpenEdit = (acc) => {
    setForm({
      username: acc.username,
      password: acc.password,
      role: acc.role || 'admin',
      name: acc.name || ''
    });
    setEditingAccount(acc);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      onShowToast('Username dan Password wajib diisi!', 'danger');
      return;
    }

    const payload = {
      id: editingAccount.isNew ? `usr-${Date.now()}` : editingAccount.id,
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      name: form.name.trim() || (form.role === 'superadmin' ? 'Super Admin' : 'Operator Kasir')
    };

    onSaveAccount(payload);
    setEditingAccount(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9990,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      padding: '1.25rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '640px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Modal Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <i className="ri-user-settings-line" style={{ fontSize: '1.4rem', color: 'var(--primary)' }}></i>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
                Manajemen Akun Pengguna
              </h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0 }}>
                Kelola kredensial login dan hak akses operator / kasir
              </p>
            </div>
          </div>
          <button type="button" className="btn-remove-item" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        {/* Form Modal Add/Edit overlay */}
        {editingAccount ? (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg-surface-solid)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className={editingAccount.isNew ? "ri-user-add-line" : "ri-edit-line"} style={{ color: 'var(--primary)' }}></i>
              {editingAccount.isNew ? 'Tambah Akun Pengguna Baru' : `Edit Akun: ${editingAccount.username}`}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap / Label</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Kasir Shift Pagi"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role / Hak Akses</label>
                <CustomSelect
                  options={ROLE_OPTIONS}
                  value={form.role}
                  onChange={(val) => setForm(prev => ({ ...prev, role: val }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username Login</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Login</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingAccount(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <i className="ri-save-line"></i> Simpan Akun
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <i className="ri-user-add-line"></i> Tambah Akun Kasir
            </button>
          </div>
        )}

        {/* Accounts Table List */}
        <div style={{ overflowX: 'auto' }}>
          <table className="dense-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Username</th>
                <th>Role Hak Akses</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.85rem' }}>
                      {acc.name || acc.username}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>
                    {acc.username}
                  </td>
                  <td>
                    <span className={`status-pill ${acc.role === 'superadmin' ? 'status-lunas' : 'status-proses'}`}>
                      <i className={acc.role === 'superadmin' ? 'ri-shield-keyhole-line' : 'ri-user-3-line'}></i>
                      {acc.role === 'superadmin' ? 'Superadmin' : 'Admin Kasir'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                      <CustomTooltip text="Edit Akun">
                        <button type="button" className="btn-table-action" onClick={() => handleOpenEdit(acc)}>
                          <i className="ri-edit-line"></i>
                        </button>
                      </CustomTooltip>
                      {acc.username !== 'pustakabakid' && (
                        <CustomTooltip text="Hapus Akun">
                          <button type="button" className="btn-table-action btn-table-delete" onClick={() => onDeleteAccount(acc.id)}>
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </CustomTooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
