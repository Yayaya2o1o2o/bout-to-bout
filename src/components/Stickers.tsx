/* Hand-drawn style stickers. Thick ink outline, flat fills, slight hard shadow. */

const INK = '#161615';
const RED = '#EF4130';
const BLUE = '#2C62F0';
const YELLOW = '#FFD23C';
const GREEN = '#2FAE5C';

type P = { className?: string; title?: string };

function Svg({ className, title, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`sticker ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g stroke={INK} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number, n: number, rot = -Math.PI / 2) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / n;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function Stopwatch(p: P) {
  return (
    <Svg {...p}>
      <rect x="42" y="5" width="16" height="11" rx="3" fill={RED} />
      <path d="M76 22 l7 -7" />
      <circle cx="50" cy="57" r="36" fill={YELLOW} />
      <circle cx="50" cy="57" r="26" fill="#fff" />
      <path d="M50 57 L50 39" />
      <path d="M50 57 L62 64" />
      <circle cx="50" cy="57" r="3.2" fill={INK} />
    </Svg>
  );
}

export function Singlet(p: P) {
  return (
    <Svg {...p}>
      <path d="M32 8 h10 q8 16 16 0 h10 l2 30 q10 22 6 54 h-20 q-6 -12 -12 0 h-20 q-4 -32 6 -54 z" fill={RED} />
      <path d="M29.5 50 Q50 57 70.5 50" stroke="#fff" strokeWidth="6" fill="none" />
    </Svg>
  );
}

export function Headgear(p: P) {
  return (
    <Svg {...p}>
      <path d="M24 50 Q50 -4 76 50" fill="none" strokeWidth="13" />
      <path d="M24 50 Q50 -4 76 50" fill="none" stroke={BLUE} strokeWidth="6" />
      <path d="M30 74 Q50 96 70 74" fill="none" />
      <circle cx="24" cy="58" r="17" fill={BLUE} />
      <circle cx="76" cy="58" r="17" fill={BLUE} />
      <circle cx="24" cy="58" r="6.5" fill="#fff" />
      <circle cx="76" cy="58" r="6.5" fill="#fff" />
    </Svg>
  );
}

export function Whistle(p: P) {
  return (
    <Svg {...p}>
      <path d="M30 40 Q14 12 46 10" fill="none" />
      <rect x="50" y="38" width="38" height="17" rx="4" fill={GREEN} />
      <circle cx="44" cy="62" r="25" fill={GREEN} />
      <circle cx="44" cy="62" r="8" fill="#fff" />
      <path d="M78 38 v-6 h10 v6" fill="none" />
    </Svg>
  );
}

export function Medal(p: P) {
  return (
    <Svg {...p}>
      <polygon points="28,4 46,4 58,40 45,45" fill={RED} />
      <polygon points="72,4 54,4 42,40 55,45" fill={BLUE} />
      <circle cx="50" cy="66" r="27" fill={YELLOW} />
      <polygon points={starPoints(50, 67, 13, 6, 5)} fill="#fff" />
    </Svg>
  );
}

export function Burst({ label = 'PIN!', ...p }: P & { label?: string }) {
  return (
    <Svg {...p}>
      <polygon points={starPoints(50, 50, 47, 37, 14)} fill={YELLOW} />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="23"
        fontWeight="700"
        fill={INK}
        stroke="none"
        transform="rotate(-9 50 50)"
        style={{ fontFamily: 'Google Sans, sans-serif', letterSpacing: '-0.5px' }}
      >
        {label}
      </text>
    </Svg>
  );
}

export function MatMark(p: P) {
  return (
    <Svg {...p}>
      <rect x="6" y="6" width="88" height="88" rx="22" fill={BLUE} />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="6" />
      <circle cx="50" cy="50" r="8" fill={RED} stroke="#fff" strokeWidth="3" />
    </Svg>
  );
}

export function Peace(p: P) {
  return (
    <Svg {...p}>
      <path
        d="M34 92 Q22 80 26 60 L28 48 Q30 40 38 44 L38 14 Q38 6 46 6 Q53 6 53 14 L54 40 L60 16 Q63 8 70 10 Q77 13 74 21 L66 50 Q78 54 76 70 Q74 88 58 92 Z"
        fill="#FBD3CB"
      />
      <path d="M38 52 Q46 50 50 56" fill="none" />
    </Svg>
  );
}
