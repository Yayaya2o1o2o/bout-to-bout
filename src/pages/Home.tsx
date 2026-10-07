import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Copy, Plus } from 'lucide-react';
import HeroStage from '@/components/HeroStage';
import { TLink } from '@/components/Transition';
import { Stepper } from '@/components/Fields';
import { Histogram, Ring } from '@/components/Charts';
import { Burst, Headgear, Medal, Peace, Singlet, Stopwatch, Whistle } from '@/components/Stickers';
import { calculateWait, clockAt } from '@/lib/calc';
import { gsap, prefersReducedMotion, useTitle, useTweenNumber } from '@/lib/motion';

const STEPS = [
  {
    n: '01',
    title: 'Look at the board.',
    body: 'Find the latest bout number called. Most gyms post it on a screen or a sheet by the head table.',
    art: <Stopwatch />,
    tone: 'sky',
  },
  {
    n: '02',
    title: 'Punch in your bout.',
    body: 'Add your bout number and how many mats are running. That is enough for a first estimate.',
    art: <Singlet />,
    tone: 'butter',
  },
  {
    n: '03',
    title: 'Read the range.',
    body: 'You get a likely window, not one fragile number. Plan around the early end of it.',
    art: <Headgear />,
    tone: 'white',
  },
  {
    n: '04',
    title: 'Warm up on time.',
    body: 'Start the countdown, tap +1 as bouts get called, and be at your mat before they say your name.',
    art: <Whistle />,
    tone: 'mint',
  },
];

const MARQUEE = ['Weigh-ins', 'Brackets', 'Mat 1', 'In the hole', 'On deck', 'Mat 4', 'Up now', 'Consolations', 'Mat 7', 'Finals'];

function TryIt() {
  const [current, setCurrent] = useState(148);
  const [mine, setMine] = useState(171);
  const [mats, setMats] = useState(6);
  const r = useMemo(
    () => calculateWait({ currentBout: current, nextBout: mine, activeMats: mats, avgBoutTime: 6, expectedDelay: 0, boutsAhead: null }),
    [current, mine, mats],
  );
  const shown = useTweenNumber(r.estimatedWait);
  const called = mine <= current;

  return (
    <div className="try" data-reveal>
      <div className="try-inputs">
        <Stepper id="try-cur" label="Bout on the board" value={current} onChange={setCurrent} min={0} max={5000} />
        <Stepper id="try-mine" label="Your bout" value={mine} onChange={setMine} min={1} max={5000} />
        <Stepper id="try-mats" label="Mats running" value={mats} onChange={setMats} min={1} max={40} />
      </div>
      <div className="try-out" aria-live="polite">
        <p className="label">{called ? 'Your bout' : 'You are likely up in'}</p>
        {called ? (
          <p className="try-big">
            <em>Called.</em>
          </p>
        ) : (
          <p className="try-big num">
            {Math.round(shown)}
            <small>min</small>
          </p>
        )}
        <p className="try-sub num">
          {called
            ? 'That number is already on the board. Head to your mat.'
            : `Around ${clockAt(r.estimatedWait)}. Likely between ${Math.round(r.likelyLow)} and ${Math.round(r.likelyHigh)} min.`}
        </p>
        <TLink to={`/calculator?c=${current}&n=${mine}&m=${mats}&t=6`} className="btn light">
          Open in the full calculator
          <span className="btn-dot">
            <ArrowRight size={18} />
          </span>
        </TLink>
      </div>
    </div>
  );
}

export default function Home() {
  useTitle("Bout-to-Bout: know when you're up");
  const root = useRef<HTMLDivElement>(null);

  const sample = useMemo(
    () => calculateWait({ currentBout: 120, nextBout: 150, activeMats: 6, avgBoutTime: 6, expectedDelay: 0, boutsAhead: null }),
    [],
  );

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      gsap.from('.hero-word > span', { yPercent: 112, rotate: 4, duration: 1.25, ease: 'expo.out', stagger: 0.075, delay: 0.1 });
      gsap.from('.hero-fade', { y: 28, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.55 });
      gsap.from('.hero-stage', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', delay: 0.45 });
      gsap.fromTo(
        '.hero-stage',
        { clipPath: 'inset(0% 0% 0% 0% round 28px)' },
        {
          clipPath: 'inset(0% 3% 0% 3% round 44px)',
          ease: 'none',
          scrollTrigger: { trigger: '.hero-stage', start: 'center center', end: 'bottom top', scrub: true },
        },
      );
      gsap.to('.hero-sticker', {
        yPercent: (i: number) => -60 - i * 40,
        rotate: (i: number) => (i % 2 ? 25 : -25),
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
      gsap.utils.toArray<HTMLElement>('.split-h').forEach((el) => {
        gsap.from(el.querySelectorAll('.w > span'), {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.05,
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });

      gsap.fromTo(
        '.scrub-word',
        { opacity: 0.12 },
        { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.scrub', start: 'top 78%', end: 'bottom 50%', scrub: true } },
      );
      gsap.to('.scrub-sticker', {
        rotate: 360,
        ease: 'none',
        scrollTrigger: { trigger: '.scrub', start: 'top bottom', end: 'bottom top', scrub: true },
      });

      gsap.from('.tile', {
        y: 90,
        rotate: (i: number) => (i % 2 ? 3 : -3),
        opacity: 0,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.09,
        scrollTrigger: { trigger: '.bento', start: 'top 82%' },
      });
      gsap.from('.coach-row', {
        x: -30,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.t-coach', start: 'top 70%' },
      });
    }, root);

    mm.add('(min-width: 900px)', () => {
      const track = root.current?.querySelector<HTMLElement>('.steps-track');
      if (!track) return;
      const dist = () => track.scrollWidth - window.innerWidth + 64;
      gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.steps',
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
      gsap.utils.toArray<HTMLElement>('.step .sticker').forEach((s, i) => {
        gsap.fromTo(s, { rotate: -20 - i * 5 }, { rotate: 20, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top top', end: () => `+=${dist()}`, scrub: true } });
      });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.utils.toArray<HTMLElement>('.step').forEach((s) => {
        gsap.from(s, { y: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 88%' } });
      });
    });

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  const words = (text: string) =>
    text.split(' ').map((w, i) => (
      <span key={i}>
        <span className="w">
          <span>{w}</span>
        </span>{' '}
      </span>
    ));

  return (
    <div ref={root}>
      <section className="hero">
        <div className="wrap">
          <h1 className="display" aria-label="Know when you're up.">
            <span className="hero-word">
              <span>Know</span>
            </span>{' '}
            <span className="hero-word">
              <span>when</span>
            </span>
            <br />
            <span className="hero-word">
              <span>you're</span>
            </span>{' '}
            <span className="hero-word">
              <span>
                <em>up.</em>
              </span>
            </span>
            <span className="hero-sticker hs1" aria-hidden="true">
              <Stopwatch className="float" />
            </span>
            <span className="hero-sticker hs2" aria-hidden="true">
              <Burst className="float d2" label="UP!" />
            </span>
          </h1>
          <div className="hero-row">
            <p className="lede hero-fade">
              A wait-time calculator for folkstyle tournaments. Put in the bout on the board and yours. Get a real range, so you
              warm up at the right time instead of pacing the bleachers.
            </p>
            <div className="hero-actions hero-fade">
              <TLink to="/calculator" className="btn">
                Open the calculator
                <span className="btn-dot">
                  <ArrowRight size={18} />
                </span>
              </TLink>
              <TLink to="/coach" className="link-arrow">
                Coaching a whole team? <ArrowUpRight size={17} />
              </TLink>
            </div>
          </div>
          <HeroStage />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <div className="marquee-set" key={k}>
              {MARQUEE.map((m, i) => (
                <span key={i} className="marquee-item">
                  {m}
                  {i % 3 === 0 ? <Medal /> : i % 3 === 1 ? <Singlet /> : <Stopwatch />}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="sec" id="try">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="h2 split-h">{words('Try it right here.')}</h2>
            <p className="lede" data-reveal>
              Three numbers. Change any of them and watch the estimate move. Nothing to install, nothing to sign up for.
            </p>
          </div>
          <TryIt />
        </div>
      </section>

      <section className="steps" aria-labelledby="steps-h">
        <div className="steps-track">
          <div className="steps-intro">
            <h2 className="h2" id="steps-h">
              From the bleachers
              <br />
              to the <em>mat</em>, in four steps.
            </h2>
            <p className="lede">Scroll sideways through a tournament day.</p>
          </div>
          {STEPS.map((s) => (
            <article className={`step tone-${s.tone}`} key={s.n}>
              <span className="step-n num">{s.n}</span>
              <div className="step-art" aria-hidden="true">
                {s.art}
              </div>
              <div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-body">{s.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="sec scrub" aria-label="Less pacing, more warming up">
        <div className="wrap scrub-in">
          <p className="scrub-text">
            {'Less pacing. Less guessing. More time warming up, and no more sprinting across the gym when they call your name.'
              .split(' ')
              .map((w, i) => (
                <span className="scrub-word" key={i}>
                  {w}{' '}
                </span>
              ))}
          </p>
          <div className="scrub-sticker" aria-hidden="true">
            <Burst label="ON DECK" />
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="built-h">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="h2 split-h" id="built-h">
              {words('Built for the people in the bleachers.')}
            </h2>
            <p className="lede" data-reveal>
              Wrestlers, parents, and coaches juggling six kids across four mats. Every tool works on a phone with one thumb.
            </p>
          </div>

          <div className="bento">
            <article className="tile t-coach">
              <div className="tile-copy">
                <h3 className="tile-h">Coach mode</h3>
                <p>Track your whole roster against one board number. Everyone is sorted by who is up next.</p>
                <TLink to="/coach" className="link-arrow">
                  Open coach mode <ArrowUpRight size={17} />
                </TLink>
              </div>
              <div className="coach-demo" aria-hidden="true">
                {[
                  ['Maya R.', '#152', 'On deck', 'deck'],
                  ['Jonah P.', '#157', 'In the hole', 'hole'],
                  ['Theo K.', '#166', '~9 min', 'wait'],
                  ['Ava S.', '#184', '~27 min', 'wait'],
                ].map(([n, b, s, c]) => (
                  <div className="coach-row" key={n}>
                    <span className="coach-name">{n}</span>
                    <span className="num coach-bout">{b}</span>
                    <span className={`tag ${c}`}>{s}</span>
                  </div>
                ))}
                <div className="coach-bump">
                  <Plus size={18} /> Bout called
                </div>
              </div>
            </article>

            <article className="tile t-live">
              <h3 className="tile-h">Live countdown</h3>
              <p>Start it once. Tap +1 when the board moves and it re-plans.</p>
              <div className="live-demo" aria-hidden="true">
                <Ring progress={0.62} size={112} />
                <span className="num">12:48</span>
              </div>
            </article>

            <article className="tile t-share">
              <h3 className="tile-h">Text it to the family</h3>
              <p>One tap shares a link with your numbers already filled in.</p>
              <div className="bubble" aria-hidden="true">
                Sam's up around 10:42. Could be 10:35, could be 10:51. Mat 3.
              </div>
              <div className="bubble-btn" aria-hidden="true">
                <Copy size={15} /> Link copied
              </div>
            </article>

            <article className="tile t-range">
              <h3 className="tile-h">An honest range</h3>
              <p>Thousands of simulated tournaments, so you see the spread, not a coin flip.</p>
              <Histogram samples={sample.samples} low={sample.likelyLow} high={sample.likelyHigh} median={sample.estimatedWait} compact bins={24} />
            </article>

            <article className="tile t-free">
              <h3 className="tile-h">No account. No app store.</h3>
              <p>Open the page, punch in two numbers. Your data stays on your phone.</p>
              <div className="free-stickers" aria-hidden="true">
                <Peace className="float" />
                <Medal className="float d2" />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="sec model-teaser" aria-labelledby="model-h">
        <div className="wrap teaser">
          <div>
            <h2 className="h2 split-h" id="model-h">
              {words('Not a guess. A simulation.')}
            </h2>
          </div>
          <div data-reveal>
            <p className="lede">
              Every mat is a lane. Bouts run long, end in a pin, go to overtime. We play your next stretch of the tournament out
              4,000 times and show you where most of them land.
            </p>
            <TLink to="/how-it-works" className="btn light">
              See how the estimate works
              <span className="btn-dot">
                <ArrowRight size={18} />
              </span>
            </TLink>
          </div>
        </div>
      </section>
    </div>
  );
}
