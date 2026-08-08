import React, { useState, useRef, useEffect } from 'react';

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
  const selectRef = useRef(null);

  // Normalize options array to [{ value, label }]
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

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (highlightedIndex >= 0 && highlightedIndex < normalizedOptions.length) {
        onChange(normalizedOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => (prev < normalizedOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(normalizedOptions.length - 1);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : normalizedOptions.length - 1));
      }
    }
  };

  return (
    <div
      ref={selectRef}
      className={`custom-select-container ${isOpen ? 'open' : ''} ${className}`}
      style={style}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`ri-arrow-down-s-line custom-select-chevron ${isOpen ? 'rotate' : ''}`}></i>
      </button>

      {isOpen && (
        <ul className="custom-select-dropdown" role="listbox">
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
                  className={`custom-select-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
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
                  {isSelected && <i className="ri-check-line custom-select-check"></i>}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
