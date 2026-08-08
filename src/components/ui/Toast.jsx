import React from 'react';

export default function Toast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        let iconClass = 'ri-information-line';
        if (toast.type === 'success') iconClass = 'ri-checkbox-circle-line';
        if (toast.type === 'warning') iconClass = 'ri-alert-line';
        if (toast.type === 'error') iconClass = 'ri-close-circle-line';

        return (
          <div key={toast.id} className={`toast-item toast-${toast.type || 'info'}`}>
            <i className={`${iconClass} toast-icon`}></i>
            <span className="toast-message">{toast.message}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}
