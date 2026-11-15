// Builds the profile's images (assets/*.svg) from data/profile.json. No dependencies.
//
//   node scripts/build.mjs             build from the stored figures
//   node scripts/build.mjs --refresh   read fresh figures with the GitHub CLI first, then build
//
// Everything is drawn here as plain SVG with system fonts, so nothing on the profile depends on
// a third-party service being up.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data', 'profile.json');
const assets = join(root, 'assets');

if (process.argv.includes('--refresh')) {
  const query = `query { viewer { createdAt followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) {
      totalCount nodes { name stargazerCount } }
    contributionsCollection { contributionCalendar { totalContributions } } } }`;
  const viewer = JSON.parse(
    execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8' }),
  ).data.viewer;
  const stars = Object.fromEntries(viewer.repositories.nodes.map((r) => [r.name, r.stargazerCount]));
  const fresh = {
    since: Number(viewer.createdAt.slice(0, 4)),
    publicRepos: viewer.repositories.totalCount,
    stars: Object.values(stars).reduce((sum, n) => sum + n, 0),
    followers: viewer.followers.totalCount,
    contributionsLastYear: viewer.contributionsCollection.contributionCalendar.totalContributions,
    repoStars: stars,
    readOn: new Date().toISOString().slice(0, 10),
  };
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(fresh, null, 2)}\n`);
}

const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const years = new Date().getFullYear() - data.since;

// ---------------------------------------------------------------------------------------------
// Design values
const C = {
  bg: '#0c0a09',
  panel: '#15110e',
  well: '#0e0b09',
  line: 'rgba(255,190,120,.16)',
  lineStrong: 'rgba(255,190,120,.30)',
  text: '#f7efe6',
  soft: '#d8cbbb',
  muted: '#a6998a',
  dim: '#8f8376',
  gold: '#ffcf6b',
  orange: '#ff8a1f',
  mint: '#7ee2a8',
  covert: '#eb4b4b',
  classified: '#d32ce6',
  restricted: '#8847ff',
  milspec: '#4b69ff',
};
const SANS = `ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`;

const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const defs = (extra = '') => `<defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8a1f"/><stop offset=".55" stop-color="#ffcf6b"/><stop offset="1" stop-color="#fff0c2"/>
    </linearGradient>
    <linearGradient id="goldFlat" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffcf6b"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#ffb347" stop-opacity=".34"/><stop offset=".6" stop-color="#ff8a1f" stop-opacity=".08"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/>
    </radialGradient>
    ${extra}
  </defs>`;

const svg = (width, height, label, body, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <style>
    .sans { font-family: ${SANS}; }
    .mono { font-family: ${MONO}; }
    ${style}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  ${body}
</svg>
`;

// ---------------------------------------------------------------------------------------------
// Hero: who, in one look, with an "inspect card" in the language of skin markets.
function hero() {
  const W = 880;
  const H = 360;
  const card = { x: 548, y: 36, w: 292, h: 288 };
  const cx = card.x + card.w / 2;
  const bar = { x: card.x + 18, y: card.y + 190, w: card.w - 36 };
  // Wear bands of a float bar: Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred.
  const bands = [
    [0, 0.07, '#4fd08b'],
    [0.07, 0.15, '#9bd65a'],
    [0.15, 0.38, '#f1c84b'],
    [0.38, 0.45, '#f08a3c'],
    [0.45, 1, '#e5484d'],
  ];
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i * 20 * Math.PI) / 180;
    const b = ((i * 20 + 7) * Math.PI) / 180;
    const r = 520;
    return `<path d="M0 0 L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} L${(Math.cos(b) * r).toFixed(1)} ${(Math.sin(b) * r).toFixed(1)} Z"/>`;
  }).join('');
  const stickers = [
    ['TS', C.milspec],
    ['GO', '#4fc3d9'],
    ['VUE', C.mint],
    ['PY', C.gold],
  ];

  const body = `${defs(`
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
    <clipPath id="well"><rect x="${card.x + 14}" y="${card.y + 58}" width="${card.w - 28}" height="104" rx="12"/></clipPath>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.bg}"/><stop offset=".62" stop-color="${C.bg}" stop-opacity=".86"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/>
    </linearGradient>`)}
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${C.bg}"/>
    <g transform="translate(${cx} ${H / 2})" fill="#ffb347" opacity=".07"><g class="rays">${rays}</g></g>
    <circle cx="${cx}" cy="${H / 2}" r="300" fill="url(#glow)"/>
    <rect width="620" height="${H}" fill="url(#fade)"/>

    <!-- who -->
    <circle cx="48" cy="62" r="4" fill="${C.mint}"><animate attributeName="opacity" values="1;.35;1" dur="2.4s" repeatCount="indefinite"/></circle>
    <text x="62" y="66" class="sans" font-size="11.5" font-weight="700" letter-spacing="1.7" fill="${C.muted}">TASHKENT, UZBEKISTAN  ·  FULL-STACK ENGINEER</text>
    <text x="42" y="138" class="sans" font-size="64" font-weight="800" letter-spacing="-2" fill="${C.text}">Shaxriyor</text>
    <text x="42" y="204" class="sans" font-size="64" font-weight="800" letter-spacing="-2" fill="url(#gold)">Ergashev</text>
    <text class="sans" font-size="16.5" fill="${C.soft}">
      <tspan x="44" y="246">Marketplaces, Telegram bots and the money logic behind</tspan>
      <tspan x="44" y="270">them. Most of it lives in the CS2 skin economy.</tspan>
    </text>
    <g transform="translate(44 296)">
      <rect width="282" height="34" rx="10" fill="${C.panel}" stroke="${C.line}"/>
      <text x="14" y="22" class="mono" font-size="13.5" fill="${C.muted}"><tspan fill="${C.gold}">$</tspan> eat() &amp;&amp; sleep() &amp;&amp; <tspan fill="${C.text}">code()</tspan></text>
      <rect class="caret" x="262" y="9" width="8" height="16" rx="1.5" fill="${C.gold}"/>
    </g>

    <!-- the inspect card -->
    <g>
      <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="18" fill="${C.panel}" stroke="${C.lineStrong}"/>
      <text x="${card.x + 18}" y="${card.y + 30}" class="sans" font-size="15" font-weight="800" fill="${C.text}">★ sherryuser</text>
      <text x="${card.x + 18}" y="${card.y + 47}" class="sans" font-size="11.5" fill="${C.muted}">Full-Stack  |  Factory New</text>
      <g transform="translate(${card.x + card.w - 78} ${card.y + 16})">
        <rect width="60" height="20" rx="10" fill="rgba(235,75,75,.12)" stroke="rgba(235,75,75,.55)"/>
        <text x="30" y="14" text-anchor="middle" class="sans" font-size="10.5" font-weight="700" fill="#ff8f8f">Covert</text>
      </g>

      <rect x="${card.x + 14}" y="${card.y + 58}" width="${card.w - 28}" height="104" rx="12" fill="${C.well}"/>
      <g clip-path="url(#well)">
        <ellipse cx="${cx}" cy="${card.y + 112}" rx="120" ry="58" fill="url(#glow)"/>
        <text x="${cx}" y="${card.y + 131}" text-anchor="middle" class="mono" font-size="58" font-weight="700" fill="url(#gold)">&lt;/&gt;</text>
        <path d="M${card.x + card.w - 14} ${card.y + 58} h-30 l30 30 z" fill="${C.gold}"/>
        <rect class="shine" x="${card.x - 120}" y="${card.y + 40}" width="90" height="150" fill="url(#shine)" transform="skewX(-20)"/>
      </g>

      <text x="${bar.x}" y="${bar.y - 10}" class="sans" font-size="9.5" font-weight="700" letter-spacing="1.3" fill="${C.dim}">FLOAT</text>
      <text x="${bar.x + bar.w}" y="${bar.y - 10}" text-anchor="end" class="mono" font-size="11.5" fill="${C.text}">0.00070</text>
      ${bands
        .map(
          ([from, to, color]) =>
            `<rect x="${(bar.x + from * bar.w).toFixed(1)}" y="${bar.y}" width="${((to - from) * bar.w - 1.5).toFixed(1)}" height="4" rx="2" fill="${color}"/>`,
        )
        .join('\n      ')}
      <g class="marker"><rect x="${bar.x + 2}" y="${bar.y - 4}" width="3" height="12" rx="1.5" fill="#fff"/></g>

      <g class="sans" font-size="9.5" font-weight="700" letter-spacing="1.3" fill="${C.dim}">
        <text x="${bar.x}" y="${card.y + 222}">PATTERN</text>
        <text x="${bar.x + 92}" y="${card.y + 222}">CONTRIBUTIONS / YR</text>
      </g>
      <g class="mono" font-size="14" font-weight="700" fill="${C.text}">
        <text x="${bar.x}" y="${card.y + 240}">${data.since}</text>
        <text x="${bar.x + 92}" y="${card.y + 240}" fill="${C.gold}">${data.contributionsLastYear.toLocaleString('en-US')}</text>
      </g>
      ${stickers
        .map(([label, color], i) => {
          const x = card.x + 18 + i * 40;
          const y = card.y + 252;
          return `<g><rect x="${x}" y="${y}" width="34" height="24" rx="7" fill="${C.well}" stroke="${color}" stroke-opacity=".7"/><text x="${x + 17}" y="${y + 16}" text-anchor="middle" class="mono" font-size="10" font-weight="700" fill="${color}">${label}</text></g>`;
        })
        .join('\n      ')}
      <text x="${card.x + card.w - 18}" y="${card.y + 268}" text-anchor="end" class="sans" font-size="10" fill="${C.dim}">4 stickers applied</text>
    </g>
    <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="21.5" fill="none" stroke="${C.line}"/>
  </g>`;

  const style = `
    .rays { animation: spin 160s linear infinite; transform-origin: 0 0; }
    .caret { animation: blink 1.1s steps(1) infinite; }
    .shine { animation: sweep 5.5s ease-in-out infinite; }
    .marker { animation: settle 2.6s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes sweep { 0%, 55% { transform: skewX(-20deg) translateX(0); } 100% { transform: skewX(-20deg) translateX(520px); } }
    @keyframes settle { from { transform: translateX(${bar.w - 8}px); } to { transform: translateX(0); } }`;
  return svg(W, H, 'Shaxriyor Ergashev, full-stack engineer in Tashkent. Marketplaces, Telegram bots and the money logic behind them.', body, style);
}

// ---------------------------------------------------------------------------------------------
// Figures: four tiles, like the header of a case page, as two images of two tiles each: side by
// side on a desktop, stacked on a phone, readable on both.
const FIGURES = [
  ['YEARS ON GITHUB', String(years), C.text],
  ['PUBLIC REPOS', String(data.publicRepos), C.text],
  ['STARS', `★ ${data.stars}`, C.gold],
  ['CONTRIBUTIONS / YEAR', data.contributionsLastYear.toLocaleString('en-US'), C.mint],
];
function figures(half) {
  const W = 432;
  const H = 92;
  const tiles = FIGURES.slice(half * 2, half * 2 + 2);
  const w = W / tiles.length;
  const body = `${defs()}
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" fill="${C.panel}" stroke="${C.line}"/>
  ${tiles
    .map(
      ([label, value, color], i) => `<g transform="translate(${i * w} 0)">
    ${i > 0 ? `<rect x="0" y="18" width="1" height="${H - 36}" fill="${C.line}"/>` : ''}
    <text x="26" y="36" class="sans" font-size="10.5" font-weight="700" letter-spacing="1.4" fill="${C.dim}">${esc(label)}</text>
    <text x="26" y="68" class="mono" font-size="26" font-weight="700" fill="${color}">${esc(value)}</text>
  </g>`,
    )
    .join('\n  ')}`;
  return svg(W, H, tiles.map(([label, value]) => `${label}: ${value}`).join(', '), body);
}

// ---------------------------------------------------------------------------------------------
// Loadout: what I reach for, in four racks, as two images of two racks each.
function loadout(half) {
  const W = 432;
  const racks = [
    ['LANGUAGES', [['TypeScript', '#3178c6'], ['Go', '#4fc3d9'], ['Python', '#f1c84b'], ['JavaScript', '#f0db4f'], ['SQL', '#d8cbbb']]],
    ['FRONTEND', [['Next.js · React', '#f7efe6'], ['Nuxt · Vue', '#7ee2a8'], ['Svelte', '#ff6b3d'], ['Tailwind CSS', '#4fc3d9'], ['WebGL', '#eb4b4b']]],
    ['BACKEND', [['Node.js · Fastify', '#7ee2a8'], ['PostgreSQL', '#6aa5e8'], ['Redis', '#eb4b4b'], ['Telegram Bot API', '#4fc3d9'], ['Double-entry ledgers', '#ffcf6b']]],
    ['SHIPPING', [['Docker', '#4b9cff'], ['Kubernetes', '#6f8cff'], ['Argo CD', '#ff8a1f'], ['GitHub Actions', '#d8cbbb'], ['Playwright', '#7ee2a8']]],
  ].slice(half * 2, half * 2 + 2);
  const gap = 12;
  const w = (W - gap * (racks.length - 1)) / racks.length;
  const rowH = 34;
  const H = 54 + 5 * rowH + 14;
  const body = `${defs()}
  ${racks
    .map(
      ([title, items], i) => `<g transform="translate(${(i * (w + gap)).toFixed(1)} 0)">
    <rect x=".5" y=".5" width="${(w - 1).toFixed(1)}" height="${H - 1}" rx="15.5" fill="${C.panel}" stroke="${C.line}"/>
    <text x="18" y="32" class="sans" font-size="10.5" font-weight="700" letter-spacing="1.6" fill="${C.gold}">${title}</text>
    <rect x="18" y="42" width="${(w - 36).toFixed(1)}" height="1" fill="${C.line}"/>
    ${items
      .map(
        ([name, color], j) => `<g transform="translate(18 ${54 + j * rowH})">
      <rect x="0" y="0" width="${(w - 36).toFixed(1)}" height="${rowH - 8}" rx="8" fill="${C.well}"/>
      <circle cx="13" cy="${(rowH - 8) / 2}" r="4" fill="${color}"/>
      <text x="26" y="${(rowH - 8) / 2 + 4.5}" class="sans" font-size="13" font-weight="600" fill="${C.text}">${esc(name)}</text>
    </g>`,
      )
      .join('\n    ')}
  </g>`,
    )
    .join('\n  ')}`;
  return svg(W, H, `Loadout. ${racks.map(([t, items]) => `${t}: ${items.map(([n]) => n).join(', ')}`).join('. ')}.`, body);
}

// ---------------------------------------------------------------------------------------------
// Inventory: one card per project, drawn like an item card with a rarity corner.
const projects = [
  {
    file: 'cake-blow',
    name: 'cake-blow',
    lines: ['A birthday cake you blow out through', 'your microphone. Add candles, make a wish.'],
    tags: ['HTML', 'CSS', 'JS'],
    rarity: C.gold,
    kind: 'CONTRABAND',
  },
  {
    file: 'uzrail',
    name: 'UzRail Watch',
    lines: ['Telegram bot that pings you the second', 'train tickets appear on Uzbek Railways.'],
    tags: ['TypeScript', 'Svelte', 'Telegram'],
    rarity: C.covert,
    kind: 'COVERT',
  },
  {
    file: 'anon-qa',
    name: 'telegram-anon-qa-bot',
    lines: ['Anonymous Q&A sessions in Telegram:', 'one link, private questions, instant replies.'],
    tags: ['Python', 'Telegram'],
    rarity: C.classified,
    kind: 'CLASSIFIED',
  },
  {
    file: 'csmc-discord',
    name: 'csmarketcap-discord-bot',
    lines: ['Bilingual Discord bot for a CS2 trading', 'community: tickets and admin controls.'],
    tags: ['Python', 'Discord'],
    rarity: C.restricted,
    kind: 'RESTRICTED',
  },
  {
    file: 'games-manager',
    name: 'games-manager',
    lines: ['Drag-and-drop nested categories with', 'pagination and a real undo/redo stack.'],
    tags: ['Nuxt 3', 'Pinia', 'TypeScript'],
    rarity: C.milspec,
    kind: 'MIL-SPEC',
  },
  {
    file: 'site',
    name: 'shaxriyor.me',
    lines: ['My corner of the internet: writing,', 'projects and whatever I am building now.'],
    tags: ['Next.js', 'Tailwind'],
    rarity: C.mint,
    kind: 'SOUVENIR',
  },
];

function projectCard(project) {
  const W = 432;
  const H = 168;
  const stars = project.repo ? (data.repoStars?.[project.repo] ?? 0) : 0;
  let x = 22;
  const tags = project.tags
    .map((tag) => {
      const w = Math.round(tag.length * 6.6 + 18);
      const out = `<g transform="translate(${x} 124)"><rect width="${w}" height="22" rx="11" fill="${C.well}" stroke="${C.line}"/><text x="${w / 2}" y="15" text-anchor="middle" class="sans" font-size="11" font-weight="600" fill="${C.soft}">${esc(tag)}</text></g>`;
      x += w + 6;
      return out;
    })
    .join('');
  const body = `${defs(`<clipPath id="c"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <radialGradient id="tint" cx="1" cy="0" r="1"><stop offset="0" stop-color="${project.rarity}" stop-opacity=".20"/><stop offset=".7" stop-color="${project.rarity}" stop-opacity="0"/></radialGradient>`)}
  <g clip-path="url(#c)">
    <rect width="${W}" height="${H}" fill="${C.panel}"/>
    <rect width="${W}" height="${H}" fill="url(#tint)"/>
    <path d="M${W} 0 h-34 l34 34 z" fill="${project.rarity}"/>
    <rect x="0" y="${H - 3}" width="${W}" height="3" fill="${project.rarity}" opacity=".85"/>
    <text x="22" y="34" class="sans" font-size="9.5" font-weight="700" letter-spacing="1.5" fill="${project.rarity}">${project.kind}</text>
    <text x="22" y="62" class="sans" font-size="20" font-weight="800" letter-spacing="-.3" fill="${C.text}">${esc(project.name)}</text>
    <text class="sans" font-size="13.5" fill="${C.muted}">
      <tspan x="22" y="86">${esc(project.lines[0])}</tspan>
      <tspan x="22" y="105">${esc(project.lines[1])}</tspan>
    </text>
    ${tags}
    ${stars > 0 ? `<text x="${W - 22}" y="140" text-anchor="end" class="mono" font-size="13" font-weight="700" fill="${C.gold}">★ ${stars}</text>` : ''}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="${C.line}"/>`;
  return svg(W, H, `${project.name}: ${project.lines.join(' ')}`, body);
}

// ---------------------------------------------------------------------------------------------
// Links: one pill each.
const links = [
  ['site', 'shaxriyor.me', C.gold],
  ['telegram', 'Telegram', '#4fc3d9'],
  ['x', 'X / Twitter', C.text],
  ['linkedin', 'LinkedIn', '#6aa5e8'],
  ['instagram', 'Instagram', '#ff7aa8'],
  ['email', 'Email', C.mint],
];

function linkPill(label, color) {
  const W = Math.round(label.length * 7.6 + 62);
  const H = 38;
  const body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${(H - 1) / 2}" fill="${C.panel}" stroke="${C.lineStrong}"/>
  <circle cx="20" cy="${H / 2}" r="4.5" fill="${color}"/>
  <text x="34" y="${H / 2 + 4.5}" class="sans" font-size="13" font-weight="700" fill="${C.text}">${esc(label)}</text>
  <text x="${W - 16}" y="${H / 2 + 4.5}" text-anchor="end" class="sans" font-size="13" fill="${C.muted}">↗</text>`;
  return svg(W, H, label, body);
}

// ---------------------------------------------------------------------------------------------
mkdirSync(assets, { recursive: true });
const repoOf = { 'cake-blow': 'cake-blow', 'anon-qa': 'telegram-anon-qa-bot', 'csmc-discord': 'csmarketcap-discord-bot', 'games-manager': 'games-manager' };
const out = {
  'hero.svg': hero(),
  'figures-1.svg': figures(0),
  'figures-2.svg': figures(1),
  'loadout-1.svg': loadout(0),
  'loadout-2.svg': loadout(1),
  ...Object.fromEntries(
    projects.map((p) => [`project-${p.file}.svg`, projectCard({ ...p, repo: repoOf[p.file] })]),
  ),
  ...Object.fromEntries(links.map(([file, label, color]) => [`link-${file}.svg`, linkPill(label, color)])),
};
for (const [name, content] of Object.entries(out)) writeFileSync(join(assets, name), content);
console.log(`built ${Object.keys(out).length} images from figures read on ${data.readOn}`);
