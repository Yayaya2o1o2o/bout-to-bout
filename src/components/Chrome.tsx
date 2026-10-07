import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import { TLink } from '@/components/Transition';
import { Burst, Headgear, Medal, MatMark, Peace, Singlet, Stopwatch, Whistle } from '@/components/Stickers';
import { gsap, prefersReducedMotion } from '@/lib/motion';

const NAV = [
  { to: '/calculator', label: 'Calculator' },
  { to: '/coach', label: 'Coach mode' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/feedback', label: 'Feedback' },
];

export function Brand() {
  return (
    <TLink to="/" className="brand" aria-label="Bout-to-Bout home">
      <MatMark />
      <span>
        bout<i>to</i>bout
      </span>
    </TLink>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(y > 240 && y > lastY + 2);
      if (y < lastY - 2) setHidden(false);
      lastY = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('menu-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('menu-open');
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !sheet.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(sheet.current, { clipPath: 'circle(0% at 92% 34px)', duration: 0.7, ease: 'power3.inOut' });
      gsap.from('.sheet .big', { yPercent: 100, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, delay: 0.2 });
    }, sheet);
    return () => ctx.revert();
  }, [open]);

  return (
    <>
      <header className={`hdr ${scrolled ? 'is-scrolled' : ''} ${hidden && !open ? 'is-hidden' : ''}`}>
        <div className="wrap hdr-in">
          <Brand />
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <TLink key={n.to} to={n.to}>
                {n.label}
              </TLink>
            ))}
          </nav>
          <TLink to="/calculator" className="btn sm hdr-cta">
            Open calculator
          </TLink>
          <button
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {open && (
        <div className="sheet" id="mobile-menu" ref={sheet}>
          <nav aria-label="Mobile">
            {[{ to: '/', label: 'Home' }, ...NAV].map((n) => (
              <div className="sheet-row" key={n.to}>
                <TLink to={n.to} className="big">
                  {n.label}
                  <ArrowRight size={28} />
                </TLink>
              </div>
            ))}
          </nav>
          <div className="sheet-stickers" aria-hidden="true">
            <Stopwatch className="float" />
            <Singlet className="float d2" />
            <Headgear className="float d3" />
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.ftr-stickers .fs', {
        scale: 0,
        rotate: (i: number) => (i % 2 ? 40 : -40),
        y: 40,
        duration: 1.1,
        ease: 'elastic.out(1, 0.55)',
        stagger: 0.07,
        scrollTrigger: { trigger: '.ftr-stickers', start: 'top 92%' },
      });
      gsap.from('.ftr-big .w > span', {
        yPercent: 105,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.ftr-big', start: 'top 90%' },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <footer className="ftr" ref={root}>
      <div className="wrap">
        <p className="ftr-big" aria-label="Get on the mat.">
          <span className="w">
            <span>Get</span>
          </span>{' '}
          <span className="w">
            <span>on</span>
          </span>{' '}
          <span className="w">
            <span>the</span>
          </span>{' '}
          <span className="w">
            <span>
              <em>mat.</em>
            </span>
          </span>
        </p>
        <div className="ftr-stickers" aria-hidden="true">
          {[<Peace key="p" />, <Stopwatch key="s" />, <Singlet key="g" />, <Burst key="b" />, <Headgear key="h" />, <Medal key="m" />, <Whistle key="w" />].map((el, i) => (
            <span className="fs" key={i}>
              {el}
            </span>
          ))}
        </div>
        <div className="ftr-cta">
          <TLink to="/calculator" className="btn">
            Find out when you're up
            <span className="btn-dot">
              <ArrowRight size={18} />
            </span>
          </TLink>
        </div>
        <div className="ftr-cols">
          <div>
            <Brand />
            <p className="ftr-note">
              A free wait-time calculator for folkstyle wrestling tournaments. Estimates only. The table's call always wins.
            </p>
          </div>
          <div>
            <h2 className="ftr-h">Tools</h2>
            <TLink to="/calculator">Calculator</TLink>
            <TLink to="/coach">Coach mode</TLink>
          </div>
          <div>
            <h2 className="ftr-h">Learn</h2>
            <TLink to="/how-it-works">How it works</TLink>
            <TLink to="/how-it-works?faq">Questions</TLink>
          </div>
          <div>
            <h2 className="ftr-h">Talk to us</h2>
            <TLink to="/feedback">Send feedback</TLink>
            <TLink to="/feedback?topic=accuracy">Report a real wait</TLink>
          </div>
        </div>
        <p className="ftr-base">
          <span>Nothing you enter leaves your phone unless you send feedback.</span>
          <span>© {new Date().getFullYear()} Bout-to-Bout</span>
        </p>
      </div>
    </footer>
  );
}
