import React from 'react';

export default function Toast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifikasi">
      {toasts.map(toast => {
        let iconClass = 'ri-information-line';
        if (toast.type === 'success') iconClass = 'ri-checkbox-circle-line';
        if (toast.type === 'warning') iconClass = 'ri-alert-line';
        if (toast.type === 'error' || toast.type === 'danger') iconClass = 'ri-close-circle-line';

        return (
          <div 
            key={toast.id} 
            className={`toast-item toast-${toast.type || 'info'}`}
            role="alert"
            aria-live="polite"
          >
            <i className={`${iconClass} toast-icon`} aria-hidden="true" />
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Tutup"
            >
              <i className="ri-close-line" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
