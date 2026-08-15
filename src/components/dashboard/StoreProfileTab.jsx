import React, { useState, useEffect } from 'react';
import CustomSelect from '../ui/CustomSelect';

const PAPER_OPTIONS = [
  { value: 'A4', label: 'Kertas A4 (Faktur Standar 210×297 mm)', sublabel: 'Ukuran faktur/invoice formal korporat' },
  { value: 'A5', label: 'Kertas A5 (Setengah Kuarto 148×210 mm)', sublabel: 'Ukuran nota kasir sedang & hemat' },
  { value: '80mm', label: 'Thermal Struk 80mm (POS-80)', sublabel: 'Printer thermal kasir standar (lebar 80mm)' },
  { value: '58mm', label: 'Thermal Mini 58mm (POS-58)', sublabel: 'Printer thermal portable / bluetooth (lebar 58mm)' },
  { value: 'custom', label: '⚙️ Ukuran Kertas Kustom (Atur Sendiri)', sublabel: 'Tentukan lebar, tinggi, dan margin sesuai kertas printer Anda' }
];

const QR_SIZE_OPTIONS = [
  { value: 'small', label: 'Kecil (Compact)', sublabel: 'Ukuran ringkas & minimalis' },
  { value: 'medium', label: 'Sedang (Standar)', sublabel: 'Proporsional & seimbang (Rekomendasi)' },
  { value: 'large', label: 'Besar (Lapang)', sublabel: 'Jelas & mudah discan dari jauh' },
  { value: 'custom', label: '⚙️ Ukuran QR Kustom (Atur Sendiri)', sublabel: 'Tentukan dimensi pixel dan posisi penempatan QR' }
];

const QR_POSITION_OPTIONS = [
  { value: 'right', label: 'Kanan Bawah (Standar)', sublabel: 'Samping catatan footer' },
  { value: 'center', label: 'Tengah (Berpusat)', sublabel: 'Cocok untuk struk thermal roll' },
  { value: 'left', label: 'Kiri Bawah', sublabel: 'Sisi kiri footer' }
];

const DENSITY_OPTIONS = [
  { value: 'normal', label: 'Normal (Standar)', sublabel: 'Jarak baris nyaman & proporsional' },
  { value: 'compact', label: 'Ramping (Hemat Ruang)', sublabel: 'Spasi rapat untuk menghemat kertas cetak' },
  { value: 'spacious', label: 'Lapang (Eksekutif)', sublabel: 'Jarak lega untuk dokumen formal' }
];

export default function StoreProfileTab({
  storeProfile,
  onSaveStoreProfile,
  onShowToast
}) {
  const [storeForm, setStoreForm] = useState({
    name: '',
    subtitle: '',
    address: '',
    phone: '',
    footerMsg: '',
    defaultPaper: 'A4',
    customPaperName: 'Kustom',
    customPaperWidth: 100,
    customPaperHeight: 150,
    customPaperMargin: 4,
    qrSize: 'medium',
    customQrSize: 24,
    customQrUnit: 'mm',
    customQrSizePx: 80,
    qrPosition: 'right',
    showQrCode: true,
    density: 'normal',
    bankName: '',
    bankAccount: '',
    bankHolder: ''
  });

  useEffect(() => {
    if (storeProfile) {
      setStoreForm({
        name: storeProfile.name || '',
        subtitle: storeProfile.subtitle || '',
        address: storeProfile.address || '',
        phone: storeProfile.phone || '',
        footerMsg: storeProfile.footerMsg || 'Terima kasih atas kunjungan Anda.',
        defaultPaper: storeProfile.defaultPaper || 'A4',
        customPaperName: storeProfile.customPaperName || 'Kustom',
        customPaperWidth: Number(storeProfile.customPaperWidth) || 100,
        customPaperHeight: storeProfile.customPaperHeight !== undefined ? Number(storeProfile.customPaperHeight) : 150,
        customPaperMargin: storeProfile.customPaperMargin !== undefined ? Number(storeProfile.customPaperMargin) : 4,
        qrSize: storeProfile.qrSize || 'medium',
        customQrSize: storeProfile.customQrSize !== undefined ? Number(storeProfile.customQrSize) : (Number(storeProfile.customQrSizePx) || 24),
        customQrUnit: storeProfile.customQrUnit || 'mm',
        customQrSizePx: Number(storeProfile.customQrSizePx) || 80,
        qrPosition: storeProfile.qrPosition || 'right',
        showQrCode: storeProfile.showQrCode !== false,
        density: storeProfile.density || 'normal',
        bankName: storeProfile.bankName || '',
        bankAccount: storeProfile.bankAccount || '',
        bankHolder: storeProfile.bankHolder || ''
      });
    }
  }, [storeProfile]);

  const handleStoreSubmit = (e) => {
    e.preventDefault();
    if (!storeForm.name.trim()) {
      if (onShowToast) onShowToast('Nama Toko tidak boleh kosong.', 'warning');
      return;
    }
    onSaveStoreProfile(storeForm);
  };

  return (
    <form onSubmit={handleStoreSubmit} className="store-profile-wrapper">
      {/* Top Store Profile Header Banner */}
      <div className="store-profile-header-card">
        <div className="store-header-left">
          <div className="store-avatar-icon">
            <i className="ri-store-2-fill" aria-hidden="true" />
          </div>
          <div>
            <h3 className="store-header-title">Pengaturan Toko, Format Cetak & QR Code</h3>
            <p className="store-header-subtitle">
              Konfigurasikan identitas percetakan, ukuran kertas bawaan, skala QR code, info rekening, dan preferensi cetak nota.
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Main Settings Grid */}
      <div className="store-settings-grid">
        {/* Column 1: Identitas & Kontak */}
        <div className="store-card">
          <div className="store-card-header">
            <h4 className="store-card-title">
              <i className="ri-building-line" style={{ color: 'var(--primary)' }} /> Identitas Bisnis & Kontak
            </h4>
            <span className="store-card-desc">Informasi utama toko yang tampil pada kop nota kasir.</span>
          </div>

          <div className="store-card-body">
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" htmlFor="store-name">
                <i className="ri-store-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Nama Toko / Usaha Percetakan <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="store-name"
                className="form-control"
                placeholder="Contoh: Pustaka Bakid"
                value={storeForm.name}
                onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" htmlFor="store-subtitle">
                <i className="ri-quote-text" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Sub-Judul / Tagline Toko
              </label>
              <input
                type="text"
                id="store-subtitle"
                className="form-control"
                placeholder="Contoh: Digital Printing & Percetakan"
                value={storeForm.subtitle}
                onChange={(e) => setStoreForm(prev => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="store-phone">
                <i className="ri-whatsapp-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Nomor Telepon / WhatsApp Toko
              </label>
              <input
                type="text"
                id="store-phone"
                className="form-control"
                placeholder="Contoh: 0823-3509-6817"
                value={storeForm.phone}
                onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Column 2: Alamat & Pesan Footer Nota */}
        <div className="store-card">
          <div className="store-card-header">
            <h4 className="store-card-title">
              <i className="ri-map-pin-line" style={{ color: 'var(--primary)' }} /> Alamat Fisik & Catatan Nota
            </h4>
            <span className="store-card-desc">Lokasi workshop percetakan dan pesan penutup pada nota cetak.</span>
          </div>

          <div className="store-card-body">
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" htmlFor="store-address">
                <i className="ri-map-pin-user-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Alamat Lengkap Toko / Workshop
              </label>
              <textarea
                id="store-address"
                className="form-control store-textarea-address"
                rows="3"
                placeholder="Contoh: Jl. Raya Syarifuddin No. 88, Wonorejo, Lumajang"
                value={storeForm.address}
                onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                style={{ minHeight: '94px', resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="store-footer-msg">
                <i className="ri-chat-smile-2-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Pesan Catatan Footer Nota
              </label>
              <input
                type="text"
                id="store-footer-msg"
                className="form-control"
                placeholder="Contoh: Terima kasih. Cetakan tidak dapat dibatalkan."
                value={storeForm.footerMsg}
                onChange={(e) => setStoreForm(prev => ({ ...prev, footerMsg: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Column 3: Format Cetak & Kertas Bawaan */}
        <div className="store-card">
          <div className="store-card-header">
            <h4 className="store-card-title">
              <i className="ri-printer-line" style={{ color: 'var(--primary)' }} /> Ukuran Kertas & Kerapatan
            </h4>
            <span className="store-card-desc">Pengaturan ukuran kertas default dan kepadatan baris nota.</span>
          </div>

          <div className="store-card-body">
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label">
                <i className="ri-file-paper-2-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Ukuran Kertas Bawaan (Default Paper)
              </label>
              <CustomSelect
                options={PAPER_OPTIONS}
                value={storeForm.defaultPaper}
                onChange={(val) => setStoreForm(prev => ({ ...prev, defaultPaper: val }))}
              />
            </div>

            {/* Custom Paper Settings Box */}
            {storeForm.defaultPaper === 'custom' && (
              <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.03))', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)', marginBottom: '1.15rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.65rem' }}>
                  <i className="ri-ruler-2-line" /> Konfigurasi Ukuran Kertas Kustom
                </span>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Label / Nama Kertas</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Kertas F4 / Folio (215x330 mm)"
                    value={storeForm.customPaperName}
                    onChange={(e) => setStoreForm(prev => ({ ...prev, customPaperName: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Lebar (mm)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="100"
                      value={storeForm.customPaperWidth}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, customPaperWidth: Math.max(30, Number(e.target.value) || 0) }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Tinggi (mm)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0 = Roll"
                      value={storeForm.customPaperHeight}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, customPaperHeight: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Margin (mm)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="4"
                      value={storeForm.customPaperMargin}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, customPaperMargin: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                  *Tips: Isi tinggi 0 untuk printer thermal roll continuous (panjang otomatis mengikuti isi nota).
                </span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                <i className="ri-line-height" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Kerapatan Tata Letak Nota (Density)
              </label>
              <CustomSelect
                options={DENSITY_OPTIONS}
                value={storeForm.density}
                onChange={(val) => setStoreForm(prev => ({ ...prev, density: val }))}
              />
            </div>
          </div>
        </div>

        {/* Column 4: Pengaturan QR Code & Rekening */}
        <div className="store-card">
          <div className="store-card-header">
            <h4 className="store-card-title">
              <i className="ri-qr-code-line" style={{ color: 'var(--primary)' }} /> Pengaturan QR Code & Rekening
            </h4>
            <span className="store-card-desc">Ukuran QR Code nota dan detail rekening untuk pembayaran transfer.</span>
          </div>

          <div className="store-card-body">
            {/* QR Code Visibility & Size */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-input, rgba(0,0,0,0.03))', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>Tampilkan QR Code Nota</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cetak QR verifikasi pada struk / PDF</span>
              </div>
              <button
                type="button"
                className={`btn btn-sm ${storeForm.showQrCode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStoreForm(prev => ({ ...prev, showQrCode: !prev.showQrCode }))}
                style={{ minWidth: '70px', fontWeight: 600 }}
              >
                {storeForm.showQrCode ? 'Aktif ✓' : 'Mati ✕'}
              </button>
            </div>

            {storeForm.showQrCode && (
              <>
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label">
                    <i className="ri-aspect-ratio-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Ukuran / Skala QR Code
                  </label>
                  <CustomSelect
                    options={QR_SIZE_OPTIONS}
                    value={storeForm.qrSize}
                    onChange={(val) => setStoreForm(prev => ({ ...prev, qrSize: val }))}
                  />
                </div>

                {/* Custom QR Size & Position Controls */}
                {storeForm.qrSize === 'custom' && (
                  <div style={{ background: 'var(--bg-input, rgba(0,0,0,0.03))', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)', marginBottom: '1.15rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.65rem' }}>
                      <i className="ri-ruler-line" /> Konfigurasi QR Code Kustom
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                          Ukuran QR ({storeForm.customQrUnit.toUpperCase()})
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="number"
                            className="form-control"
                            placeholder={storeForm.customQrUnit === 'mm' ? "24" : "80"}
                            value={storeForm.customQrSize}
                            onChange={(e) => setStoreForm(prev => ({
                              ...prev,
                              customQrSize: Math.max(8, Number(e.target.value) || 0),
                              customQrSizePx: prev.customQrUnit === 'mm' ? Math.round((Number(e.target.value) || 24) * 3.78) : (Number(e.target.value) || 80)
                            }))}
                            style={{ flex: 1 }}
                          />
                          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => setStoreForm(prev => ({
                                ...prev,
                                customQrUnit: 'mm',
                                customQrSize: prev.customQrUnit === 'px' ? Math.max(8, Math.round(prev.customQrSize / 3.78)) : prev.customQrSize
                              }))}
                              style={{
                                border: 'none',
                                padding: '0 8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: storeForm.customQrUnit === 'mm' ? 'var(--primary)' : 'var(--bg-card)',
                                color: storeForm.customQrUnit === 'mm' ? '#ffffff' : 'var(--text-main)',
                                cursor: 'pointer'
                              }}
                            >
                              mm
                            </button>
                            <button
                              type="button"
                              onClick={() => setStoreForm(prev => ({
                                ...prev,
                                customQrUnit: 'px',
                                customQrSize: prev.customQrUnit === 'mm' ? Math.round(prev.customQrSize * 3.78) : prev.customQrSize
                              }))}
                              style={{
                                border: 'none',
                                padding: '0 8px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: storeForm.customQrUnit === 'px' ? 'var(--primary)' : 'var(--bg-card)',
                                color: storeForm.customQrUnit === 'px' ? '#ffffff' : 'var(--text-main)',
                                cursor: 'pointer'
                              }}
                            >
                              px
                            </button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Posisi QR</label>
                        <CustomSelect
                          options={QR_POSITION_OPTIONS}
                          value={storeForm.qrPosition}
                          onChange={(val) => setStoreForm(prev => ({ ...prev, qrPosition: val }))}
                        />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      *Ukuran ini dijamin 100% presisi dan sama persis antara tampilan web, cetakan printer fisik, dan berkas PDF.
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Bank Info */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.6rem' }}>
                Info Rekening Bank (Pembayaran Transfer)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nama Bank (BCA/BRI/BSI)"
                  value={storeForm.bankName}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, bankName: e.target.value }))}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nomor Rekening"
                  value={storeForm.bankAccount}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, bankAccount: e.target.value }))}
                />
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Atas Nama Rekening (Pemilik)"
                value={storeForm.bankHolder}
                onChange={(e) => setStoreForm(prev => ({ ...prev, bankHolder: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Card (Read-only Kop Nota Preview) */}
      <div className="store-preview-card">
        <div className="store-preview-header">
          <span className="store-preview-title">
            <i className="ri-file-text-line" style={{ color: 'var(--primary)' }} /> Live Preview Kop, Rekening & Footer Nota
          </span>
          <span className="store-preview-badge">Live Preview</span>
        </div>
        <div className="store-preview-content">
          <div className="store-preview-kop">
            <strong className="store-preview-store-name">{storeForm.name || 'Nama Toko Percetakan'}</strong>
            {storeForm.subtitle && <span className="store-preview-subtitle">{storeForm.subtitle}</span>}
            {storeForm.address && <span className="store-preview-address"><i className="ri-map-pin-line" /> {storeForm.address}</span>}
            {storeForm.phone && <span className="store-preview-phone"><i className="ri-phone-line" /> Telp/WA: {storeForm.phone}</span>}
            {storeForm.bankName && storeForm.bankAccount && (
              <span className="store-preview-phone" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                <i className="ri-bank-card-line" /> {storeForm.bankName} {storeForm.bankAccount} {storeForm.bankHolder ? `(a.n ${storeForm.bankHolder})` : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>
              {storeForm.footerMsg && <span><i className="ri-information-line" /> {storeForm.footerMsg}</span>}
            </span>
            <span style={{ fontSize: '0.72rem', background: 'var(--bg-input, #eee)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Kertas: {storeForm.defaultPaper === 'custom' ? `${storeForm.customPaperName || 'Kustom'} (${storeForm.customPaperWidth}×${storeForm.customPaperHeight || 'Auto'}mm)` : storeForm.defaultPaper} | QR: {storeForm.showQrCode ? (storeForm.qrSize === 'custom' ? `${storeForm.customQrSize}${storeForm.customQrUnit.toUpperCase()} (${storeForm.qrPosition.toUpperCase()})` : storeForm.qrSize.toUpperCase()) : 'NONAKTIF'} | Layout: {storeForm.density.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar (Full Width, Right-aligned Save Button) */}
      <div className="store-action-bar">
        <div className="store-action-tip">
          <i className="ri-information-line" /> Perubahan profil dan preferensi cetak kustom akan langsung diterapkan pada seluruh dokumen nota kasir.
        </div>
        <button type="submit" className="btn btn-primary store-btn-save">
          <i className="ri-save-line" aria-hidden="true" /> Simpan Pengaturan
        </button>
      </div>
    </form>
  );
}
