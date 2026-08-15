import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CustomSelect — Accessible custom dropdown listbox
 *
 * Positioning:  Uses viewport collision detection to flip UP if insufficient
 *               space below. Uses fixed positioning to escape any overflow:hidden
 *               parent containers.
 *
 * Hover states: Background/color only — no layout-affecting transforms.
 *
 * Z-index:      var(--z-dropdown) = 1050
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Pilih opsi...',
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Normalize options to [{ value, label, sublabel }]
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? opt.value : opt.id,
        label: opt.label || opt.name || String(opt.value),
        sublabel: opt.sublabel
      };
    }
    return { value: opt, label: String(opt) };
  });

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  /**
   * Calculate dropdown position using viewport collision detection.
   * Uses fixed positioning so it escapes any overflow:hidden ancestors.
   */
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const DROPDOWN_MAX_HEIGHT = 280;
    const GAP = 4;

    const spaceBelow = viewportHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const showAbove = spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow;

    // Horizontal: align left, but clamp to viewport right edge
    const left = Math.min(rect.left, viewportWidth - Math.min(rect.width, 360) - 8);

    const newStyle = {
      position: 'fixed',
      left: Math.max(8, left),
      width: Math.min(rect.width, viewportWidth - 16),
      zIndex: 'var(--z-dropdown, 1050)',
      ...(showAbove
        ? { bottom: viewportHeight - rect.top + GAP, top: 'auto' }
        : { top: rect.bottom + GAP, bottom: 'auto' }
      ),
    };

    setDropdownStyle(newStyle);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
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

    const handleScrollOrResize = () => {
      calculatePosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  const handleOpen = () => {
    setHighlightedIndex(-1);
    calculatePosition();
    setIsOpen(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        handleOpen();
      } else if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
        onChange(normalizedOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        handleOpen();
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        handleOpen();
        setHighlightedIndex(normalizedOptions.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
      }
    }
  };

  return (
    <>
      {/* Trigger button — stays in document flow */}
      <div
        ref={containerRef}
        className={`custom-select-container ${isOpen ? 'open' : ''} ${className}`}
        style={style}
      >
        <button
          ref={triggerRef}
          type="button"
          className="custom-select-trigger"
          onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="custom-select-value">
            {selectedOption ? selectedOption.label : <span className="custom-select-placeholder">{placeholder}</span>}
          </span>
          <i className={`ri-arrow-down-s-line custom-select-chevron${isOpen ? ' rotate' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {/* Dropdown — rendered at document root via fixed positioning (escapes overflow:hidden) */}
      {isOpen && (
        <ul
          ref={dropdownRef}
          className="custom-select-dropdown"
          role="listbox"
          style={dropdownStyle}
        >
          {normalizedOptions.length === 0 ? (
            <li className="custom-select-empty">Tidak ada pilihan</li>
          ) : (
            normalizedOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-option${isSelected ? ' selected' : ''}${isHighlighted ? ' highlighted' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className="custom-select-option-text">
                    {opt.label}
                    {opt.sublabel && <small className="custom-select-sublabel">{opt.sublabel}</small>}
                  </span>
                  {isSelected && <i className="ri-check-line custom-select-check" aria-hidden="true" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </>
  );
}
