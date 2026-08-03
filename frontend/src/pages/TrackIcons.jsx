import React from 'react';

/**
 * Track icon badges — gradient "soft-3D" style (depth via sheen + shadow, no external images).
 * Each is a self-contained SVG component. Drop-in replacement for the old emoji array:
 *
 *   import { TRACKS } from './TrackIcons';
 *   TRACKS.map(({ name, Icon }) => <Icon key={name} size={56} />)
 *
 * Order matches the tracks list exactly.
 */

const Badge = ({ id, gradFrom, gradTo, size, children }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={gradFrom} />
        <stop offset="100%" stopColor={gradTo} />
      </linearGradient>
      <radialGradient id={`sheen-${id}`} cx="30%" cy="22%" r="60%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      <filter id={`shadow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={gradTo} floodOpacity="0.35" />
      </filter>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#grad-${id})`} filter={`url(#shadow-${id})`} />
    <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#sheen-${id})`} />
    {children}
  </svg>
);

const stroke = { stroke: '#fff', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
const fillWhite = { fill: '#fff' };

export const AIAutomationIcon = ({ size = 56 }) => (
  <Badge id="ai" gradFrom="#6D5BF9" gradTo="#3B2FBF" size={size}>
    <rect x="24" y="24" width="16" height="16" rx="3" {...stroke} />
    <circle cx="32" cy="32" r="3.2" {...fillWhite} />
    <path d="M32 24V17M32 47V40M24 32H17M47 32H40" {...stroke} />
    <path d="M27 20l-2-3M39 47l2 3M39 20l2-3M27 47l-2 3" {...stroke} strokeWidth="2" />
  </Badge>
);

export const CybersecurityIcon = ({ size = 56 }) => (
  <Badge id="sec" gradFrom="#22B8CF" gradTo="#0B6E8C" size={size}>
    <path d="M32 15l13 5v10c0 9-5.5 15.5-13 19-7.5-3.5-13-10-13-19V20z" {...stroke} />
    <path d="M27 32l4 4 8-8" {...stroke} />
  </Badge>
);

export const DataAnalyticsIcon = ({ size = 56 }) => (
  <Badge id="data" gradFrom="#F5A623" gradTo="#C46A00" size={size}>
    <rect x="19" y="34" width="6" height="12" rx="1.5" {...fillWhite} />
    <rect x="29" y="26" width="6" height="20" rx="1.5" {...fillWhite} />
    <rect x="39" y="19" width="6" height="27" rx="1.5" {...fillWhite} opacity="0.95" />
    <path d="M18 27l9-7 8 5 11-9" {...stroke} strokeWidth="2.2" />
  </Badge>
);

export const FullStackDevIcon = ({ size = 56 }) => (
  <Badge id="dev" gradFrom="#4B6CB7" gradTo="#1B2A56" size={size}>
    <path d="M25 22l-9 10 9 10" {...stroke} />
    <path d="M39 22l9 10-9 10" {...stroke} />
    <path d="M35 18l-6 28" {...stroke} strokeWidth="2.2" />
  </Badge>
);

export const MobileAppDevIcon = ({ size = 56 }) => (
  <Badge id="mobile" gradFrom="#EC6BAA" gradTo="#B22E73" size={size}>
    <rect x="22" y="14" width="20" height="36" rx="4" {...stroke} />
    <path d="M22 40h20" {...stroke} strokeWidth="2" />
    <circle cx="32" cy="45" r="1.6" {...fillWhite} />
    <rect x="26" y="19" width="5" height="5" rx="1.2" {...fillWhite} opacity="0.9" />
    <rect x="33" y="19" width="5" height="5" rx="1.2" {...fillWhite} opacity="0.9" />
  </Badge>
);

export const ProductManagementIcon = ({ size = 56 }) => (
  <Badge id="pm" gradFrom="#2FB380" gradTo="#0E7A54" size={size}>
    <rect x="20" y="17" width="24" height="30" rx="3" {...stroke} />
    <rect x="26" y="14" width="12" height="6" rx="2" fill="#fff" />
    <path d="M25 28h14M25 34h14M25 40h9" {...stroke} strokeWidth="2.2" />
  </Badge>
);

export const UIUXDesignIcon = ({ size = 56 }) => (
  <Badge id="uiux" gradFrom="#B16CEA" gradTo="#7A2FCC" size={size}>
    <path d="M20 44l3-9 18-18 6 6-18 18-9 3z" {...stroke} />
    <path d="M32 20l6 6" {...stroke} strokeWidth="2.2" />
  </Badge>
);

/** Reference order (not used for matching — see getTrackIcon below). */
export const TRACKS = [
  { name: 'AI Automation', Icon: AIAutomationIcon },
  { name: 'Cybersecurity', Icon: CybersecurityIcon },
  { name: 'Data Analytics', Icon: DataAnalyticsIcon },
  { name: 'Full Stack Development (JavaScript)', Icon: FullStackDevIcon },
  { name: 'Mobile App Development', Icon: MobileAppDevIcon },
  { name: 'Product Management', Icon: ProductManagementIcon },
  { name: 'UI/UX Design', Icon: UIUXDesignIcon },
];

/**
 * Keyword rules for matching a track's name or slug (in any order/wording)
 * to the right icon. Checked in order — first match wins, so more specific
 * keywords are listed before generic ones.
 */
const RULES = [
  { test: /ai|artificial|automation|machine.?learning|\bml\b/, Icon: AIAutomationIcon },
  { test: /cyber|security|infosec|pentest/, Icon: CybersecurityIcon },
  { test: /data|analytic|\bbi\b|business.?intelligence/, Icon: DataAnalyticsIcon },
  { test: /mobile|android|ios|app.?dev/, Icon: MobileAppDevIcon },
  { test: /full.?stack|frontend|front.?end|backend|back.?end|web.?dev|javascript|\bjs\b|software.?dev/, Icon: FullStackDevIcon },
  { test: /product|\bpm\b|management/, Icon: ProductManagementIcon },
  { test: /ui|ux|design|graphic/, Icon: UIUXDesignIcon },
];

const FALLBACK_ICONS = TRACKS.map((t) => t.Icon);

/**
 * Look up the right icon for a track using its name or slug — order-independent.
 * Falls back to a stable rotation (by track id/slug) if nothing matches, so a
 * track never silently renders with no icon at all.
 */
export function getTrackIcon(track) {
  const raw = `${track?.slug || ''} ${track?.name || ''}`.toLowerCase();
  const rule = RULES.find((r) => r.test.test(raw));
  if (rule) return rule.Icon;

  // Fallback: stable hash of slug/name/id so the same track always gets the
  // same fallback icon across reloads, instead of a random one.
  const key = track?.slug || track?.name || String(track?.id ?? '');
  const hash = [...key].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_ICONS[hash % FALLBACK_ICONS.length];
}

export default TRACKS;