import { useLayoutEffect, useRef } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Footer, Header } from '@/components/Chrome';
import { TLink, TransitionProvider } from '@/components/Transition';
import { Burst } from '@/components/Stickers';
import Home from '@/pages/Home';
import Calculator from '@/pages/Calculator';
import Coach from '@/pages/Coach';
import HowItWorks from '@/pages/HowItWorks';
import Feedback from '@/pages/Feedback';
import { ScrollTrigger, scrollTop, useTitle } from '@/lib/motion';

function NotFound() {
  useTitle('Not found · Bout-to-Bout');
  return (
    <div className="page">
      <div className="wrap nf">
        <Burst label="404" className="float" />
        <h1 className="page-title">
          Wrong <em>mat.</em>
        </h1>
        <p className="lede">This page does not exist. The calculator does.</p>
        <TLink to="/calculator" className="btn">
          Open the calculator
          <span className="btn-dot">
            <ArrowRight size={18} />
          </span>
        </TLink>
      </div>
    </div>
  );
}

function Layout() {
  const loc = useLocation();
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollTop();
    document.getElementById('main')?.focus({ preventScroll: true });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [loc.pathname]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <TransitionProvider>
      <Layout />
    </TransitionProvider>
  );
}
