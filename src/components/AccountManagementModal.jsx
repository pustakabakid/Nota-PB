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

  const superAdminCount = accounts.filter(a => a.role === 'superadmin').length;
  const adminCount = accounts.filter(a => a.role === 'admin').length;

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

  const getAvatarInitials = (name, username) => {
    const text = (name || username || 'US').trim();
    const parts = text.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9990,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(6px)',
      padding: '1.25rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Modal Header Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--primary-glow)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem'
            }}>
              <i className="ri-user-settings-line"></i>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
                Manajemen Akun Pengguna
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Kelola hak akses operator kasir dan akun superadmin
              </p>
            </div>
          </div>

          <CustomTooltip text="Tutup Pengaturan">
            <button type="button" className="btn-remove-item" onClick={onClose}>
              <i className="ri-close-line" style={{ fontSize: '1.25rem' }}></i>
            </button>
          </CustomTooltip>
        </div>

        {/* Top Summary Stats & Action Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          background: 'var(--bg-surface-solid)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span><strong style={{ color: 'var(--text-color)' }}>{accounts.length}</strong> Total Akun</span>
            <span>•</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{superAdminCount} Superadmin</span>
            <span>•</span>
            <span style={{ color: 'var(--text-color)', fontWeight: 500 }}>{adminCount} Admin Kasir</span>
          </div>

          {!editingAccount && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
              onClick={handleOpenAdd}
            >
              <i className="ri-user-add-line"></i> Tambah Akun Kasir Baru
            </button>
          )}
        </div>

        {/* Form Add/Edit Account Box */}
        {editingAccount && (
          <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-surface-solid)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary)',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <i className={editingAccount.isNew ? "ri-user-add-line" : "ri-edit-line"} style={{ color: 'var(--primary)' }}></i>
                {editingAccount.isNew ? 'Tambah Akun Pengguna Baru' : `Edit Akun: ${editingAccount.username}`}
              </h4>
              <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setEditingAccount(null)}>
                Batal
              </button>
            </div>

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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingAccount(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                <i className="ri-save-line"></i> Simpan Akun
              </button>
            </div>
          </form>
        )}

        {/* Clean Accounts Table */}
        <div className="dense-table-container">
          <table className="dense-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: '1rem' }}>Pengguna</th>
                <th>Username</th>
                <th>Role Hak Akses</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => {
                const isSuper = acc.role === 'superadmin';
                const initials = getAvatarInitials(acc.name, acc.username);

                return (
                  <tr key={acc.id}>
                    <td style={{ paddingLeft: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isSuper ? 'rgba(27, 189, 143, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isSuper ? 'var(--primary)' : '#3b82f6',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.875rem', lineHeight: '1.2' }}>
                            {acc.name || acc.username}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {isSuper ? 'Akses Bebas Aplikasi' : 'Akses Hanya Cetak Nota'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.825rem',
                        background: 'var(--bg-surface-solid)',
                        border: '1px solid var(--border-color)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        color: 'var(--text-color)'
                      }}>
                        {acc.username}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${isSuper ? 'status-lunas' : 'status-proses'}`}>
                        <i className={isSuper ? 'ri-shield-keyhole-line' : 'ri-user-3-line'}></i>
                        {isSuper ? 'Superadmin' : 'Admin Kasir'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                        <CustomTooltip text="Edit Akun & Password">
                          <button type="button" className="btn-table-action" onClick={() => handleOpenEdit(acc)}>
                            <i className="ri-edit-line"></i>
                          </button>
                        </CustomTooltip>
                        {acc.username !== 'pustakabakid' ? (
                          <CustomTooltip text="Hapus Akun">
                            <button type="button" className="btn-table-action btn-table-delete" onClick={() => onDeleteAccount(acc.id)}>
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </CustomTooltip>
                        ) : (
                          <CustomTooltip text="Akun Utama Tidak Dapat Dihapus">
                            <button type="button" className="btn-table-action" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }}>
                              <i className="ri-lock-line"></i>
                            </button>
                          </CustomTooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
