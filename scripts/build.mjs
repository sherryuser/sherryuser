// Builds the profile's images (assets/*.svg) from data/profile.json. No packages needed.
//
//   node scripts/build.mjs             build from the stored figures
//   node scripts/build.mjs --refresh   read fresh figures with the GitHub CLI first, then build
//
// .github/workflows/refresh.yml runs the second form once a day and commits what changed.
//
// Every image is drawn here as plain SVG, once for GitHub's light theme and once for dark, and
// animated with CSS only. Nothing on the profile depends on a third-party service being up.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND, LIGHT, LINE, NAME } from './glyphs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'data', 'profile.json');
const assets = join(root, 'assets');

// Asked for by name, not as "whoever is logged in": in GitHub Actions that would be a bot.
const LOGIN = 'sherryuser';

if (process.argv.includes('--refresh')) {
  const query = `query($login: String!) { user(login: $login) { createdAt followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, isFork: false, first: 100) {
      totalCount nodes { name stargazerCount } }
    contributionsCollection { contributionCalendar { totalContributions
      weeks { firstDay contributionDays { contributionCount } } } } } }`;
  const viewer = JSON.parse(
    execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`, '-f', `login=${LOGIN}`], { encoding: 'utf8' }),
  ).data.user;
  const stars = Object.fromEntries(viewer.repositories.nodes.map((r) => [r.name, r.stargazerCount]));
  const calendar = viewer.contributionsCollection.contributionCalendar;
  const fresh = {
    joined: viewer.createdAt.slice(0, 10),
    publicRepos: viewer.repositories.totalCount,
    stars: Object.values(stars).reduce((sum, n) => sum + n, 0),
    followers: viewer.followers.totalCount,
    contributions: calendar.totalContributions,
    weeks: calendar.weeks.map((w) => ({
      start: w.firstDay,
      total: w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
    })),
    repoStars: stars,
  };
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, `${JSON.stringify(fresh, null, 2)}\n`);
}

// The stored figures carry no date of their own, so a day on which nothing changed rebuilds to
// exactly the same files and there is nothing to commit.
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const TODAY = new Date();

// ---------------------------------------------------------------------------------------------
// Design values. The neutrals are GitHub's own, so the cards sit in the page like part of it.
const THEMES = {
  light: {
    fg: '#1f2328', muted: '#59636e', faint: '#818b98', card: '#f6f8fa', well: '#ffffff',
    line: '#d1d9e0', accent: '#1a7f37', glow: '#2da44e', gold: '#bf8700',
  },
  dark: {
    fg: '#f0f6fc', muted: '#9198a1', faint: '#656c76', card: '#151b23', well: '#0d1117',
    line: '#3d444d', accent: '#3fb950', glow: '#3fb950', gold: '#e3b341',
  },
};
const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;
const TILE = 419; // two tiles and the space between them fill the 846px profile column
const INSET = 3; // each card sits this far inside its image, which makes the gutter

const n = (v) => Number(v.toFixed(2));
const esc = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = (w, h, label, style, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <style>
    .sans { font-family: ${SANS}; }
    .mono { font-family: ${MONO}; }
    .cap { font-family: ${MONO}; font-size: 10px; font-weight: 600; letter-spacing: 1.2px; }
    .pulse { animation: pulse 2.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    @keyframes pulse { 0% { transform: scale(1); opacity: .55; } 80%, 100% { transform: scale(3.2); opacity: 0; } }
    .draw { stroke-dasharray: 1; animation: draw 1s cubic-bezier(.6,0,.2,1) both; }
    @keyframes draw { 0% { stroke-dashoffset: 1; opacity: 0; } 12% { opacity: 1; } 100% { stroke-dashoffset: 0; } }${style}
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
${body}
</svg>
`;

const card = (T, h, w = TILE) =>
  `  <rect x="${INSET + 0.5}" y="${INSET + 0.5}" width="${w - INSET * 2 - 1}" height="${h - INSET * 2 - 1}" rx="12" fill="${T.card}" stroke="${T.line}"/>`;

// A stroked line icon. With `draw`, each stroke draws itself in, one after another.
function lineIcon(name, x, y, size, color, { draw = null, width = 2 } = {}) {
  const paths = LINE[name]
    .map((d, i) =>
      draw === null
        ? `<path d="${d}"/>`
        : `<path class="draw" pathLength="1" style="animation-delay:${n(draw + i * 0.12)}s" d="${d}"/>`,
    )
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${n(size / 24)})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
}

// A brand icon in its own colour, unless that colour would vanish into the card.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function brandColor(slug, T) {
  const [a, b] = [luminance(BRAND[slug].hex), luminance(T.card)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05) < 1.25 ? T.fg : BRAND[slug].hex;
}
const brandIcon = (slug, x, y, size, color) =>
  `<path transform="translate(${x} ${y}) scale(${n(size / 24)})" fill="${color}" d="${BRAND[slug].d}"/>`;

// A number whose digits roll into place like an odometer. Returns the markup and its width.
let odometers = 0;
function odometer(value, x, baseline, size, color, delay = 0) {
  const id = `od${++odometers}`;
  const chars = value.toLocaleString('en-US').split('');
  const step = size * 1.4;
  let cx = x;
  const cols = chars.map((ch, i) => {
    if (!/\d/.test(ch)) {
      const out = `<text x="${n(cx + size * 0.18)}" y="${baseline}" text-anchor="middle">${ch}</text>`;
      cx += size * 0.36;
      return out;
    }
    const strip = Array.from({ length: 10 }, (_, d) => `<text x="${n(cx + size * 0.31)}" y="${n(baseline + d * step)}" text-anchor="middle">${d}</text>`).join('');
    cx += size * 0.62;
    return `<g class="roll r${ch}" style="--to:${n(-ch * step)}px;animation-delay:${n(delay + i * 0.09)}s">${strip}</g>`;
  });
  return {
    width: cx - x,
    body: `<clipPath id="${id}"><rect x="${x - 2}" y="${n(baseline - size * 0.9)}" width="${n(cx - x + 4)}" height="${n(size * 1.16)}"/></clipPath>
  <g clip-path="url(#${id})" class="mono" font-size="${size}" font-weight="700" fill="${color}">${cols.join('')}</g>`,
  };
}
const ODOMETER_CSS = `
    .roll { transform: translateY(var(--to)); animation: roll 1.5s cubic-bezier(.16,1,.3,1) both; }
    @keyframes roll { from { transform: translateY(0); } }`;

// Rough width of a line of text in the system sans, for laying chips out.
function sansWidth(text, size, bold = false) {
  let em = 0;
  for (const ch of text) {
    if ('iljtfr.,:;|!\' '.includes(ch)) em += 0.3;
    else if ('mwMW'.includes(ch)) em += 0.86;
    else if (ch >= 'A' && ch <= 'Z') em += 0.68;
    else em += 0.56;
  }
  return em * size * (bold ? 1.05 : 1);
}

// ---------------------------------------------------------------------------------------------
// Hero: the name, and under it a line that types itself, wipes, and types the next one.
const TAGLINES = ['builds marketplaces.', 'writes Telegram bots.', 'keeps ledgers honest.', 'ships from Tashkent.'];

function hero(T) {
  const W = 880;
  const top = 4;
  const baseline = top + NAME.ascent;
  const size = 40;
  const lineY = Math.round(baseline + NAME.descent + 58);
  const H = lineY + 30;
  const scale = size / 100;
  const slot = 4.4; // seconds each line owns
  const total = slot * TAGLINES.length;
  const tick = 0.05; // seconds per typed character
  const hold = 3.3; // when a line starts to leave, counted from its first character
  const pct = (seconds) => Number(((seconds / total) * 100).toFixed(4));

  const used = new Set();
  const lines = TAGLINES.map((text, li) => {
    let x = 0;
    const start = 0.6 + li * slot;
    const glyphs = [];
    const carets = [];
    [...text].forEach((ch, i) => {
      const glyph = LIGHT[ch];
      const delay = n(start + i * tick);
      if (glyph.d) {
        used.add(ch);
        glyphs.push(`<use class="g" style="animation-delay:${delay}s" href="#c${ch.charCodeAt(0)}" x="${n(x / scale)}"/>`);
      }
      x += (glyph.adv - 1) * scale;
      // The caret sits after the character just typed; after the last one it rests and blinks.
      carets.push(`<rect class="${i === text.length - 1 ? 'rest' : 'blip'}" style="animation-delay:${delay}s" x="${n(x + 3)}" y="${lineY - 31}" width="3" height="37" rx="1.5" fill="${T.accent}"/>`);
    });
    return `<g class="line l${li}" style="animation-delay:${n(start)}s"><g transform="translate(0 ${lineY}) scale(${scale})" fill="${T.muted}">${glyphs.join('')}</g>${carets.join('')}</g>`;
  });
  const defs = [...used].map((ch) => `<path id="c${ch.charCodeAt(0)}" d="${LIGHT[ch].d}"/>`).join('');

  const style = `
    .n { animation: rise .9s cubic-bezier(.16,1,.3,1) both; }
    .n2 { animation-delay: .12s; }
    @keyframes rise { from { opacity: 0; transform: translateY(14px); } }
    .line { animation: leave ${total}s linear infinite; }
    @keyframes leave { 0%, ${pct(hold)}% { opacity: 1; transform: none; } ${pct(hold + 0.35)}%, 100% { opacity: 0; transform: translateY(-8px); } }
    .g { opacity: 0; animation: type ${total}s steps(1) infinite; }
    @keyframes type { 0% { opacity: 1; } 60% { opacity: 0; } 100% { opacity: 0; } }
    .blip { opacity: 0; animation: blip ${total}s steps(1) infinite; }
    @keyframes blip { 0% { opacity: 1; } ${pct(tick * 1.12)}%, 100% { opacity: 0; } }
    .rest { opacity: 0; animation: rest ${total}s steps(1) infinite; }
    @keyframes rest { 0%, ${pct(1.0)}%, ${pct(2.0)}% { opacity: 1; } ${pct(0.5)}%, ${pct(1.5)}%, ${pct(2.5)}%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .g { opacity: 1; } .l1, .l2, .l3, .blip, .rest { display: none; } }`;

  const body = `  <defs>${defs}</defs>
  <!-- The name, set in Inter Tight (SIL Open Font License) and outlined so it looks the same everywhere. -->
  <g class="n"><path fill="${T.fg}" transform="translate(0 ${n(baseline)})" d="${NAME.first}"/></g>
  <g class="n n2"><path fill="${T.fg}" transform="translate(0 ${n(baseline)})" d="${NAME.last}"/></g>
  ${lines.join('\n  ')}
  <circle class="pulse" cx="${W - 9}" cy="${lineY - 13}" r="5" fill="${T.glow}"/>
  <circle cx="${W - 9}" cy="${lineY - 13}" r="5" fill="${T.glow}"/>
  <text x="${W - 26}" y="${lineY - 7}" text-anchor="end" class="mono" font-size="17" fill="${T.muted}">Full-stack engineer, Tashkent</text>`;
  return svg(W, H, `Shaxriyor Ergashev ${TAGLINES.join(' ')} Full-stack engineer, Tashkent.`, style, body);
}

// ---------------------------------------------------------------------------------------------
// The loop from my bio, running: eat(), sleep(), code(), each lit in turn.
function loop(T) {
  const H = 196;
  const steps = [['utensils', 'eat()'], ['moon', 'sleep()'], ['code-xml', 'code()']];
  const colW = (TILE - 40) / 3;
  const turn = 3; // seconds per step
  const total = turn * steps.length;
  const joined = new Date(data.joined);
  const now = TODAY;
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + now.getMonth() - joined.getMonth() - (now.getDate() < joined.getDate() ? 1 : 0);
  const uptime = `${Math.floor(months / 12)}y ${months % 12}m`;

  const cols = steps.map(([icon, label], i) => {
    const cx = 20 + colW * i + colW / 2;
    const box = (stroke) => `<rect x="${n(cx - 27)}" y="52" width="54" height="54" rx="14" fill="${T.well}" stroke="${stroke}"/>`;
    const arrow = i < steps.length - 1 ? `<path d="M${n(cx + colW / 2 - 5)} 74l5 5-5 5" fill="none" stroke="${T.faint}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `  <g>
    ${box(T.line)}
    ${lineIcon(icon, n(cx - 11), 68, 22, T.faint, { width: 1.8 })}
    <text x="${n(cx)}" y="130" text-anchor="middle" class="mono" font-size="13" fill="${T.muted}">${label}</text>
    <rect x="${n(cx - 27)}" y="142" width="54" height="3" rx="1.5" fill="${T.line}"/>
    ${arrow}
    <g class="on" style="animation-delay:${i * turn}s">
      ${box(T.accent)}
      ${lineIcon(icon, n(cx - 11), 68, 22, T.fg, { width: 1.8 })}
      <text x="${n(cx)}" y="130" text-anchor="middle" class="mono" font-size="13" font-weight="700" fill="${T.fg}">${label}</text>
      <rect class="fill" style="animation-delay:${i * turn}s" x="${n(cx - 27)}" y="142" width="54" height="3" rx="1.5" fill="${T.accent}"/>
    </g>
  </g>`;
  });

  const style = `
    .on { opacity: 0; animation: on ${total}s linear infinite backwards; }
    @keyframes on { 0% { opacity: 0; } 3%, ${n(100 / steps.length)}% { opacity: 1; } ${n(100 / steps.length + 3)}%, 100% { opacity: 0; } }
    .fill { transform-box: fill-box; transform-origin: left center; animation: fill ${total}s linear infinite backwards; }
    @keyframes fill { 0% { transform: scaleX(0); } ${n(100 / steps.length)}%, 100% { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) { .on { opacity: 1; } }`;

  const body = `${card(T, H)}
  <circle class="pulse" cx="25" cy="28" r="3.5" fill="${T.glow}"/>
  <circle cx="25" cy="28" r="3.5" fill="${T.glow}"/>
  <text x="37" y="31.5" class="cap" fill="${T.muted}">RUNNING</text>
  <text x="${TILE - 20}" y="32" text-anchor="end" class="mono" font-size="11.5" fill="${T.faint}">while (alive)</text>
${cols.join('\n')}
  <text x="20" y="${H - 19}" class="mono" font-size="11.5" fill="${T.faint}">uptime <tspan fill="${T.muted}">${uptime}</tspan></text>
  <text x="${TILE - 20}" y="${H - 19}" text-anchor="end" class="mono" font-size="11.5" fill="${T.faint}">Tashkent, UTC+5</text>`;
  return svg(TILE, H, `My loop, running: eat, sleep, code. Uptime ${uptime} on GitHub, from Tashkent.`, style, body);
}

// ---------------------------------------------------------------------------------------------
// A year of contributions, one bar per week. The bars grow in; this week's bar breathes.
function activity(T) {
  const H = 196;
  const weeks = data.weeks.slice(-53);
  const peak = Math.max(...weeks.map((w) => w.total), 1);
  const left = 20;
  const pitch = (TILE - 40) / weeks.length;
  const barW = n(pitch * 0.64);
  const base = 158;
  const tall = 62;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let lastMonth = null;
  let lastLabelX = -99;
  const labels = [];
  const bars = weeks.map((week, i) => {
    const x = left + i * pitch;
    const month = Number(week.start.slice(5, 7)) - 1;
    if (month !== lastMonth && lastMonth !== null && x - lastLabelX > 26 && x < TILE - 40) {
      labels.push(`<text x="${n(x)}" y="${base + 17}">${months[month]}</text>`);
      lastLabelX = x;
    }
    lastMonth = month;
    // A square-root scale, so one huge week does not flatten every other week to nothing.
    const h = week.total === 0 ? 2 : Math.max(4, Math.sqrt(week.total / peak) * tall);
    const now = i === weeks.length - 1;
    return `<rect class="bar${now ? ' now' : ''}" style="animation-delay:${n(0.2 + i * 0.016)}s" x="${n(x)}" y="${n(base - h)}" width="${barW}" height="${n(h)}" rx="${n(Math.min(barW / 2, 2))}" fill="${week.total === 0 ? T.line : T.accent}"${week.total === 0 || now ? '' : ` opacity="${n(0.45 + 0.55 * Math.sqrt(week.total / peak))}"`}/>`;
  });

  const count = odometer(data.contributions, 20, 76, 30, T.fg, 0.2);
  const style = `${ODOMETER_CSS}
    .bar { transform-box: fill-box; transform-origin: center bottom; animation: grow .8s cubic-bezier(.16,1,.3,1) both; }
    @keyframes grow { from { transform: scaleY(0); } }
    .now { animation: grow .8s cubic-bezier(.16,1,.3,1) both, breathe 2.4s ease-in-out 1.6s infinite; }
    @keyframes breathe { 50% { opacity: .45; } }`;
  const body = `${card(T, H)}
  <text x="20" y="32" class="cap" fill="${T.muted}">CONTRIBUTIONS, LAST 12 MONTHS</text>
  ${count.body}
  <text x="${TILE - 20}" y="76" text-anchor="end" class="mono" font-size="11.5" fill="${T.faint}">best week <tspan fill="${T.muted}">${peak}</tspan></text>
  ${bars.join('\n  ')}
  <g class="mono" font-size="9.5" fill="${T.faint}">${labels.join('')}</g>`;
  return svg(TILE, H, `${data.contributions.toLocaleString('en-US')} contributions in the last 12 months, best week ${peak}.`, style, body);
}

// ---------------------------------------------------------------------------------------------
// Four figures, each rolling into place.
function stats(T) {
  const H = 156;
  const years = Math.floor((TODAY - new Date(data.joined)) / (365.25 * 864e5));
  const cells = [
    ['calendar-days', 'YEARS ON GITHUB', years, T.muted],
    ['book-marked', 'PUBLIC REPOS', data.publicRepos, T.muted],
    ['star', 'STARS EARNED', data.stars, T.gold],
    ['users', 'FOLLOWERS', data.followers, T.muted],
  ];
  const cw = (TILE - INSET * 2) / 2;
  const ch = (H - INSET * 2) / 2;
  const body = `${card(T, H)}
  <path d="M${n(TILE / 2)} 20V${H - 20}M20 ${n(H / 2)}H${TILE - 20}" stroke="${T.line}"/>
${cells
  .map(([icon, label, value, iconColor], i) => {
    const x = INSET + (i % 2) * cw + 18;
    const y = INSET + Math.floor(i / 2) * ch;
    return `  ${lineIcon(icon, n(x), n(y + 14), 14, iconColor, { draw: 0.3 + i * 0.15 })}
  <text x="${n(x + 21)}" y="${n(y + 25)}" class="cap" fill="${T.muted}">${label}</text>
  ${odometer(value, x, y + 58, 26, T.fg, 0.3 + i * 0.15).body}`;
  })
  .join('\n')}`;
  return svg(TILE, H, cells.map(([, label, value]) => `${label.toLowerCase()}: ${value}`).join(', '), ODOMETER_CSS, body);
}

// ---------------------------------------------------------------------------------------------
// The stack as two tapes of chips, drifting past each other.
const LANES = [
  [['typescript', 'TypeScript'], ['go', 'Go'], ['python', 'Python'], ['javascript', 'JavaScript'], ['nextdotjs', 'Next.js'], ['nuxt', 'Nuxt'], ['svelte', 'Svelte'], ['vuedotjs', 'Vue'], ['tailwindcss', 'Tailwind CSS']],
  [['nodedotjs', 'Node.js'], ['postgresql', 'PostgreSQL'], ['redis', 'Redis'], ['docker', 'Docker'], ['kubernetes', 'Kubernetes'], ['argo', 'Argo CD'], ['githubactions', 'GitHub Actions'], ['telegram', 'Telegram Bot API']],
];

function stack(T) {
  const H = 156;
  const used = new Set();
  const lanes = LANES.map((items, li) => {
    let x = 0;
    const chips = items.map(([slug, name]) => {
      used.add(slug);
      const w = Math.round(12 + 16 + 8 + sansWidth(name, 13, true) + 14);
      const out = `<g transform="translate(${x} 0)"><rect x=".5" y=".5" width="${w - 1}" height="31" rx="15.5" fill="${T.well}" stroke="${T.line}"/><use href="#b-${slug}" x="12" y="8"/><text x="36" y="20.5" class="sans" font-size="13" font-weight="600" fill="${T.fg}">${esc(name)}</text></g>`;
      x += w + 8;
      return out;
    });
    const run = `<g>${chips.join('')}</g>`;
    const y = 50 + li * 44;
    const seconds = Math.round(x / 24);
    return {
      css: `
    .lane${li} { animation: tape${li} ${seconds}s linear infinite; }
    @keyframes tape${li} { from { transform: translateX(${li % 2 ? -x : 0}px); } to { transform: translateX(${li % 2 ? 0 : -x}px); } }`,
      body: `<g transform="translate(${INSET + 14} ${y})"><g class="lane${li}">${run}<g transform="translate(${x} 0)">${run}</g></g></g>`,
    };
  });
  const icons = [...used].map((slug) => `<path id="b-${slug}" transform="scale(${n(16 / 24)})" fill="${brandColor(slug, T)}" d="${BRAND[slug].d}"/>`).join('');
  const fade = (id, from, to) => `<linearGradient id="${id}" x1="${from}" x2="${to}" y1="0" y2="0"><stop offset="0" stop-color="${T.card}"/><stop offset="1" stop-color="${T.card}" stop-opacity="0"/></linearGradient>`;
  const body = `  <defs>${icons}${fade('fl', 0, 1)}${fade('fr', 1, 0)}<clipPath id="in"><rect x="${INSET + 1}" y="${INSET + 1}" width="${TILE - INSET * 2 - 2}" height="${H - INSET * 2 - 2}" rx="11"/></clipPath></defs>
${card(T, H)}
  <text x="20" y="32" class="cap" fill="${T.muted}">STACK</text>
  <text x="${TILE - 20}" y="32" text-anchor="end" class="mono" font-size="11.5" fill="${T.faint}">${used.size} things I reach for</text>
  <g clip-path="url(#in)">
    ${lanes.map((l) => l.body).join('\n    ')}
    <rect x="${INSET + 1}" y="44" width="44" height="96" fill="url(#fl)"/>
    <rect x="${TILE - INSET - 45}" y="44" width="44" height="96" fill="url(#fr)"/>
  </g>`;
  return svg(TILE, H, `Stack: ${LANES.flat().map(([, name]) => name).join(', ')}.`, lanes.map((l) => l.css).join(''), body);
}

// ---------------------------------------------------------------------------------------------
// One card per project.
const PROJECTS = [
  { file: 'uzrail', name: 'UzRail Watch', kind: 'TELEGRAM BOT', icon: 'train-front', live: true,
    lines: ['Pings you the second train tickets appear', 'on Uzbek Railways.'], tags: 'TypeScript · Svelte · Telegram' },
  { file: 'cake-blow', name: 'cake-blow', kind: 'WEB TOY', icon: 'cake', repo: 'cake-blow',
    lines: ['A birthday cake you blow out through your', 'microphone. Add candles, make a wish.'], tags: 'HTML · CSS · JavaScript' },
  { file: 'anon-qa', name: 'telegram-anon-qa-bot', kind: 'TELEGRAM BOT', icon: 'message-circle-question', repo: 'telegram-anon-qa-bot',
    lines: ['Anonymous Q&A in Telegram: one link,', 'private questions, instant replies.'], tags: 'Python · Telegram' },
  { file: 'arduino-lamp', name: 'ArduinoWebLamp', kind: 'HARDWARE', icon: 'lamp-desk', repo: 'ArduinoWebLamp',
    lines: ['A desk lamp you control from a web page', 'or by touch, with a set of lighting effects.'], tags: 'C++ · Arduino Nano · ESP8266' },
  { file: 'games-manager', name: 'games-manager', kind: 'FRONTEND', icon: 'layers', repo: 'games-manager',
    lines: ['Drag-and-drop nested categories with', 'pagination and a real undo/redo stack.'], tags: 'Nuxt 3 · Pinia · TypeScript' },
  { file: 'site', name: 'shaxriyor.me', kind: 'WEBSITE', icon: 'globe', live: true,
    lines: ['My corner of the internet: writing, projects', 'and whatever I am building now.'], tags: 'Next.js · Tailwind CSS' },
];

function project(T, p, index) {
  const H = 152;
  const stars = p.repo ? (data.repoStars?.[p.repo] ?? 0) : 0;
  const right = TILE - 20;
  let corner = '';
  if (p.live) {
    corner = `<circle class="pulse" cx="${right - 39}" cy="${H - 25.5}" r="3" fill="${T.glow}"/><circle cx="${right - 39}" cy="${H - 25.5}" r="3" fill="${T.glow}"/>
  <text x="${right}" y="${H - 22}" text-anchor="end" class="cap" fill="${T.accent}">LIVE</text>`;
  } else if (stars > 0) {
    const text = String(stars);
    const tw = text.length * 7.4;
    corner = `<path transform="translate(${n(right - tw - 19)} ${H - 33.5}) scale(${n(13 / 24)})" fill="${T.gold}" stroke="${T.gold}" stroke-width="2" stroke-linejoin="round" d="${LINE.star[0]}"/>
  <text x="${right}" y="${H - 22}" text-anchor="end" class="mono" font-size="12" font-weight="700" fill="${T.fg}">${text}</text>`;
  }
  const body = `${card(T, H)}
  <rect x="20.5" y="20.5" width="41" height="41" rx="11" fill="${T.well}" stroke="${T.line}"/>
  ${lineIcon(p.icon, 31, 31, 20, T.fg, { draw: 0.25 + (index % 2) * 0.15, width: 1.9 })}
  <text x="74" y="38" class="sans" font-size="16.5" font-weight="700" fill="${T.fg}">${esc(p.name)}</text>
  <text x="74" y="56" class="cap" fill="${T.faint}">${p.kind}</text>
  ${lineIcon('arrow-up-right', right - 15, 22, 16, T.faint)}
  <text class="sans" font-size="13.5" fill="${T.muted}"><tspan x="20" y="88">${esc(p.lines[0])}</tspan><tspan x="20" y="107">${esc(p.lines[1])}</tspan></text>
  <text x="20" y="${H - 22}" class="mono" font-size="11" fill="${T.faint}">${esc(p.tags)}</text>
  ${corner}`;
  return svg(TILE, H, `${p.name}: ${p.lines.join(' ')}`, '', body);
}

// ---------------------------------------------------------------------------------------------
// Links: one pill each, with the place's own mark.
const LINKS = [
  { file: 'site', label: 'shaxriyor.me', line: 'globe' },
  { file: 'telegram', label: 'Telegram', brand: 'telegram' },
  { file: 'x', label: 'X', brand: 'x' },
  { file: 'linkedin', label: 'LinkedIn', line: 'linkedin' },
  { file: 'instagram', label: 'Instagram', brand: 'instagram' },
  { file: 'email', label: 'Email', line: 'mail' },
];

function link(T, l) {
  const H = 40;
  const W = Math.round(14 + 16 + 9 + sansWidth(l.label, 13.5, true) + 16);
  const icon = l.brand ? brandIcon(l.brand, 14, 12, 16, brandColor(l.brand, T)) : lineIcon(l.line, 14, 12, 16, T.fg, { width: 1.9 });
  const body = `  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${(H - 1) / 2}" fill="${T.card}" stroke="${T.line}"/>
  ${icon}
  <text x="39" y="25" class="sans" font-size="13.5" font-weight="600" fill="${T.fg}">${esc(l.label)}</text>`;
  return svg(W, H, l.label, '', body);
}

// ---------------------------------------------------------------------------------------------
mkdirSync(assets, { recursive: true });
let count = 0;
for (const [theme, T] of Object.entries(THEMES)) {
  const out = {
    hero: hero(T),
    loop: loop(T),
    activity: activity(T),
    stats: stats(T),
    stack: stack(T),
    ...Object.fromEntries(PROJECTS.map((p, i) => [`project-${p.file}`, project(T, p, i)])),
    ...Object.fromEntries(LINKS.map((l) => [`link-${l.file}`, link(T, l)])),
  };
  for (const [name, content] of Object.entries(out)) {
    writeFileSync(join(assets, `${name}-${theme}.svg`), content);
    count += 1;
  }
}
console.log(`built ${count} images: ${data.contributions.toLocaleString('en-US')} contributions, ${data.stars} stars, ${data.publicRepos} repos, ${data.followers} followers`);
