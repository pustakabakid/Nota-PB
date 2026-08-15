import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app, #f8fafc)',
          padding: '1.5rem',
          fontFamily: 'var(--font-main, sans-serif)',
          color: 'var(--text-main, #1e293b)'
        }}>
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '2.5rem 2rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.1))'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--danger, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1.25rem auto'
            }}>
              <i className="ri-error-warning-line" aria-hidden="true"></i>
            </div>
            <h2 style={{
              fontSize: 'var(--text-lg, 1.25rem)',
              fontWeight: 700,
              marginBottom: '0.75rem',
              color: 'var(--text-main, #1e293b)'
            }}>
              Terjadi Kesalahan Tampilan
            </h2>
            <p style={{
              fontSize: 'var(--text-xs, 0.875rem)',
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.6,
              marginBottom: '1.75rem'
            }}>
              Aplikasi mengalami kendala saat memuat antarmuka. Silakan klik tombol di bawah untuk memuat ulang sesi kasir Anda.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem 1.25rem',
                fontSize: 'var(--text-sm, 0.875rem)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <i className="ri-refresh-line" aria-hidden="true"></i>
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
