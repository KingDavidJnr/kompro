import React from 'react';

/**
 * Kompro brand mark. The supplied logo image already contains the full
 * "kompro" wordmark, so we render only the image — no redundant text.
 */
export default function Logo({ className = 'h-8 w-auto' }) {
  return <img src="/kompro-logo.png" alt="Kompro" className={className} />;
}
