import { createContext, useCallback, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gsap, prefersReducedMotion, scrollTop } from '@/lib/motion';

type Go = (to: string, label?: string) => void;
const GoCtx = createContext<Go>(() => {});
export const useGo = () => useContext(GoCtx);

const PAGE_NAMES: Record<string, string> = {
  '/': 'Home',
  '/calculator': 'Calculator',
  '/coach': 'Coach mode',
  '/how-it-works': 'How it works',
  '/feedback': 'Feedback',
};

/* A yellow sheet with a curved leading edge sweeps up over the page, the route
 * swaps underneath, then it keeps going and uncovers the new page. */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const sheet = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  const go = useCallback<Go>(
    (to, name) => {
      if (busy.current) return;
      const el = sheet.current;
      if (prefersReducedMotion() || !el || !label.current) {
        navigate(to);
        return;
      }
      busy.current = true;
      label.current.textContent = name ?? PAGE_NAMES[to.split('?')[0]] ?? '';
      gsap
        .timeline({
          onComplete: () => {
            busy.current = false;
            gsap.set(el, { visibility: 'hidden' });
          },
        })
        .set(el, { visibility: 'visible', yPercent: 100, borderRadius: '50% 50% 0% 0% / 16vh 16vh 0vh 0vh' })
        .set(label.current, { yPercent: 120, opacity: 0 })
        .to(el, { yPercent: 0, borderRadius: '0% 0% 0% 0% / 0vh 0vh 0vh 0vh', duration: 0.62, ease: 'power3.inOut' })
        .to(label.current, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out' }, '-=0.25')
        .add(() => {
          navigate(to);
          scrollTop();
        })
        .to(label.current, { yPercent: -120, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.12')
        .to(el, { yPercent: -100, borderRadius: '0% 0% 50% 50% / 0vh 0vh 16vh 16vh', duration: 0.7, ease: 'power3.inOut' }, '-=0.15');
    },
    [navigate],
  );

  return (
    <GoCtx.Provider value={go}>
      {children}
      <div className="wipe" ref={sheet} aria-hidden="true">
        <span ref={label} />
      </div>
    </GoCtx.Provider>
  );
}

type TLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; label?: string };

/** A real link that plays the page transition on plain clicks. */
export function TLink({ to, label, onClick, children, ...rest }: TLinkProps) {
  const go = useGo();
  const loc = useLocation();
  const current = loc.pathname === to.split('?')[0];
  return (
    <a
      href={to}
      aria-current={current && !to.includes('?') ? 'page' : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        if (loc.pathname + loc.search === to) return;
        go(to, label);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
