import React, { useState, useRef, useEffect } from 'react';
import { formatDateId } from '../../services/storage';

export default function CustomDatePicker({
  value = '',
  onChange,
  placeholder = 'Pilih tanggal...',
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse YYYY-MM-DD string into Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  // Calendar math
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${mm}-${dd}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickSelect = (type) => {
    const today = new Date();
    let targetDate = new Date();

    if (type === 'today') {
      targetDate = today;
    } else if (type === 'yesterday') {
      targetDate.setDate(today.getDate() - 1);
    } else if (type === 'clear') {
      onChange('');
      setIsOpen(false);
      return;
    }

    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value) return placeholder;
    return formatDateId(value);
  };

  const todayStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`custom-datepicker-container ${className}`}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className="form-control"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          cursor: 'pointer',
          padding: '0.4rem 0.65rem',
          fontSize: '0.8rem',
          height: '34px',
          minWidth: '130px',
          background: 'var(--bg-card)',
          color: value ? 'var(--text-color)' : 'var(--text-muted)'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <i className="ri-calendar-event-line" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}></i>
          {formatDisplayValue()}
        </span>
        <i className={`ri-arrow-down-s-line`} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}></i>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            width: '260px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            padding: '0.75rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header Month / Year & Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="page-btn"
              style={{ width: '26px', height: '26px' }}
              onClick={handlePrevMonth}
            >
              <i className="ri-arrow-left-s-line"></i>
            </button>
            <strong style={{ fontSize: '0.825rem', color: 'var(--text-color)' }}>
              {monthNames[currentMonth]} {currentYear}
            </strong>
            <button
              type="button"
              className="page-btn"
              style={{ width: '26px', height: '26px' }}
              onClick={handleNextMonth}
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>

          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', marginBottom: '0.25rem' }}>
            {daysOfWeek.map((day, idx) => (
              <div key={idx} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {/* Empty slots for previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day buttons */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${currentYear}-${mm}-${dd}`;
              const isSelected = value === dateStr;
              const isToday = todayStr() === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  style={{
                    height: '28px',
                    width: '100%',
                    padding: 0,
                    border: 'none',
                    borderRadius: '4px',
                    background: isSelected ? 'var(--primary)' : (isToday ? 'rgba(27, 189, 143, 0.15)' : 'transparent'),
                    color: isSelected ? 'var(--primary-text)' : (isToday ? 'var(--primary)' : 'var(--text-color)'),
                    fontWeight: isSelected || isToday ? 700 : 400,
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-solid)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(27, 189, 143, 0.15)' : 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.4rem' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', fontSize: '0.725rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => handleQuickSelect('today')}
            >
              Hari Ini
            </button>
            <button
              type="button"
              style={{ background: 'none', border: 'none', fontSize: '0.725rem', color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => handleQuickSelect('clear')}
            >
              Hapus Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
