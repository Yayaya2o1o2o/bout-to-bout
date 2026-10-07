import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Plus, Shuffle } from 'lucide-react';
import { Stepper } from '@/components/Fields';
import { Histogram } from '@/components/Charts';
import { TLink } from '@/components/Transition';
import { calculateWait, simulateTimeline } from '@/lib/calc';
import { gsap, prefersReducedMotion, scrollToEl, useTitle } from '@/lib/motion';

const FAQ = [
  {
    q: 'Is this connected to the tournament software?',
    a: 'No. It does not read any bracket system. You tell it what the board says, and it does the math. That is also why it works in gyms with no signal once the page has loaded.',
  },
  {
    q: 'Why a range instead of one number?',
    a: 'Because bouts do not last the same time. A first-period pin and a sudden-victory overtime can sit back to back. The range shows where 8 out of 10 simulated runs landed. Plan around the early end.',
  },
  {
    q: 'What does “bouts ahead on your mat” change?',
    a: 'If your gym assigns bouts to specific mats, counting the bouts in front of you on your mat is more precise than the overall board. The calculator then only simulates your lane.',
  },
  {
    q: 'What average bout time should I use?',
    a: 'Start with 6 minutes. If the board moves faster than your estimate, drop it to 5. Youth sessions with shorter periods often run closer to 4. Timing two or three bouts from whistle to next whistle gets you a great number.',
  },
  {
    q: 'Does it save what I type?',
    a: 'Only on your phone, in the browser. Nothing leaves your device unless you choose to send feedback.',
  },
  {
    q: 'Why did my estimate jump?',
    a: 'Every time the board number changes, the simulation starts over from the new spot. A mat that finishes three quick bouts in a row really does pull your time in.',
  },
];

function Lanes({ mats, ahead, avg, seed }: { mats: number; ahead: number; avg: number; seed: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const tl = useMemo(
    () => simulateTimeline({ currentBout: 0, nextBout: ahead, activeMats: mats, avgBoutTime: avg, expectedDelay: 0, boutsAhead: null }, seed),
    [mats, ahead, avg, seed],
  );
  const W = 1000;
  const gutter = 64;
  const rowH = 30;
  const gap = 10;
  const H = mats * (rowH + gap) + 30;
  const x = (v: number) => gutter + (v / tl.horizon) * (W - gutter - 8);
  const step = tl.horizon > 90 ? 20 : tl.horizon > 40 ? 10 : 5;
  const ticks: number[] = [];
  for (let v = 0; v <= tl.horizon; v += step) ticks.push(v);
  const target = tl.bars.find((b) => b.isTarget);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !svg.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.lane-bar', { scaleX: 0, transformOrigin: 'left center', duration: 0.6, ease: 'power3.out', stagger: 0.012 });
      gsap.from('.lane-you', { scale: 0, transformOrigin: 'center', duration: 0.8, ease: 'back.out(2)', delay: 0.5 });
    }, svg);
    return () => ctx.revert();
  }, [tl]);

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="lanes" role="img" aria-label={`One simulated run: your bout starts after about ${Math.round(tl.targetStart)} minutes.`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={0} y2={H - 26} className="lane-grid" />
          <text x={x(v)} y={H - 6} textAnchor="middle" className="lane-axis">
            {v}m
          </text>
        </g>
      ))}
      {Array.from({ length: mats }, (_, m) => (
        <text key={m} x={0} y={m * (rowH + gap) + rowH / 2 + 5} className="lane-label">
          Mat {m + 1}
        </text>
      ))}
      {tl.bars.map((b, i) => (
        <rect
          key={i}
          className={`lane-bar ${b.isTarget ? 'is-you' : b.isCurrent ? 'is-now' : ''}`}
          x={x(b.start) + 1}
          y={b.mat * (rowH + gap)}
          width={Math.max(2, x(b.end) - x(b.start) - 2)}
          height={rowH}
          rx={7}
        />
      ))}
      {target && (
        <g className="lane-you" transform={`translate(${x(target.start)}, ${target.mat * (rowH + gap) + rowH / 2})`}>
          <circle r={15} />
          <text y={4} textAnchor="middle">
            You
          </text>
        </g>
      )}
    </svg>
  );
}

export default function HowItWorks() {
  useTitle('How it works · Bout-to-Bout');
  const loc = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const [mats, setMats] = useState(4);
  const [ahead, setAhead] = useState(22);
  const [avg, setAvg] = useState(6);
  const [seed, setSeed] = useState(3);

  const r = useMemo(
    () => calculateWait({ currentBout: 0, nextBout: ahead, activeMats: mats, avgBoutTime: avg, expectedDelay: 0, boutsAhead: null }),
    [mats, ahead, avg],
  );
  const tl = useMemo(
    () => simulateTimeline({ currentBout: 0, nextBout: ahead, activeMats: mats, avgBoutTime: avg, expectedDelay: 0, boutsAhead: null }, seed),
    [mats, ahead, avg, seed],
  );

  useEffect(() => {
    if (new URLSearchParams(loc.search).has('faq')) {
      const id = setTimeout(() => scrollToEl('#faq'), 400);
      return () => clearTimeout(id);
    }
  }, [loc.search]);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.page-title .w > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });
      gsap.from('.formula .tok', {
        y: 30,
        opacity: 0,
        rotate: (i: number) => (i % 2 ? 6 : -6),
        duration: 0.9,
        ease: 'back.out(1.8)',
        stagger: 0.07,
        scrollTrigger: { trigger: '.formula', start: 'top 85%' },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const baseline = (ahead / mats) * avg;

  return (
    <div className="page" ref={root}>
      <div className="wrap">
        <header className="page-head">
          <h1 className="page-title" aria-label="How the estimate works.">
            <span className="w">
              <span>How</span>
            </span>{' '}
            <span className="w">
              <span>the</span>
            </span>{' '}
            <span className="w">
              <span>estimate</span>
            </span>{' '}
            <span className="w">
              <span>
                <em>works.</em>
              </span>
            </span>
          </h1>
          <p className="lede">Two answers, side by side. The simple one you could do on a napkin, and the one that plays the day out thousands of times.</p>
        </header>

        <section className="explain" data-reveal>
          <div className="panel ex-card">
            <p className="label">The napkin math</p>
            <h2 className="h3">Divide the line by the mats.</h2>
            <p className="formula num" aria-label="bouts ahead divided by mats, times average minutes">
              <span className="tok">{ahead}</span>
              <span className="tok op">÷</span>
              <span className="tok">{mats}</span>
              <span className="tok op">×</span>
              <span className="tok">{avg}</span>
              <span className="tok op">=</span>
              <span className="tok ans">{Math.round(baseline)} min</span>
            </p>
            <p className="muted">
              Fine as a ballpark. But it assumes every bout takes exactly the average and every mat finishes in lockstep. Neither happens.
            </p>
          </div>
          <div className="panel ex-card tone-sky">
            <p className="label">The simulation</p>
            <h2 className="h3">Run the day 4,000 times.</h2>
            <p className="big-num num">
              {Math.round(r.estimatedWait)} <small>min</small>
            </p>
            <p className="muted">
              Each mat is a lane. Every bout gets a random length around your average, some quick pins, some long ones. The next bout in
              line goes to whichever mat frees up first. We record when yours starts, then do it again.
            </p>
          </div>
        </section>

        <section className="sec-tight" aria-labelledby="lanes-h">
          <div className="lanes-head">
            <div>
              <h2 className="h2" id="lanes-h">
                One run, <em>drawn out.</em>
              </h2>
              <p className="lede">
                Gray bars are bouts already on the mat. Blue bars are the line. The red one is you. Shuffle to see how much a single day
                can vary.
              </p>
            </div>
            <button type="button" className="btn" onClick={() => setSeed((s) => s + 1)}>
              <Shuffle size={17} /> Run another day
            </button>
          </div>
          <div className="lanes-controls">
            <Stepper id="l-mats" label="Mats" value={mats} onChange={setMats} min={1} max={8} />
            <Stepper id="l-ahead" label="Bouts until yours" value={ahead} onChange={setAhead} min={1} max={80} />
            <Stepper id="l-avg" label="Average bout" value={avg} onChange={setAvg} min={2} max={12} step={0.5} suffix="min" />
          </div>
          <div className="panel lanes-wrap">
            <Lanes mats={mats} ahead={ahead} avg={avg} seed={seed} />
            <p className="fine num">
              This run: you start at {Math.round(tl.targetStart)} min. Across 4,000 runs the middle is {Math.round(r.estimatedWait)} min.
            </p>
          </div>
        </section>

        <section className="sec-tight dist" aria-labelledby="dist-h">
          <div data-reveal>
            <h2 className="h2" id="dist-h">
              Where the runs <em>land.</em>
            </h2>
            <p className="lede">
              Each bar counts how many simulated days started your bout at that minute. The dark bars are the likely range, the middle 80%.
              The red line is the estimate we show you.
            </p>
            <dl className="stats num">
              <div>
                <dt>Early end</dt>
                <dd>{Math.round(r.likelyLow)} min</dd>
              </div>
              <div>
                <dt>Estimate</dt>
                <dd>{Math.round(r.estimatedWait)} min</dd>
              </div>
              <div>
                <dt>Late end</dt>
                <dd>{Math.round(r.likelyHigh)} min</dd>
              </div>
            </dl>
          </div>
          <div className="panel" data-reveal>
            <Histogram samples={r.samples} low={r.likelyLow} high={r.likelyHigh} median={r.estimatedWait} />
          </div>
        </section>

        <section className="sec-tight honest panel tone-butter" data-reveal aria-labelledby="honest-h">
          <h2 className="h3" id="honest-h">
            What it cannot know
          </h2>
          <ul>
            <li>Bouts getting moved between mats, or a mat closing early.</li>
            <li>A long injury timeout or a coach challenge.</li>
            <li>Breaks the table has not announced yet. Add those as extra delay.</li>
            <li>How spread out bout times really are. We assume a typical spread for now and will tune it from real waits people report.</li>
          </ul>
          <TLink to="/feedback?topic=accuracy" className="link-arrow">
            Help tune it: report your real wait <ArrowRight size={17} />
          </TLink>
        </section>

        <section className="sec-tight faq" id="faq" aria-labelledby="faq-h">
          <h2 className="h2" id="faq-h" data-reveal>
            Questions.
          </h2>
          <div className="faq-list" data-reveal>
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus size={22} className="faq-icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
