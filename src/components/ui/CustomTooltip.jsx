import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * CustomTooltip — Accessible tooltip using fixed positioning
 *
 * Uses fixed positioning to escape overflow:hidden ancestors.
 * Shows above trigger by default, flips below if insufficient space.
 * Respects prefers-reduced-motion.
 * No layout-affecting transforms — only opacity transition.
 */
export default function CustomTooltip({ text, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  const TOOLTIP_GAP = 6;
  const TOOLTIP_OFFSET = 8; // min distance from viewport edge

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Horizontal center aligned to trigger
    let left = rect.left + rect.width / 2;
    // Clamp so tooltip stays within viewport (approximate 160px max width)
    const tooltipHalfW = 80;
    left = Math.max(TOOLTIP_OFFSET + tooltipHalfW, Math.min(vw - TOOLTIP_OFFSET - tooltipHalfW, left));

    // Vertical: prefer 'top', flip to 'bottom' if not enough space
    const showAbove = position === 'top' && rect.top > 40;
    const showBelow = position === 'bottom' || !showAbove;

    setTooltipStyle({
      position: 'fixed',
      left,
      transform: 'translateX(-50%)',
      zIndex: 'var(--z-tooltip, 1200)',
      ...(showBelow
        ? { top: rect.bottom + TOOLTIP_GAP }
        : { bottom: vh - rect.top + TOOLTIP_GAP }),
    });
  }, [position]);

  const handleShow = useCallback(() => {
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 180);
  }, [calculatePosition]);

  const handleHide = useCallback(() => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setIsVisible(false), 80);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (!text) return children;

  return (
    <>
      {/* Trigger wrapper — inline-block to not disrupt layout */}
      <span
        ref={triggerRef}
        className="custom-tooltip-wrapper"
        onMouseEnter={handleShow}
        onMouseLeave={handleHide}
        onFocus={handleShow}
        onBlur={handleHide}
      >
        {children}
      </span>

      {/* Tooltip bubble — fixed position, escapes any overflow:hidden */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="custom-tooltip-bubble"
          style={tooltipStyle}
          role="tooltip"
          aria-live="polite"
        >
          {text}
        </div>
      )}
    </>
  );
}
