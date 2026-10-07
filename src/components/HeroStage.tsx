import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { calculateWait } from '@/lib/calc';
import { ScrollTrigger, prefersReducedMotion } from '@/lib/motion';
import type { MatSceneHandle } from '@/three/matScene';
import { Headgear, Singlet, Stopwatch } from '@/components/Stickers';

const START = 212;
const GAP = 15;

export default function HeroStage() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<MatSceneHandle | null>(null);
  const [bout, setBout] = useState(START);
  const [mat, setMat] = useState(1);
  const [yours, setYours] = useState(START + GAP);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('@/three/matScene')
      .then(({ createMatScene }) => {
        if (cancelled || !canvas.current) return;
        handle.current = createMatScene(canvas.current, {
          reduced: prefersReducedMotion(),
          startBout: START,
          onCall: (b, m) => {
            setBout(b);
            setMat(m);
            setYours((y) => (b >= y ? b + GAP : y));
          },
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!wrap.current) return;
    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: 'top 85%',
      end: 'bottom top',
      onUpdate: (s) => handle.current?.setScroll(s.progress),
    });
    return () => st.kill();
  }, []);

  const est = useMemo(
    () => calculateWait({ currentBout: bout, nextBout: yours, activeMats: 4, avgBoutTime: 6, expectedDelay: 0, boutsAhead: null }),
    [bout, yours],
  );

  return (
    <div className="hero-stage" ref={wrap}>
      <canvas ref={canvas} aria-label="Animated gym with four wrestling mats. Queued bouts fly to whichever mat frees up first." role="img" />
      {failed && (
        <div className="stage-fallback" aria-hidden="true">
          <Stopwatch className="float" />
          <Singlet className="float d2" />
          <Headgear className="float d3" />
        </div>
      )}
      <div className="stage-card stage-now" aria-live="off">
        <span className="stage-label">Now calling</span>
        <strong className="num" key={bout}>
          <span className="tick">#{bout}</span>
        </strong>
        <span className="stage-meta">to mat {mat}</span>
      </div>
      <div className="stage-card stage-you">
        <span className="stage-label">Your bout, #{yours}</span>
        <strong className="num">
          ~{Math.round(est.estimatedWait)} <small>min</small>
        </strong>
        <span className="stage-meta num">
          likely {Math.round(est.likelyLow)} to {Math.round(est.likelyHigh)} min
        </span>
      </div>
      <div className="stage-legend" aria-hidden="true">
        <span>
          <i className="dot y" /> queued bouts
        </span>
        <span>
          <i className="dot b" /> 4 mats running
        </span>
      </div>
    </div>
  );
}
