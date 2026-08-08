import React, { useEffect } from 'react';

export default function ConfirmModal({
  isOpen,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'primary',
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop show confirm-modal-backdrop">
      <div className="modal-content confirm-modal-content">
        <div className="confirm-modal-header">
          <div className={`confirm-icon-box confirm-icon-${variant}`}>
            <i className={variant === 'danger' ? 'ri-error-warning-line' : 'ri-question-line'}></i>
          </div>
          <div>
            <h3 className="confirm-modal-title">{title}</h3>
            <p className="confirm-modal-message">{message}</p>
          </div>
        </div>

        <div className="confirm-modal-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-${variant} btn-sm`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
