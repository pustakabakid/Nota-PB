import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDateId } from '../../services/storage';

/**
 * CustomDatePicker — Calendar popup with viewport collision detection
 *
 * Positioning:  Fixed positioning to escape overflow:hidden parents.
 *               Auto-flips UP if insufficient space below.
 *               Clamps horizontally to stay within viewport.
 *
 * Hover states: Background/color only — no transforms that shift layout.
 *
 * Z-index:      var(--z-datepicker) = 1060
 */
export default function CustomDatePicker({
  value = '',
  onChange,
  placeholder = 'Pilih tanggal...',
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Parse YYYY-MM-DD string → Date object (no timezone shift)
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  useEffect(() => {
    if (value) setViewDate(parseDate(value));
  }, [value]);

  const CALENDAR_WIDTH = 280;
  const CALENDAR_HEIGHT = 300; // approximate
  const GAP = 4;

  /**
   * Calculate fixed position using viewport collision detection.
   */
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const showAbove = spaceBelow < CALENDAR_HEIGHT && spaceAbove > spaceBelow;

    // Clamp horizontal position
    let left = rect.left;
    if (left + CALENDAR_WIDTH > vw - 8) {
      left = vw - CALENDAR_WIDTH - 8;
    }
    left = Math.max(8, left);

    setPopoverStyle({
      position: 'fixed',
      left,
      width: Math.min(CALENDAR_WIDTH, vw - 16),
      zIndex: 'var(--z-datepicker, 1060)',
      ...(showAbove
        ? { bottom: vh - rect.top + GAP, top: 'auto' }
        : { top: rect.bottom + GAP, bottom: 'auto' }
      ),
    });
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    calculatePosition();

    const update = () => calculatePosition();
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [isOpen, calculatePosition]);

  // Calendar math
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const handleSelectDay = (day) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${currentYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleQuickSelect = (type) => {
    const today = new Date();
    if (type === 'clear') {
      onChange('');
      setIsOpen(false);
      return;
    }
    const target = type === 'today' ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const formatDisplayValue = () => {
    if (!value) return <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>;
    return formatDateId(value);
  };

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      calculatePosition();
      setIsOpen(true);
    }
  };

  return (
    <>
      {/* Trigger — stays in document flow */}
      <div
        ref={triggerRef}
        className={`custom-datepicker-container ${className}`}
        style={style}
      >
        <button
          type="button"
          className="custom-datepicker-trigger form-control"
          onClick={handleToggle}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span className="cdp-trigger-content">
            <i className="ri-calendar-event-line cdp-trigger-icon" aria-hidden="true" />
            <span className="cdp-trigger-label">{formatDisplayValue()}</span>
          </span>
          <i
            className="ri-arrow-down-s-line cdp-trigger-chevron"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Calendar Popover — fixed position, escapes any overflow:hidden */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="custom-datepicker-popover"
          style={popoverStyle}
          role="dialog"
          aria-label="Pilih Tanggal"
          aria-modal="false"
        >
          {/* Month / Year Navigation */}
          <div className="cdp-month-nav">
            <button
              type="button"
              className="btn-icon-action cdp-nav-btn"
              onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
              aria-label="Bulan Sebelumnya"
            >
              <i className="ri-arrow-left-s-line" aria-hidden="true" />
            </button>
            <strong className="cdp-month-label">
              {monthNames[currentMonth]} {currentYear}
            </strong>
            <button
              type="button"
              className="btn-icon-action cdp-nav-btn"
              onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
              aria-label="Bulan Berikutnya"
            >
              <i className="ri-arrow-right-s-line" aria-hidden="true" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="cdp-dow-grid">
            {daysOfWeek.map((d, i) => (
              <div key={i} className="cdp-dow-cell">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="cdp-day-grid">
            {/* Empty slots for previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}

            {/* Day buttons */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateStr = `${currentYear}-${mm}-${dd}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={day}
                  type="button"
                  className={`cdp-day-btn${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => handleSelectDay(day)}
                  aria-label={`${day} ${monthNames[currentMonth]} ${currentYear}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick action footer */}
          <div className="cdp-footer">
            <button
              type="button"
              className="cdp-quick-btn cdp-quick-today"
              onClick={() => handleQuickSelect('today')}
            >
              Hari Ini
            </button>
            <button
              type="button"
              className="cdp-quick-btn cdp-quick-clear"
              onClick={() => handleQuickSelect('clear')}
            >
              Hapus
            </button>
          </div>
        </div>
      )}
    </>
  );
}
