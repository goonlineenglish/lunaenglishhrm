'use client';

// DrmZone — wraps course content with DRM protections:
// - Email watermark overlay (repositions every 30s)
// - Page blur when tab hidden or window loses focus
// - Right-click disabled on video elements only
// - user-select: none on the entire zone

import { useEffect, useRef } from 'react';
import { Watermark } from './watermark';

interface DrmZoneProps {
  userEmail: string;
  children: React.ReactNode;
}

export function DrmZone({ userEmail, children }: DrmZoneProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function applyBlur() {
      if (el) el.style.filter = 'blur(8px)';
    }

    function removeBlur() {
      if (el) el.style.filter = '';
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        applyBlur();
      } else {
        removeBlur();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', applyBlur);
    window.addEventListener('focus', removeBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', applyBlur);
      window.removeEventListener('focus', removeBlur);
    };
  }, []);

  function handleVideoContextMenu(e: React.MouseEvent) {
    // Disable right-click on video elements and iframe players
    const target = e.target as HTMLElement;
    if (target.tagName === 'VIDEO' || target.tagName === 'IFRAME') {
      e.preventDefault();
    }
  }

  return (
    <div
      className="drm-zone relative"
      style={{ userSelect: 'none' }}
      onContextMenu={handleVideoContextMenu}
    >
      {/* Watermark overlay */}
      <Watermark userEmail={userEmail} />

      {/* Blurred content wrapper */}
      <div ref={contentRef} id="drm-content">
        {children}
      </div>
    </div>
  );
}
