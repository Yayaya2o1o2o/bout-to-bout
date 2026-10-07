import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ChevronDown, MessageSquare, Play, Plus, RotateCcw, Share2, Square } from 'lucide-react';
import { Segmented, Stepper, Toast, useToast } from '@/components/Fields';
import { Histogram, RangeBar, Ring } from '@/components/Charts';
import { TLink } from '@/components/Transition';
import { calculateWait, clockAt, formatClock, type CalcInputs } from '@/lib/calc';
import {
  DEFAULT_TOURNAMENT,
  LAST_KEY,
  TOURNAMENT_KEY,
  clamp,
  copyText,
  useStoredState,
  writeStored,
  type Tournament,
} from '@/lib/store';
import { gsap, prefersReducedMotion, scrollToEl, useTitle, useTweenNumber } from '@/lib/motion';

interface Mine {
  nextBout: number;
  boutsAhead: number | null;
}
interface Live {
  startedAt: number;
  median: number;
  low: number;
  high: number;
}

const PRESETS = [
  { value: 4, label: 'Fast, 4 min' },
  { value: 6, label: 'Typical, 6 min' },
  { value: 8, label: 'Slow, 8 min' },
];

function mmss(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export default function Calculator() {
  useTitle('Calculator · Bout-to-Bout');
  const loc = useLocation();
  const [t, setT] = useStoredState<Tournament>(TOURNAMENT_KEY, DEFAULT_TOURNAMENT);
  const [mine, setMine] = useStoredState<Mine>('btb:calc', { nextBout: 124, boutsAhead: null });
  const [live, setLive] = useStoredState<Live | null>('btb:live', null);
  const [more, setMore] = useState(() => mine.boutsAhead !== null || t.expectedDelay > 0);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useToast();
  const [dockHidden, setDockHidden] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // shared links: /calculator?c=101&n=124&m=6&t=6&d=0&a=3
  useEffect(() => {
    const p = new URLSearchParams(loc.search);
    if (!p.has('n') && !p.has('c')) return;
    const num = (k: string) => {
      const raw = p.get(k);
      if (raw === null || raw.trim() === '') return undefined;
      const v = Number(raw);
      return Number.isFinite(v) ? v : undefined;
    };
    setT((prev) => ({
      currentBout: clamp(num('c') ?? prev.currentBout, 0, 9999),
      activeMats: clamp(num('m') ?? prev.activeMats, 1, 40),
      avgBoutTime: clamp(num('t') ?? prev.avgBoutTime, 1, 20),
      expectedDelay: clamp(num('d') ?? prev.expectedDelay, 0, 240),
    }));
    setMine((prev) => ({ nextBout: clamp(num('n') ?? prev.nextBout, 1, 9999), boutsAhead: num('a') ?? null }));
    if (num('a') !== undefined || (num('d') ?? 0) > 0) setMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputs: CalcInputs = useMemo(
    () => ({
      currentBout: t.currentBout,
      nextBout: mine.nextBout,
      activeMats: t.activeMats,
      avgBoutTime: t.avgBoutTime,
      expectedDelay: t.expectedDelay,
      boutsAhead: mine.boutsAhead,
    }),
    [t, mine],
  );
  const r = useMemo(() => calculateWait(inputs), [inputs]);
  const called = mine.boutsAhead === null && mine.nextBout <= t.currentBout;
  const shown = useTweenNumber(r.estimatedWait);

  // remember the latest prediction so feedback can attach it
  useEffect(() => {
    writeStored(LAST_KEY, {
      predictedWait: r.estimatedWait,
      likelyLow: r.likelyLow,
      likelyHigh: r.likelyHigh,
      baselineWait: r.baselineWait,
      inputs,
      at: Date.now(),
    });
  }, [r, inputs]);

  // re-anchor a running countdown whenever the estimate changes
  useEffect(() => {
    if (!live) return;
    if (Math.abs(live.median - r.estimatedWait) < 0.01 && live.low === r.likelyLow) return;
    setLive({ startedAt: Date.now(), median: r.estimatedWait, low: r.likelyLow, high: r.likelyHigh });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.estimatedWait, r.likelyLow, r.likelyHigh]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  // mobile dock hides while the full result is on screen
  useEffect(() => {
    const el = resultRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setDockHidden(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.page-title .w > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.from('.calc > *', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
    }, root);
    return () => ctx.revert();
  }, []);

  const setTour = (patch: Partial<Tournament>) => setT((prev) => ({ ...prev, ...patch }));
  const bumpBoard = () => {
    setTour({ currentBout: t.currentBout + 1 });
    setMine((m) => (m.boutsAhead !== null && m.boutsAhead > 0 ? { ...m, boutsAhead: m.boutsAhead - 1 } : m));
  };

  const shareUrl = () => {
    const p = new URLSearchParams({ c: String(t.currentBout), n: String(mine.nextBout), m: String(t.activeMats), t: String(t.avgBoutTime) });
    if (t.expectedDelay) p.set('d', String(t.expectedDelay));
    if (mine.boutsAhead !== null) p.set('a', String(mine.boutsAhead));
    return `${window.location.origin}/calculator?${p.toString()}`;
  };

  const share = async () => {
    const url = shareUrl();
    const text = called
      ? `Bout #${mine.nextBout} has been called.`
      : `Bout #${mine.nextBout} is likely up around ${clockAt(r.estimatedWait)} (between ${clockAt(r.likelyLow)} and ${clockAt(r.likelyHigh)}).`;
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Bout-to-Bout', text, url });
        return;
      } catch {
        /* user closed the share sheet */
        return;
      }
    }
    const ok = await copyText(`${text} ${url}`);
    setToast(ok ? 'Link copied. Paste it in the group chat.' : 'Could not copy. Long-press the address bar instead.');
  };

  const reset = () => {
    setT(DEFAULT_TOURNAMENT);
    setMine({ nextBout: 124, boutsAhead: null });
    setLive(null);
    setMore(false);
    setToast('Back to the defaults.');
  };

  const remaining = live ? live.median * 60 - (now - live.startedAt) / 1000 : 0;
  const progress = live && live.median > 0 ? 1 - remaining / (live.median * 60) : 1;

  return (
    <div className="page" ref={root}>
      <div className="wrap">
        <header className="page-head">
          <h1 className="page-title" aria-label="When am I up?">
            <span className="w">
              <span>When</span>
            </span>{' '}
            <span className="w">
              <span>am</span>
            </span>{' '}
            <span className="w">
              <span>
                I <em>up?</em>
              </span>
            </span>
          </h1>
          <p className="lede">Fill in what the board says. The estimate updates as you type and saves on this phone.</p>
        </header>

        <div className="calc">
          <section className="panel inputs" aria-labelledby="inputs-h">
            <h2 id="inputs-h" className="sr-only">
              Your numbers
            </h2>
            <div className="board-line">
              <Stepper
                id="cur"
                label="Latest bout called"
                hint="The newest number on the board or the head table."
                value={t.currentBout}
                onChange={(v) => setTour({ currentBout: v })}
                min={0}
                max={9999}
              />
              <button type="button" className="bump" onClick={bumpBoard}>
                <Plus size={20} strokeWidth={2.6} /> Bout called
              </button>
            </div>
            <Stepper
              id="mine"
              label="Your bout number"
              hint="Printed on your bracket or bout sheet."
              value={mine.nextBout}
              onChange={(v) => setMine((m) => ({ ...m, nextBout: v }))}
              min={1}
              max={9999}
            />
            <Stepper id="mats" label="Mats running" value={t.activeMats} onChange={(v) => setTour({ activeMats: v })} min={1} max={40} />
            <div className="field">
              <Stepper
                id="avg"
                label="Average time per bout"
                hint="Whistle to whistle, including the changeover. Six is a good start."
                value={t.avgBoutTime}
                onChange={(v) => setTour({ avgBoutTime: v })}
                min={1}
                max={20}
                step={0.5}
                suffix="min"
              />
              <Segmented
                name="preset"
                legend="Quick pick for average bout time"
                hideLegend
                value={t.avgBoutTime}
                options={PRESETS}
                onChange={(v) => setTour({ avgBoutTime: v })}
              />
            </div>

            <button type="button" className="more-btn" aria-expanded={more} aria-controls="more" onClick={() => setMore((v) => !v)}>
              More precise options <ChevronDown size={18} className={more ? 'flip' : ''} />
            </button>
            <div id="more" className={`more ${more ? 'is-open' : ''}`} hidden={!more}>
              <Stepper
                id="ahead"
                label="Bouts ahead of you on your mat"
                hint="Count the bout on the mat right now. If you know this, it beats the board math."
                value={mine.boutsAhead ?? 0}
                onChange={(v) => setMine((m) => ({ ...m, boutsAhead: v }))}
                min={0}
                max={200}
              />
              {mine.boutsAhead !== null && (
                <button type="button" className="text-btn" onClick={() => setMine((m) => ({ ...m, boutsAhead: null }))}>
                  Stop using mat count, go back to the board
                </button>
              )}
              <Stepper
                id="delay"
                label="Extra delay"
                hint="Award ceremonies, a break, a mat being re-taped."
                value={t.expectedDelay}
                onChange={(v) => setTour({ expectedDelay: v })}
                min={0}
                max={240}
                step={1}
                suffix="min"
              />
            </div>

            <div className="inputs-foot">
              <button type="button" className="text-btn" onClick={reset}>
                <RotateCcw size={15} /> Reset
              </button>
            </div>
          </section>

          <section className="panel result" ref={resultRef} aria-labelledby="result-h" aria-live="polite">
            <h2 id="result-h" className="label">
              {called ? 'Your bout' : mine.boutsAhead !== null ? 'Based on your mat' : 'You are likely up in'}
            </h2>

            {called ? (
              <div className="called">
                <p className="result-big">
                  <em>Called.</em>
                </p>
                <p className="result-clock">Bout #{mine.nextBout} is at or behind the board. Head to your mat, or fix the numbers above.</p>
              </div>
            ) : (
              <>
                <p className="result-big num">
                  <strong>{Math.round(shown)}</strong>
                  <span>min</span>
                </p>
                <p className="result-clock num">
                  Around <b>{clockAt(r.estimatedWait)}</b>
                  {r.estimatedWait >= 60 && <> · {formatClock(r.estimatedWait)}</>}
                </p>

                {r.warningMessage && (
                  <p className="warn">
                    <AlertTriangle size={18} /> {r.warningMessage}
                  </p>
                )}

                <div className="result-range">
                  <p className="num">
                    Likely between <b>{Math.round(r.likelyLow)}</b> and <b>{Math.round(r.likelyHigh)} min</b>
                    <span className="muted">
                      {' '}
                      ({clockAt(r.likelyLow)} to {clockAt(r.likelyHigh)})
                    </span>
                  </p>
                  <RangeBar low={r.likelyLow} high={r.likelyHigh} median={r.estimatedWait} />
                </div>

                <Histogram samples={r.samples} low={r.likelyLow} high={r.likelyHigh} median={r.estimatedWait} />
                <p className="fine num">
                  {r.iterations.toLocaleString()} simulated runs. Simple board math says {Math.round(r.baselineWait)} min.{' '}
                  <TLink to="/how-it-works">Why they differ</TLink>
                </p>

                <div className="live">
                  {live ? (
                    <>
                      <Ring progress={progress} />
                      <div className="live-copy">
                        <p className="label">Countdown to likely call</p>
                        <p className="live-time num">{remaining > 0 ? mmss(remaining) : 'Any moment'}</p>
                        <p className="fine">Tap “Bout called” each time the board moves.</p>
                      </div>
                      <button type="button" className="icon-btn" aria-label="Stop countdown" onClick={() => setLive(null)}>
                        <Square size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn plain live-start"
                      onClick={() => setLive({ startedAt: Date.now(), median: r.estimatedWait, low: r.likelyLow, high: r.likelyHigh })}
                    >
                      <Play size={17} /> Start countdown
                    </button>
                  )}
                </div>
              </>
            )}

            <div className="result-actions">
              <button type="button" className="btn light sm" onClick={share}>
                <Share2 size={16} /> Share
              </button>
              <TLink to="/feedback?topic=accuracy" className="btn light sm">
                <MessageSquare size={16} /> Report the real wait
              </TLink>
            </div>
          </section>
        </div>
      </div>

      <div className={`dock ${dockHidden ? 'is-hidden' : ''}`} aria-hidden={dockHidden}>
        <div>
          <p className="dock-label">{called ? 'Your bout' : 'Likely up in'}</p>
          <p className="dock-val num">
            {called ? 'Called' : `${Math.round(r.estimatedWait)} min`}
            {!called && <span> · {clockAt(r.estimatedWait)}</span>}
          </p>
        </div>
        <button type="button" className="btn sm" tabIndex={dockHidden ? -1 : 0} onClick={() => resultRef.current && scrollToEl(resultRef.current)}>
          Details
        </button>
      </div>
      <Toast message={toast} />
    </div>
  );
}
