import React from 'react';

/**
 * Minimal Heroicons-outline style icon set. Each icon inherits `currentColor`
 * and accepts a className so callers control size and color via Tailwind.
 */
const base = {
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.6,
  stroke: 'currentColor',
  'aria-hidden': true,
};

function Svg({ children, className = 'h-5 w-5' }) {
  return (
    <svg className={className} {...base}>
      {children}
    </svg>
  );
}

export const ShieldIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
  </Svg>
);

export const UsersIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM22 19v-2a4 4 0 00-3-3.87M16 4.13A4 4 0 0119 8a4 4 0 01-3 3.87" />
  </Svg>
);

export const KeyIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a5 5 0 10-4.5 7.9l3.1 3.1H14v-2h2v-2h2v-2.1A5 5 0 0015 9z" />
    <circle cx="9.5" cy="9.5" r="1.6" />
  </Svg>
);

export const DocumentIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
  </Svg>
);

export const CubeIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 5v10l-9 5-9-5V7l9-5zM12 2v20M3 7l9 5 9-5" />
  </Svg>
);

export const FolderIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </Svg>
);

export const ChartIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4" />
  </Svg>
);

export const FlagIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4m0 0h11l-2 4 2 4H5" />
  </Svg>
);

export const ServerIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16v5H4zM4 13h16v5H4zM7.5 8.5h.01M7.5 15.5h.01" />
  </Svg>
);

export const ClipboardIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1zM8 6H6a2 2 0 00-2 2v11a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-2" />
  </Svg>
);

export const PlusIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </Svg>
);

export const SearchIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z" />
  </Svg>
);

export const ArrowLeftIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5 5-5M6 12h12" />
  </Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5M21 12H9m4-7H5a2 2 0 00-2 2v14a2 2 0 002 2h8" />
  </Svg>
);

export const BellIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h-6m6 0a3 3 0 11-6 0m6 0V11a6 6 0 10-12 0v6l-2 2h16l-2-2z" />
  </Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </Svg>
);

export const XIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ExclamationIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.4 17a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
  </Svg>
);

export const PencilIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L19 9a2 2 0 00-3-3L5 17v3zM14 6l3 3" />
  </Svg>
);

export const TrashIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-9 0v12a2 2 0 002 2h6a2 2 0 002-2V7" />
  </Svg>
);

export const EyeIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);

export const EyeOffIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 4.2A10.9 10.9 0 0112 4c6.5 0 10 7 10 7a18 18 0 01-3.6 4.4M6.1 6.1A18 18 0 002 11s3.5 7 10 7a10.9 10.9 0 004-.8" />
  </Svg>
);

export const CogIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 2h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 22h4l.6-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
  </Svg>
);

export const SparkIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5l-2.5 2.5M9 15l-2.5 2.5m11 0L15 15M9 9L6.5 6.5" />
  </Svg>
);

export const PlugIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v5m6-5v5M7 8h10v3a5 5 0 01-10 0V8zM12 16v5" />
  </Svg>
);

export const PlayIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 5l12 7-12 7V5z" />
  </Svg>
);

export const ClockIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" />
  </Svg>
);

export const ChevronDownIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </Svg>
);

export const ArrowUpRightIcon = (p) => (
  <Svg {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M8 7h9v9" />
  </Svg>
);

export const DotsIcon = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </Svg>
);

export const GoogleIcon = (p) => (
  <svg className={p.className || 'h-5 w-5'} viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.8z" />
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0012 23z" />
    <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 010-4.2V7.4H2.3a11 11 0 000 9.2L6 14.4z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 002 7.4l3.7 2.8C6.9 7.3 9.2 5.4 12 5.4z" />
  </svg>
);

export const MicrosoftIcon = (p) => (
  <svg className={p.className || 'h-5 w-5'} viewBox="0 0 24 24" aria-hidden>
    <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
    <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
    <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
    <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
  </svg>
);

export const GithubIcon = (p) => (
  <svg className={p.className || 'h-5 w-5'} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.300000-4.6-1.1-4.6-5a3.9 3.9 0 011-2.7c-.1-.3-.4-1.3.1-2.7 0 0 .9-.3 2.8 1a9.4 9.4 0 015 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 011 2.7c0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.8v2.6c0 .3.2.6.7.5A10 10 0 0012 2z" />
  </svg>
);
