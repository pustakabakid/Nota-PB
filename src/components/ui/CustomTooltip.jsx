import React, { useState } from 'react';

export default function CustomTooltip({ text, children, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!text) return children;

  return (
    <div
      className="custom-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`custom-tooltip-bubble position-${position}`}>
          {text}
        </div>
      )}
    </div>
  );
}
