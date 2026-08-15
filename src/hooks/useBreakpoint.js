import { useState, useEffect } from 'react';

function getBreakpoint() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Reactive breakpoint hook — Mobile (<768px) | Tablet (768-1023px) | Desktop (≥1024px)
 * Uses resize listener (passive) for minimal performance impact.
 */
export function useBreakpoint() {
  const [bp, setBp] = useState(getBreakpoint);

  useEffect(() => {
    let raf = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBp(getBreakpoint()));
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return {
    breakpoint: bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    isMobileOrTablet: bp !== 'desktop',
  };
}
