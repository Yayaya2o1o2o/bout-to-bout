import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Segmented } from '@/components/Fields';
import { Burst, Medal, Peace } from '@/components/Stickers';
import { TLink } from '@/components/Transition';
import { LAST_KEY, readStored, type LastPrediction } from '@/lib/store';
import { MODEL_VERSION } from '@/lib/calc';
import { gsap, prefersReducedMotion, useTitle } from '@/lib/motion';

type Topic = 'accuracy' | 'feature' | 'bug' | 'other';
const TOPICS: { value: Topic; label: string }[] = [
  { value: 'accuracy', label: 'How accurate it was' },
  { value: 'feature', label: 'An idea' },
  { value: 'bug', label: 'Something broke' },
  { value: 'other', label: 'Something else' },
];

export default function Feedback() {
  useTitle('Feedback · Bout-to-Bout');
  const loc = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const initialTopic = (new URLSearchParams(loc.search).get('topic') as Topic) || 'accuracy';
  const [topic, setTopic] = useState<Topic>(TOPICS.some((t) => t.value === initialTopic) ? initialTopic : 'accuracy');
  const [actual, setActual] = useState('');
  const [message, setMessage] = useState('');
  const [attach, setAttach] = useState(true);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const last = useMemo(() => readStored<LastPrediction | null>(LAST_KEY, null), []);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.page-title .w > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.from('.fb > *', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
    }, root);
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    if (state !== 'sent' || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.sent .sticker', { scale: 0, rotate: -90, duration: 1.2, ease: 'elastic.out(1, 0.5)', stagger: 0.1 });
      gsap.from('.sent-h, .sent p, .sent a', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: 0.2 });
    }, root);
    return () => ctx.revert();
  }, [state]);

  const actualNum = actual.trim() === '' ? null : Number(actual);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (actualNum !== null && (!Number.isFinite(actualNum) || actualNum < 0 || actualNum > 1440)) {
      setError('Actual wait should be a number of minutes between 0 and 1440.');
      return;
    }
    if (!message.trim() && actualNum === null) {
      setError('Add a note or the number of minutes you actually waited.');
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: topic,
          message: message.trim(),
          actualWait: actualNum,
          prediction: attach && last ? last : null,
          modelVersion: MODEL_VERSION,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'Something went wrong on our side.');
      }
      setState('sent');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Could not send. Check your signal and try again.');
    }
  };

  return (
    <div className="page" ref={root}>
      <div className="wrap">
        <header className="page-head">
          <h1 className="page-title" aria-label="Tell us how it went.">
            <span className="w">
              <span>Tell</span>
            </span>{' '}
            <span className="w">
              <span>us</span>
            </span>{' '}
            <span className="w">
              <span>how</span>
            </span>{' '}
            <span className="w">
              <span>it</span>
            </span>{' '}
            <span className="w">
              <span>
                <em>went.</em>
              </span>
            </span>
          </h1>
          <p className="lede">Real waits are how the estimate gets better. No name or email needed.</p>
        </header>

        {state === 'sent' ? (
          <div className="panel sent" role="status">
            <div className="sent-art" aria-hidden="true">
              <Peace />
              <Burst label="THX!" />
              <Medal />
            </div>
            <h2 className="sent-h">Got it. Thank you.</h2>
            <p className="muted">Every real wait time helps tune the model for the next tournament.</p>
            <TLink to="/calculator" className="btn">
              Back to the calculator
              <span className="btn-dot">
                <ArrowRight size={18} />
              </span>
            </TLink>
          </div>
        ) : (
          <div className="fb">
            <form className="panel fb-form" onSubmit={submit} noValidate>
              <Segmented name="topic" legend="What is this about?" value={topic} options={TOPICS} onChange={setTopic} />

              {topic === 'accuracy' && (
                <div className="field">
                  <label className="field-label" htmlFor="actual">
                    How long did you actually wait?
                  </label>
                  <p className="field-hint" id="actual-hint">
                    In minutes, from when you checked to when your bout was called.
                  </p>
                  <div className="input-suffix">
                    <input
                      id="actual"
                      className="input num"
                      inputMode="decimal"
                      value={actual}
                      aria-describedby="actual-hint"
                      onChange={(e) => setActual(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="e.g. 22"
                    />
                    <span>min</span>
                  </div>
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor="msg">
                  Anything else? <span className="muted">(optional)</span>
                </label>
                <textarea id="msg" className="input" rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gym, age group, what happened…" />
                <p className="field-count num">{message.length}/1000</p>
              </div>

              {last && (
                <label className="check">
                  <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
                  <span>
                    Include my last estimate (<b className="num">{Math.round(last.predictedWait)} min</b> for bout #{last.inputs.nextBout})
                  </span>
                </label>
              )}

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn" disabled={state === 'sending'}>
                {state === 'sending' ? (
                  <>
                    <Loader2 size={18} className="spin" /> Sending
                  </>
                ) : (
                  <>
                    Send feedback
                    <span className="btn-dot">
                      <ArrowRight size={18} />
                    </span>
                  </>
                )}
              </button>
            </form>

            <aside className="fb-side">
              <div className="panel tone-sky">
                <h2 className="h3">What happens to it</h2>
                <p className="muted">
                  We compare what the calculator predicted with what really happened. Enough of those and we can tune how spread out bout times
                  are, gym by gym.
                </p>
              </div>
              <div className="panel tone-butter">
                <h2 className="h3">What we keep</h2>
                <p className="muted">Your note, the wait you report, and the numbers behind your estimate. No name, no email, no tracking.</p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
