import React from 'react';

export default function Toast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifikasi">
      {toasts.map(toast => {
        let iconName = 'info';
        if (toast.type === 'success') iconName = 'check_circle';
        if (toast.type === 'warning') iconName = 'warning';
        if (toast.type === 'error' || toast.type === 'danger') iconName = 'cancel';

        return (
          <div 
            key={toast.id} 
            className={`toast-item toast-${toast.type || 'info'}`}
            role="alert"
            aria-live="polite"
          >
            <span className="material-symbols-outlined toast-icon" aria-hidden="true">{iconName}</span>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              aria-label="Tutup"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
