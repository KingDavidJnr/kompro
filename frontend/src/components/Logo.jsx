import React from 'react';

/**
 * Kompro brand mark. Renders the supplied logo image when available, otherwise
 * a purple wordmark so self-hosted deployments always show Kompro's identity.
 */
export default function Logo({ className = 'h-8 w-auto', withWordmark = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/kompro-logo.png" alt="Kompro" className={className} />
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-slate-900">
          Kom<span className="text-brand-600">pro</span>
        </span>
      )}
    </span>
  );
}
