const INK = '#2A2620';
const CREAM = '#FFFDF8';

const ICON_PATHS = {
  feed: '<path d="M3 5.8h6.2a2 2 0 0 1 1.8 1.1v12.5a2.4 2.4 0 0 0-2.4-2.1H3z"/><path d="M21 5.8h-6.2a2 2 0 0 0-1.8 1.1v12.5a2.4 2.4 0 0 1 2.4-2.1H21z"/>',
  shelf: '<path d="M4 4.5h5v15H4zM10.5 4.5h5v15h-5z"/><path d="m18.2 5.6 3-.8 2.3 14.4-3 .6z"/>',
  words: '<path d="m4 20 .9-4.4L15.6 4.9a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L8.4 19.1z"/><path d="m14 7 3 3M12 21h8"/>',
  checkin: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  flame: '<path d="M12 3s4.8 4.1 4.8 9.1a4.8 4.8 0 0 1-9.6 0c0-2.7 1.6-4.5 1.6-4.5s.6 2.4 2.6 2.4c0-2.7.6-5 .6-7Z"/>',
  arrowLeft: '<path d="M15 5l-7 7 7 7"/>',
  arrowRight: '<path d="M9 5l7 7-7 7"/>',
  bookmark: '<path d="M6.5 4h11v16.5l-5.5-3.7-5.5 3.7z"/>',
  search: '<circle cx="11" cy="11" r="6.2"/><path d="m15.8 15.8 5 5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  trash: '<path d="M4 7h16M9.5 7V4h5v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
  quote: '<path d="M9.5 7.5H5.8A1.8 1.8 0 0 0 4 9.3v2.4a1.8 1.8 0 0 0 1.8 1.8h1.7c0 2.4-.9 3.8-2.7 4.8M20 7.5h-3.7a1.8 1.8 0 0 0-1.8 1.8v2.4a1.8 1.8 0 0 0 1.8 1.8h1.7c0 2.4-.9 3.8-2.7 4.8"/>',
  star: '<path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1L3.2 9.6l6.1-.9z"/>',
  speaker: '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 6.5a8 8 0 0 1 0 11"/>',
  linkOut: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 2"/>',
  bookOpen: '<path d="M12 6.3C10 4.7 7.7 4.2 4 4.2v14c3.7 0 6 .7 8 2.3 2-1.6 4.3-2.3 8-2.3v-14c-3.7 0-6 .5-8 2.1Z"/><path d="M12 6.3v14.2"/>',
  flower: '<path d="M12 12c-4.5 0-5.5-5.5-2-7 2.6-1.1 3.8 2 2 3.6 1.8-1.6 4.6.2 4.6 2.7 0 2.6-2.9 3.9-4.6 2.4-1.7 1.5-4.6.2-4.6-2.4 0-2.5 2.8-4.3 4.6-2.7"/>',
};

export function icon(name, size = 20, className = '') {
  const path = ICON_PATHS[name] || ICON_PATHS.flower;
  return `<svg class="ic ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export function bunnyHead(className = '') {
  return `<svg class="bunny-head ${className}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M42 48C34 30 32 12 40 8c9-4 12 16 14 36" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M66 44c2-20 5-40 14-36 8 4 6 22-2 40" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M45 40c-3-13-3-24 1-27 4-2 6 11 7 22" stroke="#F4C9C5" stroke-width="3" stroke-linecap="round"/>
    <path d="M71 34c1-11 3-21 7-21 4 1 3 12 1 22" stroke="#F4C9C5" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="60" cy="72" rx="33" ry="31" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="49" cy="69" r="3" fill="${INK}"/>
    <circle cx="71" cy="69" r="3" fill="${INK}"/>
    <path d="M55 80l5 5M65 80l-5 5" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="37" cy="78" r="5" fill="#F4C9C5" opacity=".85"/>
    <circle cx="83" cy="78" r="5" fill="#F4C9C5" opacity=".85"/>
  </svg>`;
}

export function bunnyReading(className = '') {
  return `<svg class="bunny-reading ${className}" viewBox="0 0 360 330" fill="none" aria-hidden="true">
    <ellipse cx="180" cy="306" rx="112" ry="14" fill="${INK}" opacity=".08"/>
    <g opacity=".65">
      <path d="M40 248c8-3 15 2 13 9-7 2-13-1-13-9Z" fill="#C9DFB0" stroke="${INK}" stroke-width="2"/>
      <path d="M44 257c-1 7 0 11 2 16" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <path d="M306 94l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFFDF8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M322 210l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#FFFDF8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="58" cy="84" r="5" fill="#F08A2E" stroke="${INK}" stroke-width="2"/>
      <circle cx="322" cy="160" r="4" fill="#F4C9C5" stroke="${INK}" stroke-width="2"/>
    </g>
    <path d="M152 66C138 40 130 12 142 6c12-6 22 22 28 54" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M190 60c6-32 16-60 28-54 12 6 4 34-10 60" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M155 52c-7-22-11-37-5-40 6-2 12 16 16 36" stroke="#F4C9C5" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M197 48c4-20 10-37 16-35 6 2 1 18-5 38" stroke="#F4C9C5" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M148 152c-10 23-22 80-18 100 20 10 80 10 100 0 4-20-8-77-18-100Z" fill="#B7DCEB" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M166 160v22M194 160v22" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <path d="M180 186v30" stroke="${INK}" stroke-width="2.4" stroke-dasharray="3 5" opacity=".5"/>
    <path d="M146 155c-4 15-11 32-17 44" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>
    <path d="M214 155c4 15 11 32 17 44" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="128" cy="278" rx="30" ry="15" fill="#fff" stroke="${INK}" stroke-width="4.2"/>
    <ellipse cx="232" cy="278" rx="30" ry="15" fill="#fff" stroke="${INK}" stroke-width="4.2"/>
    <path d="M116 282c4 3 9 4 14 3M220 282c4 3 9 4 14 3" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".45"/>
    <path d="M78 236 180 251v48L78 286Z" fill="#F08A2E" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M282 236 180 251v48l102-13Z" fill="#DE7B1F" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M88 232 180 245v46L88 280Z" fill="${CREAM}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M272 232 180 245v46l92-11Z" fill="${CREAM}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M180 245v46" stroke="${INK}" stroke-width="3.4"/>
    <g stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".28" stroke-dasharray="4 6">
      <path d="M104 248l54 7M104 260l54 7M104 272l40 5"/>
      <path d="M203 255l53-7M203 267l53-7M203 279l39-5"/>
    </g>
    <path d="M226 236l-1-24 12 3 2 22" fill="#D8593F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M150 190c-22 10-38 24-44 42" stroke="${INK}" stroke-width="19" stroke-linecap="round"/>
    <path d="M150 190c-22 10-38 24-44 42" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <path d="M210 190c22 10 38 24 44 42" stroke="${INK}" stroke-width="19" stroke-linecap="round"/>
    <path d="M210 190c22 10 38 24 44 42" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <circle cx="106" cy="233" r="11" fill="#fff" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="254" cy="233" r="11" fill="#fff" stroke="${INK}" stroke-width="3.6"/>
    <ellipse cx="180" cy="110" rx="54" ry="48" fill="#fff" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="162" cy="106" r="3.6" fill="${INK}"/>
    <circle cx="198" cy="106" r="3.6" fill="${INK}"/>
    <path d="M174 119l6 6M186 119l-6 6" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
    <circle cx="145" cy="118" r="7" fill="#F4C9C5" opacity=".9"/>
    <circle cx="215" cy="118" r="7" fill="#F4C9C5" opacity=".9"/>
    <path d="M70 60c8-2 13 3 11 9-7 1-12-2-11-9Z" fill="#C9DFB0" stroke="${INK}" stroke-width="2"/>
  </svg>`;
}

export function bunnyThumbs(className = '') {
  return `<svg class="bunny-thumbs ${className}" viewBox="0 0 300 330" fill="none" aria-hidden="true">
    <ellipse cx="150" cy="307" rx="88" ry="12" fill="${INK}" opacity=".09"/>
    <g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".5">
      <path d="M252 68l8-6M258 82l10-2M250 96l9 3"/>
    </g>
    <path d="M122 66C110 38 104 12 116 6c12-6 20 22 26 56" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M158 62c6-34 14-62 26-56 12 6 4 32-8 58" fill="#fff" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M125 52c-6-22-10-37-4-40 6-2 11 16 15 36" stroke="#F4C9C5" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M164 50c3-20 8-37 14-35 6 2 1 18-4 38" stroke="#F4C9C5" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M120 142c-8 24-16 82-12 102 20 10 64 10 84 0 4-20-4-78-12-102Z" fill="#F08A2E" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="M138 150v20M162 150v20" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" opacity=".45"/>
    <path d="M150 176v28" stroke="${INK}" stroke-width="2.2" stroke-dasharray="3 5" opacity=".45"/>
    <ellipse cx="118" cy="272" rx="27" ry="14" fill="#fff" stroke="${INK}" stroke-width="4.2"/>
    <ellipse cx="182" cy="272" rx="27" ry="14" fill="#fff" stroke="${INK}" stroke-width="4.2"/>
    <path d="M106 276c4 3 9 4 13 3M170 276c4 3 9 4 13 3" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".4"/>
    <path d="M124 166c-14 15-22 32-22 48" stroke="${INK}" stroke-width="19" stroke-linecap="round"/>
    <path d="M124 166c-14 15-22 32-22 48" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <circle cx="102" cy="218" r="10" fill="#fff" stroke="${INK}" stroke-width="3.4"/>
    <path d="M176 160c20-12 32-30 38-48" stroke="${INK}" stroke-width="19" stroke-linecap="round"/>
    <path d="M176 160c20-12 32-30 38-48" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
    <g>
      <circle cx="222" cy="100" r="19" fill="#fff" stroke="${INK}" stroke-width="4"/>
      <path d="M214 88c-3-11 3-19 11-19 9 0 13 8 10 19l-2 9" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M214 96c4-3 9-3 13 0M215 105c5-3 10-3 14 0" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <path d="M216 88h17" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".4"/>
    </g>
    <ellipse cx="150" cy="100" rx="50" ry="46" fill="#fff" stroke="${INK}" stroke-width="4.5"/>
    <circle cx="133" cy="96" r="3.5" fill="${INK}"/>
    <circle cx="167" cy="96" r="3.5" fill="${INK}"/>
    <path d="M138 111c7 8 17 8 24 0" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="117" cy="108" r="6.5" fill="#F4C9C5" opacity=".9"/>
    <circle cx="183" cy="108" r="6.5" fill="#F4C9C5" opacity=".9"/>
    <path d="M48 118l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#F8E3A8" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M62 246c8-3 14 2 12 9-7 1-12-2-12-9Z" fill="#C9DFB0" stroke="${INK}" stroke-width="2"/>
    <path d="M64 255c-1 6 0 10 2 14" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

export function bunnyShelf(className = '') {
  return `<svg class="bunny-shelf ${className}" viewBox="0 0 340 260" fill="none" aria-hidden="true">
    <path d="M42 230h256" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 8" opacity=".45"/>
    <g>
      <rect x="54" y="196" width="128" height="27" rx="5" fill="#F4C9C5" stroke="${INK}" stroke-width="3.5"/>
      <path d="M64 203v13M74 203v13" stroke="${INK}" stroke-width="2" opacity=".4"/>
      <rect x="66" y="169" width="116" height="27" rx="5" fill="#C9DFB0" stroke="${INK}" stroke-width="3.5"/>
      <path d="M76 176v13M86 176v13" stroke="${INK}" stroke-width="2" opacity=".4"/>
      <rect x="58" y="142" width="124" height="27" rx="5" fill="#B7DCEB" stroke="${INK}" stroke-width="3.5"/>
      <path d="M68 149v13M78 149v13" stroke="${INK}" stroke-width="2" opacity=".4"/>
      <path d="M176 142v27" stroke="${INK}" stroke-width="3"/>
    </g>
    <path d="M228 64C218 40 214 18 224 13c10-5 17 19 21 47" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M258 60c5-28 11-50 21-45 10 5 3 27-6 47" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="244" cy="105" rx="43" ry="40" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <circle cx="230" cy="101" r="3" fill="${INK}"/>
    <circle cx="258" cy="101" r="3" fill="${INK}"/>
    <path d="M238 113l6 6M250 113l-6 6" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="215" cy="112" r="5.5" fill="#F4C9C5" opacity=".85"/>
    <circle cx="273" cy="112" r="5.5" fill="#F4C9C5" opacity=".85"/>
    <path d="M216 143c-12 22-20 48-18 60h92c2-12-8-38-20-60Z" fill="#F8E3A8" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M210 188c15 6 53 6 68 0" stroke="${INK}" stroke-width="2.2" stroke-dasharray="4 5" opacity=".5"/>
    <path d="M204 160c-22 1-42 6-54 13" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="M204 160c-22 1-42 6-54 13" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <path d="M284 160c18-8 30-20 36-34" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="M284 160c18-8 30-20 36-34" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <g transform="translate(132 214)">
      <circle cx="16" cy="18" r="20" fill="#fff" stroke="${INK}" stroke-width="3.4"/>
      <path d="M8 4C5-6 7-14 13-14s8 8 5 18" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <path d="M24 4c3-10 6-18 12-17 6 2 3 10 0 17" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <circle cx="10" cy="18" r="2.2" fill="${INK}"/><circle cx="22" cy="18" r="2.2" fill="${INK}"/>
      <path d="M13 24l3 3M19 24l-3 3" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <path d="M304 108l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" stroke="${INK}" stroke-width="2"/>
    <path d="M50 90c8-3 14 2 12 9-7 2-12-1-12-9Z" fill="#C9DFB0" stroke="${INK}" stroke-width="2"/>
    <path d="M54 100c-1 6 0 10 2 14" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

export function flowerSvg(color = '#F08A2E', className = '') {
  return `<svg class="deco-flower ${className}" viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <g stroke="${INK}" stroke-width="2.4">
      <circle cx="28" cy="14" r="9" fill="${color}"/>
      <circle cx="42" cy="24" r="9" fill="${color}"/>
      <circle cx="37" cy="40" r="9" fill="${color}"/>
      <circle cx="19" cy="40" r="9" fill="${color}"/>
      <circle cx="14" cy="24" r="9" fill="${color}"/>
      <circle cx="28" cy="28" r="7.5" fill="#F8E3A8"/>
    </g>
  </svg>`;
}

export function sparkleSvg(color = '#2A2620', className = '') {
  return `<svg class="deco-sparkle ${className}" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2l3.2 10.8L30 16l-10.8 3.2L16 30l-3.2-10.8L2 16l10.8-3.2z" fill="${color}"/></svg>`;
}

const PALETTES = {
  pink: { bg: '#F4C9C5', soft: '#FBE5E2', pop: '#D96B63', dot: 'rgba(42,38,32,.16)' },
  yellow: { bg: '#F7DFA2', soft: '#FBF0CF', pop: '#D6A036', dot: 'rgba(42,38,32,.15)' },
  green: { bg: '#C9DFB0', soft: '#EBF3E0', pop: '#7C9E56', dot: 'rgba(42,38,32,.15)' },
  blue: { bg: '#B7DCEB', soft: '#E3F1F6', pop: '#5F95B3', dot: 'rgba(42,38,32,.15)' },
  lilac: { bg: '#D8CCEA', soft: '#F0EAF7', pop: '#8B73B6', dot: 'rgba(42,38,32,.15)' },
  orange: { bg: '#F6C89B', soft: '#FBE7D2', pop: '#DC8935', dot: 'rgba(42,38,32,.15)' },
};

function miniBunny(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" aria-hidden="true">
    <path d="M-16 -12C-20-25-20-33-14-34c6-2 8 9 9 21" fill="#fff" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M2 -13c1-13 3-22 9-21 6 1 4 10 1 22" fill="#fff" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>
    <ellipse cx="0" cy="8" rx="23" ry="21" fill="#fff" stroke="${INK}" stroke-width="3.6"/>
    <circle cx="-8" cy="6" r="2.2" fill="${INK}"/><circle cx="8" cy="6" r="2.2" fill="${INK}"/>
    <path d="M-4 13l4 4M4 13l-4 4" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-16" cy="13" r="3.4" fill="#F4C9C5"/><circle cx="16" cy="13" r="3.4" fill="#F4C9C5"/>
  </g>`;
}

function coverMotif(theme, p) {
  const stroke = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
  switch (theme) {
    case 'books':
      return `<g transform="translate(88 92)">
        <rect x="0" y="62" width="156" height="30" rx="7" fill="${p.soft}" ${stroke}/>
        <rect x="14" y="32" width="132" height="30" rx="7" fill="${p.pop}" ${stroke}/>
        <rect x="4" y="2" width="148" height="30" rx="7" fill="${CREAM}" ${stroke}/>
        <path d="M24 12v10M34 12v10M18 72v10M28 72v10" stroke="${INK}" stroke-width="2.4" opacity=".45"/>
        <path d="M112 2v18" stroke="${INK}" stroke-width="3"/>
        <path d="M118 84l6-14 6 14z" fill="${p.bg}" ${stroke}/>
        <path d="M124 65v-9" ${stroke}/>
      </g>`;
    case 'leaf':
      return `<circle cx="300" cy="62" r="30" fill="${p.soft}" ${stroke}/>
        <path d="M104 192c-8-58 36-102 110-112-4 64-40 106-110 112Z" fill="${CREAM}" ${stroke}/>
        <path d="M108 188c24-42 54-70 96-96" ${stroke} stroke-width="3" opacity=".5"/>
        <path d="M170 200c34-2 66-20 86-48-44-4-74 12-86 48Z" fill="${p.pop}" ${stroke}/>
        <path d="M242 165c-20-10-42-6-58 6" stroke="${INK}" stroke-width="3" opacity=".45"/>
        <path d="M96 204c-14 10-32 14-48 10" ${stroke} stroke-width="3" opacity=".5"/>`;
    case 'cup':
      return `<ellipse cx="168" cy="196" rx="92" ry="12" fill="${p.pop}" opacity=".35"/>
        <path d="M96 112h126v54c0 20-28 32-63 32s-63-12-63-32z" fill="${CREAM}" ${stroke}/>
        <path d="M222 124c32-8 38 40 6 38" fill="none" ${stroke}/>
        <path d="M132 86c-10-9 10-16 0-26M160 86c-10-9 10-16 0-26M188 86c-10-9 10-16 0-26" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
        <path d="M120 126h78" stroke="${INK}" stroke-width="3" stroke-dasharray="5 6" opacity=".35"/>`;
    case 'bulb':
      return `<g transform="translate(168 118)">
        <circle cx="0" cy="-10" r="54" fill="${p.soft}" ${stroke}/>
        <path d="M-22 38h44v18c0 8-8 14-22 14S-22 64-22 56z" fill="${CREAM}" ${stroke}/>
        <path d="M-14 70h28M-10 82h20" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-16 10c2-14 12-22 24-24M-4 20" stroke="${INK}" stroke-width="3" opacity=".5" fill="none"/>
        <path d="M-74 -58l-12-12M-84 4h-16M-72 58l-12 12M64 -58l12-12M76 4h16M62 58l12 12" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".45"/>
        <circle cx="0" cy="-10" r="7" fill="${p.pop}"/>
      </g>`;
    case 'orbit':
      return `<g transform="translate(162 118)">
        <circle cx="0" cy="0" r="54" fill="${CREAM}" ${stroke}/>
        <path d="M-26-12c14-8 32-6 44 4M-18 24c10 8 26 10 38 2" stroke="${p.pop}" stroke-width="8" stroke-linecap="round" opacity=".5"/>
        <ellipse cx="0" cy="8" rx="94" ry="26" fill="none" ${stroke} transform="rotate(-14)"/>
        <circle cx="78" cy="-30" r="6" fill="${p.pop}" ${stroke}/>
        <path d="M-84 -82l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="${CREAM}" ${stroke} stroke-width="3"/>
        <circle cx="60" cy="-100" r="4" fill="${INK}"/>
      </g>`;
    case 'star':
      return `<circle cx="264" cy="92" r="44" fill="${p.soft}" ${stroke}/>
        <path d="M264 48a44 44 0 1 0 0 88 34 34 0 1 1 0-88Z" fill="${p.bg}" ${stroke}/>
        <path d="M136 44l9 29 29 9-29 9-9 29-9-29-29-9 29-9z" fill="${CREAM}" ${stroke}/>
        <path d="M84 176l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="${CREAM}" ${stroke} stroke-width="3"/>
        <circle cx="206" cy="66" r="4" fill="${INK}"/><circle cx="70" cy="94" r="3" fill="${INK}"/>
        <circle cx="240" cy="190" r="5" fill="${p.pop}" ${stroke}/>`;
    case 'flower':
      return `<g transform="translate(170 116)">
        <g ${stroke}>
          <circle cx="0" cy="-52" r="26" fill="${p.pop}"/>
          <circle cx="49" cy="-16" r="26" fill="${p.soft}"/>
          <circle cx="30" cy="42" r="26" fill="${p.pop}"/>
          <circle cx="-30" cy="42" r="26" fill="${p.soft}"/>
          <circle cx="-49" cy="-16" r="26" fill="${p.pop}"/>
          <circle cx="0" cy="0" r="25" fill="#F8E3A8"/>
        </g>
        <path d="M0 92v48" ${stroke}/>
        <path d="M0 122c-28 0-42-16-44-34 24-2 40 10 44 34Z" fill="${p.soft}" ${stroke}/>
        <path d="M0 136c24 0 36-14 38-30-20-2-34 8-38 30Z" fill="${p.pop}" ${stroke}/>
      </g>`;
    case 'wave':
      return `<circle cx="290" cy="66" r="28" fill="${p.soft}" ${stroke}/>
        <path d="M0 154c44-26 82-26 126 0s82 26 126 0 82-26 126 0v86H0z" fill="${p.soft}" ${stroke}/>
        <path d="M0 182c44-26 82-26 126 0s82 26 126 0 82-26 126 0v58H0z" fill="${CREAM}" ${stroke}/>
        <path d="M0 208c44-20 82-20 126 0s82 20 126 0 82-20 126 0v32H0z" fill="${p.pop}" opacity=".55" ${stroke}/>
        <path d="M92 86c12-12 26-12 38 0M188 62c10-10 22-10 32 0" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".5" fill="none"/>`;
    case 'pencil':
      return `<g transform="rotate(-18 170 120)">
        <rect x="60" y="88" width="206" height="50" rx="10" fill="${p.soft}" ${stroke}/>
        <path d="M266 88l34 25-34 25z" fill="${CREAM}" ${stroke}/>
        <path d="M288 106l12 7-12 7z" fill="${INK}" ${stroke}/>
        <path d="M60 88h28v50H60z" fill="${p.pop}" ${stroke}/>
        <path d="M98 100h128M98 114h104" stroke="${INK}" stroke-width="3" stroke-dasharray="5 6" opacity=".35"/>
      </g>
      <path d="M78 190c40 16 130 16 188-2" stroke="${INK}" stroke-width="2.4" stroke-dasharray="6 8" opacity=".35"/>
      <path d="M296 50l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="${CREAM}" ${stroke} stroke-width="3"/>`;
    default:
      return '';
  }
}

export function coverArt(article) {
  const p = PALETTES[article.accent] || PALETTES.yellow;
  const safeId = String(article.id || 'cover').replace(/[^a-zA-Z0-9_-]/g, '');
  return `<svg class="cover-svg" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${escapeHtml(article.title || '文章封面')}">
    <defs>
      <pattern id="dots-${safeId}" width="19" height="19" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="1.7" fill="${p.dot}"/>
      </pattern>
    </defs>
    <rect width="420" height="240" fill="${p.bg}"/>
    <rect width="420" height="240" fill="url(#dots-${safeId})"/>
    <circle cx="166" cy="120" r="92" fill="none" stroke="${INK}" stroke-opacity=".14" stroke-width="2.5" stroke-dasharray="5 9"/>
    ${coverMotif(article.cover, p)}
    <g opacity=".55">
      <path d="M64 42l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>
      <circle cx="360" cy="52" r="4" fill="${CREAM}" stroke="${INK}" stroke-width="2"/>
    </g>
    ${miniBunny(338, 212, 0.78)}
  </svg>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---------- reading garden (weekly reading time) ---------- */

const ROSE_STEM = ['#7C9E56', '#6E8F4B'];
const ROSE_BLOOM_OUTER = ['#D96B63', '#C65B52', '#E07A6F'];
const ROSE_BLOOM_INNER = ['#F4C9C5', '#F7D7D3', '#F4C9C5'];
const ROSE_LEAF = ['#A8C686', '#9AB878', '#8FB276'];

/**
 * 一朵简笔玫瑰：外圈花瓣 + 内圈花瓣 + 花心。
 * cx/cy 为花心坐标，scale 控制大小。
 */
function roseBlossom(cx, cy, scale = 1) {
  const petals = [];
  for (let i = 0; i < 5; i += 1) {
    const ang = i * 72;
    const rad = (ang * Math.PI) / 180;
    const px = cx + Math.cos(rad) * 3.6 * scale;
    const py = cy + Math.sin(rad) * 3.2 * scale;
    petals.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${3.1 * scale}" ry="${2.5 * scale}" fill="${ROSE_BLOOM_OUTER[i % ROSE_BLOOM_OUTER.length]}" stroke="${INK}" stroke-width="1.1" transform="rotate(${ang + 22} ${px.toFixed(1)} ${py.toFixed(1)})"/>`);
  }
  for (let i = 0; i < 4; i += 1) {
    const ang = i * 90 + 40;
    const rad = (ang * Math.PI) / 180;
    const px = cx + Math.cos(rad) * 1.9 * scale;
    const py = cy + Math.sin(rad) * 1.7 * scale;
    petals.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${1.9 * scale}" ry="${1.5 * scale}" fill="${ROSE_BLOOM_INNER[i % ROSE_BLOOM_INNER.length]}" stroke="${INK}" stroke-width="0.9" transform="rotate(${ang} ${px.toFixed(1)} ${py.toFixed(1)})"/>`);
  }
  petals.push(`<circle cx="${cx}" cy="${cy}" r="${1.5 * scale}" fill="#F8E3A8" stroke="${INK}" stroke-width="0.9"/>`);
  return petals.join('');
}

/**
 * 一棵「阅读时长花草」：泥土 + 草丛 + 花茎 + 叶子 + 玫瑰。
 * seconds 越多，茎越高、草越密、玫瑰越繁茂。
 * 分级：0 秒 → 空土；<5min → 嫩芽；<10min → 小苗；
 *       <15min → 茎叶玫瑰初开；≥15min → 大玫瑰加繁茂草丛。
 */
export function rosePlant(seconds = 0, className = '') {
  const secs = Math.max(0, Math.round(Number(seconds) || 0));
  const level = secs <= 0 ? 0 : secs < 300 ? 1 : secs < 600 ? 2 : secs < 900 ? 3 : 4;
  const stemH = [0, 20, 36, 52, 66][level];
  const topY = 94 - stemH;
  const grass = [2, 4, 5, 6, 8][level];
  const parts = [];

  // 泥土
  parts.push(`<ellipse cx="30" cy="95" rx="23" ry="4.5" fill="#EAD9B5" stroke="${INK}" stroke-width="1.8"/>`);

  // 草丛（底部）
  for (let i = 0; i < grass; i += 1) {
    const x = 8 + i * (44 / Math.max(1, grass - 1));
    const h = 7 + (i % 3) * 3;
    const sway = i % 2 ? -4 : 4;
    parts.push(`<path d="M${x} 95 q${sway} -${h} ${sway / 2} -${h + 5}" stroke="${ROSE_LEAF[i % ROSE_LEAF.length]}" stroke-width="2" stroke-linecap="round" fill="none"/>`);
  }

  // 花茎
  if (stemH > 0) {
    parts.push(`<path d="M30 ${topY + 2} v${stemH - 3}" stroke="${ROSE_STEM[0]}" stroke-width="3" stroke-linecap="round"/>`);
  }

  // 叶子（茎两侧，级别越高叶越多）
  if (level >= 2) {
    const leafY = [0.35, 0.62];
    leafY.forEach((ratio, i) => {
      const y = topY + stemH * ratio;
      const side = i % 2 === 0 ? -1 : 1;
      const reach = 7 + level * 1.4;
      parts.push(`<path d="M30 ${y} q${side * reach} ${-2 - i} ${side * (reach + 3)} ${-6 - i * 2}" stroke="${ROSE_LEAF[(i + 1) % ROSE_LEAF.length]}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`);
      parts.push(`<path d="M30 ${y} q${side * reach * -0.4} ${3 + i} ${side * (reach + 3) * -0.6} ${6 + i * 2}" stroke="${ROSE_LEAF[(i + 2) % ROSE_LEAF.length]}" stroke-width="2" stroke-linecap="round" fill="none"/>`);
    });
  }

  // 玫瑰（花苞 → 初开 → 盛开）
  if (level === 1) {
    parts.push(`<path d="M30 ${topY} c-2.6 -3.6 2.6 -5 0 -9" stroke="${ROSE_BLOOM_OUTER[0]}" stroke-width="2" fill="#F4C9C5"/>`);
  } else if (level === 2) {
    parts.push(roseBlossom(30, topY, 0.8));
  } else if (level >= 3) {
    parts.push(roseBlossom(30, topY, 1.05));
    if (level >= 4) {
      parts.push(roseBlossom(16, 82, 0.55));
      parts.push(roseBlossom(44, 84, 0.55));
    }
  }

  return `<svg class="garden-plant ${className}" viewBox="0 0 60 100" fill="none" aria-hidden="true">${parts.join('')}</svg>`;
}
