export interface CalcInputs {
  currentBout: number;
  nextBout: number;
  activeMats: number;
  avgBoutTime: number; // minutes
  expectedDelay: number; // minutes
  boutsAhead: number | null; // optional mat-specific override; includes the bout currently on the mat
}

export type EstimateMode = 'global-queue' | 'mat-queue';

export interface CalcResult {
  estimatedWait: number; // Monte Carlo median, minutes
  baselineWait: number; // deterministic reference estimate, minutes
  likelyLow: number; // 10th percentile
  likelyHigh: number; // 90th percentile
  meanWait: number;
  iterations: number;
  mode: EstimateMode;
  isWarning: boolean;
  warningMessage: string | null;
  samples: number[]; // sorted simulated waits, minutes
}

const SERVICE_TIME_CV = 0.45;
export const MODEL_VERSION = '2.1-monte-carlo-queue';

function hashInputs(inputs: CalcInputs): number {
  const values = [
    inputs.currentBout,
    inputs.nextBout,
    inputs.activeMats,
    Math.round(inputs.avgBoutTime * 100),
    Math.round(inputs.expectedDelay * 100),
    inputs.boutsAhead ?? -1,
  ];

  let hash = 2166136261;
  for (const value of values) {
    hash ^= value | 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function standardNormal(rng: () => number): number {
  // Box-Muller transform. Avoid log(0).
  const u1 = Math.max(Number.EPSILON, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function sampleBoutDuration(mean: number, rng: () => number = Math.random): number {
  // Positive service-time model. CV=0.45 supplies realistic variability while
  // keeping the selected average bout time as the distribution mean.
  const safeMean = Math.max(0.25, mean);
  const sigmaSquared = Math.log(1 + SERVICE_TIME_CV ** 2);
  const sigma = Math.sqrt(sigmaSquared);
  const mu = Math.log(safeMean) - sigmaSquared / 2;
  const sampled = Math.exp(mu + sigma * standardNormal(rng));

  // Guard against extremely rare tails dominating a small simulation.
  return Math.min(Math.max(sampled, 0.25), safeMean * 3.5);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function chooseIterations(queueDepth: number): number {
  if (queueDepth > 500) return 800;
  if (queueDepth > 250) return 1200;
  if (queueDepth > 100) return 2000;
  return 4000;
}

function simulateGlobalQueue(inputs: CalcInputs, rng: () => number, iterations: number): number[] {
  const jobsUntilTarget = Math.max(0, Math.floor(inputs.nextBout - inputs.currentBout));
  const mats = Math.max(1, Math.floor(inputs.activeMats));
  const samples = new Array<number>(iterations);

  if (jobsUntilTarget === 0) {
    samples.fill(Math.max(0, inputs.expectedDelay));
    return samples;
  }

  for (let sim = 0; sim < iterations; sim += 1) {
    // Each active mat is treated as a parallel server. Because we do not know
    // how far the current bouts have progressed, initialize each server with a
    // random residual fraction of a sampled bout duration.
    const nextFree = new Array<number>(mats);
    for (let mat = 0; mat < mats; mat += 1) {
      nextFree[mat] = sampleBoutDuration(inputs.avgBoutTime, rng) * rng();
    }

    let targetStart = 0;
    for (let completion = 1; completion <= jobsUntilTarget; completion += 1) {
      let fastestMat = 0;
      for (let mat = 1; mat < mats; mat += 1) {
        if (nextFree[mat] < nextFree[fastestMat]) fastestMat = mat;
      }

      targetStart = nextFree[fastestMat];
      if (completion < jobsUntilTarget) {
        nextFree[fastestMat] = targetStart + sampleBoutDuration(inputs.avgBoutTime, rng);
      }
    }

    samples[sim] = targetStart + Math.max(0, inputs.expectedDelay);
  }

  return samples;
}

function simulateMatQueue(inputs: CalcInputs, rng: () => number, iterations: number): number[] {
  const boutsAhead = Math.max(0, Math.floor(inputs.boutsAhead ?? 0));
  const samples = new Array<number>(iterations);

  if (boutsAhead === 0) {
    samples.fill(Math.max(0, inputs.expectedDelay));
    return samples;
  }

  for (let sim = 0; sim < iterations; sim += 1) {
    // The first queued bout is assumed to be the one currently on the mat, so
    // only an unknown residual time remains. Later bouts require full service.
    let wait = sampleBoutDuration(inputs.avgBoutTime, rng) * rng();
    for (let i = 1; i < boutsAhead; i += 1) {
      wait += sampleBoutDuration(inputs.avgBoutTime, rng);
    }
    samples[sim] = wait + Math.max(0, inputs.expectedDelay);
  }

  return samples;
}

export function calculateWait(inputs: CalcInputs): CalcResult {
  const { nextBout, currentBout, activeMats, avgBoutTime, expectedDelay, boutsAhead } = inputs;
  const safeMats = Math.max(1, activeMats);
  const boutsToWait = Math.max(0, nextBout - currentBout);
  const mode: EstimateMode = boutsAhead !== null && !Number.isNaN(boutsAhead) ? 'mat-queue' : 'global-queue';

  const baselineWait =
    mode === 'mat-queue'
      ? Math.max(0, boutsAhead ?? 0) * avgBoutTime + Math.max(0, expectedDelay)
      : (boutsToWait / safeMats) * avgBoutTime + Math.max(0, expectedDelay);

  const queueDepth = mode === 'mat-queue' ? Math.max(0, boutsAhead ?? 0) : boutsToWait;
  const iterations = chooseIterations(queueDepth);
  const rng = mulberry32(hashInputs(inputs));
  const samples =
    mode === 'mat-queue'
      ? simulateMatQueue(inputs, rng, iterations)
      : simulateGlobalQueue(inputs, rng, iterations);

  samples.sort((a, b) => a - b);
  const meanWait = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
  const estimatedWait = quantile(samples, 0.5);
  const likelyLow = quantile(samples, 0.1);
  const likelyHigh = quantile(samples, 0.9);

  const isWarning =
    mode === 'mat-queue'
      ? (boutsAhead ?? 0) <= 1
      : boutsToWait > 0 && boutsToWait <= activeMats;
  const warningMessage = isWarning
    ? 'You could be called any minute. Stay warm and stay close to your mat.'
    : null;

  return {
    estimatedWait,
    baselineWait,
    likelyLow,
    likelyHigh,
    meanWait,
    iterations,
    mode,
    isWarning,
    warningMessage,
    samples,
  };
}

export interface TimelineBar {
  mat: number;
  start: number;
  end: number;
  isTarget: boolean;
  isCurrent: boolean;
}

/** One single simulated run of the global queue, for drawing. */
export function simulateTimeline(inputs: CalcInputs, seed = 11) {
  const rng = mulberry32((seed * 2654435761) ^ hashInputs(inputs));
  const mats = Math.max(1, Math.floor(inputs.activeMats));
  const jobs = Math.max(0, Math.floor(inputs.nextBout - inputs.currentBout));
  const bars: TimelineBar[] = [];
  const nextFree: number[] = [];

  for (let m = 0; m < mats; m += 1) {
    const end = sampleBoutDuration(inputs.avgBoutTime, rng) * rng();
    nextFree[m] = end;
    bars.push({ mat: m, start: 0, end, isTarget: false, isCurrent: true });
  }

  let targetStart = 0;
  for (let j = 1; j <= jobs; j += 1) {
    let f = 0;
    for (let m = 1; m < mats; m += 1) if (nextFree[m] < nextFree[f]) f = m;
    const start = nextFree[f];
    const end = start + sampleBoutDuration(inputs.avgBoutTime, rng);
    const isTarget = j === jobs;
    bars.push({ mat: f, start, end, isTarget, isCurrent: false });
    nextFree[f] = end;
    if (isTarget) targetStart = start;
  }

  const horizon = Math.max(1, ...bars.map((b) => b.end));
  return { bars, mats, targetStart, horizon };
}

/** Bucket sorted samples for a histogram. */
export function histogram(samples: number[], bins = 32) {
  if (samples.length === 0) return { counts: [] as number[], min: 0, max: 1 };
  const min = samples[0];
  const max = Math.max(samples[samples.length - 1], min + 0.5);
  const counts = new Array<number>(bins).fill(0);
  const width = (max - min) / bins;
  for (const s of samples) {
    const i = Math.min(bins - 1, Math.floor((s - min) / width));
    counts[i] += 1;
  }
  return { counts, min, max };
}

export function formatMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '0';
  const rounded = Math.round(totalMinutes * 10) / 10;
  return String(rounded);
}

export function formatClock(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '0 min';
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

/** Wall-clock time `minutes` from now, like "10:42 AM". */
export function clockAt(minutes: number, from = Date.now()): string {
  return new Date(from + minutes * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
