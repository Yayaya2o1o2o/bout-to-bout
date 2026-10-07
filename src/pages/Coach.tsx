import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCopy, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { Stepper, Toast, useToast } from '@/components/Fields';
import { Headgear, Singlet } from '@/components/Stickers';
import { calculateWait, clockAt } from '@/lib/calc';
import { DEFAULT_TOURNAMENT, TOURNAMENT_KEY, copyText, useStoredState, type Tournament } from '@/lib/store';
import { gsap, prefersReducedMotion, useTitle } from '@/lib/motion';

interface Wrestler {
  id: string;
  name: string;
  bout: number;
}

type Status = { key: 'done' | 'deck' | 'hole' | 'wait'; label: string };

function status(ahead: number, mats: number): Status {
  if (ahead <= 0) return { key: 'done', label: 'Called' };
  if (ahead <= mats) return { key: 'deck', label: 'On deck' };
  if (ahead <= mats * 2) return { key: 'hole', label: 'In the hole' };
  return { key: 'wait', label: 'Waiting' };
}

const uid = () => Math.random().toString(36).slice(2, 9);

export default function Coach() {
  useTitle('Coach mode · Bout-to-Bout');
  const [t, setT] = useStoredState<Tournament>(TOURNAMENT_KEY, DEFAULT_TOURNAMENT);
  const [roster, setRoster] = useStoredState<Wrestler[]>('btb:roster', []);
  const [name, setName] = useState('');
  const [bout, setBout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useToast();
  const root = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () =>
      roster
        .map((w) => {
          const ahead = w.bout - t.currentBout;
          const r =
            ahead > 0
              ? calculateWait({
                  currentBout: t.currentBout,
                  nextBout: w.bout,
                  activeMats: t.activeMats,
                  avgBoutTime: t.avgBoutTime,
                  expectedDelay: t.expectedDelay,
                  boutsAhead: null,
                })
              : null;
          return { w, ahead, r, s: status(ahead, t.activeMats) };
        })
        .sort((a, b) => a.w.bout - b.w.bout),
    [roster, t],
  );

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('.page-title .w > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.1 });
      gsap.from('.team > *', { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
    }, root);
    return () => ctx.revert();
  }, []);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const b = Number(bout);
    if (!n) return setError('Add a name.');
    if (!bout.trim() || !Number.isInteger(b) || b < 1) return setError('Add a whole bout number, like 152.');
    setRoster((r) => [...r, { id: uid(), name: n.slice(0, 40), bout: b }]);
    setName('');
    setBout('');
    setError(null);
    nameRef.current?.focus();
  };

  const example = () => {
    const c = t.currentBout;
    setRoster([
      { id: uid(), name: 'Maya R.', bout: c + 3 },
      { id: uid(), name: 'Jonah P.', bout: c + 9 },
      { id: uid(), name: 'Theo K.', bout: c + 18 },
      { id: uid(), name: 'Ava S.', bout: c + 31 },
      { id: uid(), name: 'Luis M.', bout: c + 44 },
    ]);
  };

  const update = (id: string, patch: Partial<Wrestler>) => setRoster((r) => r.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const copyUpdate = async () => {
    const lines = rows.map(({ w, r, s }) =>
      r ? `${w.name} #${w.bout}: ~${Math.round(r.estimatedWait)} min (around ${clockAt(r.estimatedWait)})` : `${w.name} #${w.bout}: ${s.label.toLowerCase()}`,
    );
    const text = `Update ${clockAt(0)}, bout ${t.currentBout} on the board:\n${lines.join('\n')}`;
    const ok = await copyText(text);
    setToast(ok ? 'Update copied. Paste it in the team chat.' : 'Could not copy on this browser.');
  };

  return (
    <div className="page" ref={root}>
      <div className="wrap">
        <header className="page-head">
          <h1 className="page-title" aria-label="Coach mode.">
            <span className="w">
              <span>Coach</span>
            </span>{' '}
            <span className="w">
              <span>
                <em>mode.</em>
              </span>
            </span>
          </h1>
          <p className="lede">One board number, your whole roster. Tap “Bout called” as the table moves and everyone re-sorts.</p>
        </header>

        <div className="team">
          <aside className="panel board" aria-labelledby="board-h">
            <h2 id="board-h" className="label">
              The board
            </h2>
            <Stepper id="c-cur" label="Latest bout called" value={t.currentBout} onChange={(v) => setT((p) => ({ ...p, currentBout: v }))} min={0} max={9999} />
            <button type="button" className="bump wide" onClick={() => setT((p) => ({ ...p, currentBout: p.currentBout + 1 }))}>
              <Plus size={22} strokeWidth={2.6} /> Bout called
            </button>
            <Stepper id="c-mats" label="Mats running" value={t.activeMats} onChange={(v) => setT((p) => ({ ...p, activeMats: v }))} min={1} max={40} />
            <Stepper
              id="c-avg"
              label="Average time per bout"
              value={t.avgBoutTime}
              onChange={(v) => setT((p) => ({ ...p, avgBoutTime: v }))}
              min={1}
              max={20}
              step={0.5}
              suffix="min"
            />
            <p className="fine">Shared with the calculator, so both pages always agree.</p>
          </aside>

          <section className="panel roster" aria-labelledby="roster-h">
            <div className="roster-head">
              <h2 id="roster-h" className="roster-title">
                <Users size={20} /> Roster <span className="muted num">{roster.length}</span>
              </h2>
              {roster.length > 0 && (
                <button type="button" className="btn light sm" onClick={copyUpdate}>
                  <ClipboardCopy size={16} /> Copy update
                </button>
              )}
            </div>

            <form className="add" onSubmit={add} noValidate>
              <label className="sr-only" htmlFor="w-name">
                Wrestler name
              </label>
              <input id="w-name" ref={nameRef} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              <label className="sr-only" htmlFor="w-bout">
                Bout number
              </label>
              <input id="w-bout" className="num" placeholder="Bout #" inputMode="numeric" value={bout} onChange={(e) => setBout(e.target.value.replace(/[^0-9]/g, ''))} />
              <button type="submit" className="btn sm">
                <UserPlus size={16} /> Add
              </button>
            </form>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {rows.length === 0 ? (
              <div className="empty">
                <div className="empty-art" aria-hidden="true">
                  <Singlet className="float" />
                  <Headgear className="float d2" />
                </div>
                <p className="empty-h">No wrestlers yet.</p>
                <p className="muted">Add names and bout numbers from the bracket. They stay on this phone.</p>
                <button type="button" className="text-btn" onClick={example}>
                  Load an example roster
                </button>
              </div>
            ) : (
              <ul className="rows">
                {rows.map(({ w, r, s }) => (
                  <li className={`row s-${s.key}`} key={w.id}>
                    <span className="row-name">{w.name}</span>
                    <label className="row-bout">
                      <span className="sr-only">Bout number for {w.name}</span>
                      <span aria-hidden="true">#</span>
                      <input
                        className="num"
                        inputMode="numeric"
                        value={w.bout}
                        onChange={(e) => {
                          const v = Number(e.target.value.replace(/[^0-9]/g, ''));
                          if (v > 0) update(w.id, { bout: v });
                        }}
                      />
                    </label>
                    <span className={`tag ${s.key}`}>{s.label}</span>
                    <span className="row-eta num">
                      {r ? (
                        <>
                          <b>~{Math.round(r.estimatedWait)} min</b>
                          <small>{clockAt(r.estimatedWait)}</small>
                        </>
                      ) : (
                        <small>Next bout? Edit the number.</small>
                      )}
                    </span>
                    <button type="button" className="icon-btn" aria-label={`Remove ${w.name}`} onClick={() => setRoster((rs) => rs.filter((x) => x.id !== w.id))}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <Toast message={toast} />
    </div>
  );
}
