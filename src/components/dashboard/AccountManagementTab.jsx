import React, { useState } from 'react';
import CustomTooltip from '../ui/CustomTooltip';
import CustomSelect from '../ui/CustomSelect';
import { ROLE_OPTIONS } from '../../constants/appConstants';

const getAvatarInitials = (name, username) => {
  const text = (name || username || 'US').trim();
  const parts = text.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
};

export default function AccountManagementTab({
  accounts = [],
  currentUser,
  onSaveAccount,
  onDeleteAccount,
  onShowToast
}) {
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    role: 'admin',
    name: '',
    isActive: true
  });

  const superAdminCount = accounts.filter(a => a.role === 'superadmin').length;
  const adminCount = accounts.filter(a => a.role === 'admin').length;

  const handleOpenAddAccount = () => {
    setAccountForm({ username: '', password: '', role: 'admin', name: '', isActive: true });
    setEditingAccount({ isNew: true });
  };

  const handleOpenEditAccount = (acc) => {
    setAccountForm({
      username: acc.username,
      password: '',
      role: acc.role || 'admin',
      name: acc.name || '',
      isActive: acc.isActive !== false
    });
    setEditingAccount(acc);
  };

  const handleAccountSubmit = (e) => {
    e.preventDefault();
    const cleanUser = accountForm.username.trim();
    const cleanPass = accountForm.password.trim();

    if (!cleanUser) {
      if (onShowToast) onShowToast('Username wajib diisi!', 'danger');
      return;
    }
    if (cleanUser.length < 3) {
      if (onShowToast) onShowToast('Username minimal 3 karakter!', 'danger');
      return;
    }

    if (editingAccount.isNew) {
      if (!cleanPass) {
        if (onShowToast) onShowToast('Password wajib diisi untuk akun baru!', 'danger');
        return;
      }
      if (cleanPass.length < 8) {
        if (onShowToast) onShowToast('Password minimal 8 karakter!', 'danger');
        return;
      }
    } else {
      if (cleanPass && cleanPass.length < 8) {
        if (onShowToast) onShowToast('Password baru minimal 8 karakter!', 'danger');
        return;
      }

      // Self protection
      if (currentUser && editingAccount.id === currentUser.id) {
        if (currentUser.role === 'superadmin' && accountForm.role !== 'superadmin') {
          if (onShowToast) onShowToast('Anda tidak dapat menurunkan role akun Anda sendiri!', 'danger');
          return;
        }
        if (!accountForm.isActive) {
          if (onShowToast) onShowToast('Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif!', 'danger');
          return;
        }
      }
    }

    const payload = {
      isNew: !!editingAccount.isNew,
      id: editingAccount.isNew ? `usr-${Date.now()}` : editingAccount.id,
      username: cleanUser,
      password: cleanPass || '',
      role: accountForm.role,
      name: accountForm.name.trim() || (accountForm.role === 'superadmin' ? 'Super Admin' : 'Operator Kasir'),
      isActive: accountForm.isActive !== false
    };

    if (onSaveAccount) onSaveAccount(payload);
    setEditingAccount(null);
  };

  return (
    <div>
      {/* Toolbar Summary */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span><strong style={{ color: 'var(--text-main)' }}>{accounts.length}</strong> Total Akun</span>
          <span>•</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{superAdminCount} Superadmin</span>
          <span>•</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{adminCount} Admin Kasir</span>
        </div>

        {!editingAccount && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenAddAccount}
          >
            <i className="ri-user-add-line"></i> Tambah Akun Kasir
          </button>
        )}
      </div>

      {/* Inline Add / Edit Form Box */}
      {editingAccount && (
        <form onSubmit={handleAccountSubmit} style={{
          background: 'var(--bg-surface-solid)',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--primary)',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <i className={editingAccount.isNew ? "ri-user-add-line" : "ri-edit-line"} style={{ color: 'var(--primary)' }}></i>
              {editingAccount.isNew ? 'Tambah Akun Pengguna Baru' : `Edit Akun: ${editingAccount.username}`}
            </h4>
            <button type="button" className="btn-close-modal" onClick={() => setEditingAccount(null)} aria-label="Batal">
              <i className="ri-close-line"></i>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="acc-name">Nama Lengkap / Label</label>
              <input
                type="text"
                id="acc-name"
                className="form-control"
                placeholder="Contoh: Kasir Shift Pagi"
                value={accountForm.name}
                onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role / Hak Akses</label>
              <CustomSelect
                options={ROLE_OPTIONS}
                value={accountForm.role}
                onChange={(val) => setAccountForm(prev => ({ ...prev, role: val }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="acc-username">Username Login</label>
              <input
                type="text"
                id="acc-username"
                className="form-control"
                placeholder="Username (min 3 karakter)"
                value={accountForm.username}
                onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="acc-password">
                {editingAccount.isNew ? 'Password (Min 8 Karakter)' : 'Password Baru (Opsional)'}
              </label>
              <input
                type="text"
                id="acc-password"
                className="form-control"
                placeholder={editingAccount.isNew ? "Minimal 8 karakter" : "Kosongkan jika tidak diubah"}
                value={accountForm.password}
                onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                required={!!editingAccount.isNew}
              />
            </div>

            {!editingAccount.isNew && (
              <div className="form-group">
                <label className="form-label">Status Akses Akun</label>
                <CustomSelect
                  options={[
                    { value: 'true', label: 'Aktif (Dapat Login)' },
                    { value: 'false', label: 'Nonaktif (Akses Dikunci)' }
                  ]}
                  value={accountForm.isActive ? 'true' : 'false'}
                  onChange={(val) => setAccountForm(prev => ({ ...prev, isActive: val === 'true' }))}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingAccount(null)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              <i className="ri-save-line"></i> Simpan Akun ke Database
            </button>
          </div>
        </form>
      )}

      {/* Desktop Table View (>= 768px) */}
      <div className="dense-table-container accounts-desktop-table">
        <table className="dense-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ paddingLeft: '1rem' }}>Pengguna</th>
              <th>Username</th>
              <th>Role Hak Akses</th>
              <th>Status</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => {
              const isSuper = acc.role === 'superadmin';
              const initials = getAvatarInitials(acc.name, acc.username);
              const isCurrent = currentUser && acc.id === currentUser.id;
              const isLastSuper = isSuper && superAdminCount <= 1;

              return (
                <tr key={acc.id}>
                  <td style={{ paddingLeft: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
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
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-xs)', lineHeight: '1.2' }} className="text-wrap-break">
                          {acc.name || acc.username} {isCurrent && <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700 }}>(Anda)</span>}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {isSuper ? 'Akses Bebas Aplikasi' : 'Akses Hanya Cetak Nota'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      background: 'var(--bg-surface-solid)',
                      border: '1px solid var(--border-color)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      color: 'var(--text-main)'
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
                  <td>
                    {acc.isActive !== false ? (
                      <span className="status-pill status-lunas" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        <i className="ri-checkbox-circle-line" /> Aktif
                      </span>
                    ) : (
                      <span className="status-pill status-cancelled" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                        <i className="ri-close-circle-line" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                      <CustomTooltip text="Edit Akun & Password">
                        <button type="button" className="btn-icon-action" onClick={() => handleOpenEditAccount(acc)} aria-label="Edit Akun">
                          <i className="ri-edit-line"></i>
                        </button>
                      </CustomTooltip>
                      {!isCurrent && !isLastSuper ? (
                        <CustomTooltip text="Hapus Akun">
                          <button type="button" className="btn-icon-action danger" onClick={() => onDeleteAccount && onDeleteAccount(acc.id)} aria-label="Hapus Akun">
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </CustomTooltip>
                      ) : (
                        <CustomTooltip text={isCurrent ? "Akun Anda yang sedang aktif" : "Superadmin utama terakhir tidak dapat dihapus"}>
                          <button type="button" className="btn-icon-action" disabled style={{ opacity: 0.3, cursor: 'not-allowed' }} aria-label="Terkunci">
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

      {/* Mobile Cards View (< 768px) */}
      <div className="mobile-account-list">
        {accounts.map(acc => {
          const isSuper = acc.role === 'superadmin';
          const initials = getAvatarInitials(acc.name, acc.username);
          const isCurrent = currentUser && acc.id === currentUser.id;
          const isLastSuper = isSuper && superAdminCount <= 1;

          return (
            <div key={acc.id} className="mobile-account-card">
              <div className="mobile-account-card-header">
                <div className="mobile-account-user-info">
                  <div className="mobile-account-avatar" style={{
                    background: isSuper ? 'rgba(27, 189, 143, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isSuper ? 'var(--primary)' : '#3b82f6'
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 'var(--text-sm)', lineHeight: '1.2' }} className="text-wrap-break">
                      {acc.name || acc.username} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>(Anda)</span>}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {isSuper ? 'Akses Bebas Aplikasi' : 'Akses Hanya Cetak Nota'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className={`status-pill ${isSuper ? 'status-lunas' : 'status-proses'}`}>
                    <i className={isSuper ? 'ri-shield-keyhole-line' : 'ri-user-3-line'}></i>
                    {isSuper ? 'Superadmin' : 'Admin Kasir'}
                  </span>
                  {acc.isActive === false && (
                    <span className="status-pill status-cancelled" style={{ fontSize: '0.68rem' }}>
                      Nonaktif
                    </span>
                  )}
                </div>
              </div>

              <div className="mobile-account-meta-row">
                <div className="mobile-account-username-box">
                  <span>Username:</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    background: 'var(--bg-surface-solid)',
                    border: '1px solid var(--border-color)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    color: 'var(--text-main)'
                  }}>
                    {acc.username}
                  </span>
                </div>

                <div className="mobile-account-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEditAccount(acc)}
                    aria-label="Edit Akun"
                    style={{ padding: '0.35rem 0.75rem', fontSize: 'var(--text-xs)' }}
                  >
                    <i className="ri-edit-line" aria-hidden="true" /> Edit
                  </button>
                  {!isCurrent && !isLastSuper ? (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDeleteAccount && onDeleteAccount(acc.id)}
                      aria-label="Hapus Akun"
                      style={{ padding: '0.35rem 0.65rem', fontSize: 'var(--text-xs)' }}
                    >
                      <i className="ri-delete-bin-line" aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled
                      style={{ opacity: 0.4, cursor: 'not-allowed', padding: '0.35rem 0.65rem' }}
                      aria-label="Terkunci"
                    >
                      <i className="ri-lock-line" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
