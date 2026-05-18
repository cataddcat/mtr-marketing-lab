import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildGraph,
  createSimulation,
  generateOntology,
  getComments,
  getPosts,
  getPrepareStatus,
  getRunStatus,
  getTaskStatus,
  prepareSimulation,
  startSimulation,
  stopSimulation,
  type MiroFishComment,
  type MiroFishPost,
} from '../lib/mirofish-client';
import type { AdIdea } from '../services/marketing-agent';

export type SimStage =
  | 'idle'
  | 'seed_uploading'      // POST ontology/generate
  | 'graph_building'      // polling graph build task
  | 'sim_creating'        // POST simulation/create
  | 'sim_preparing'       // POST simulation/prepare + poll
  | 'sim_starting'        // POST simulation/start
  | 'sim_running'         // polling run-status
  | 'sim_done'            // posts + comments fetched
  | 'error'
  | 'cancelled';

export interface SimState {
  stage: SimStage;
  message: string;
  progressPercent: number;          // 0-100, only meaningful during graph_building / sim_running
  projectId: string | null;
  simulationId: string | null;
  graphTaskId: string | null;
  prepareTaskId: string | null;
  posts: readonly MiroFishPost[];
  comments: readonly MiroFishComment[];
  totalActions: number;
  error: string | null;
}

const INITIAL: SimState = {
  stage: 'idle',
  message: '',
  progressPercent: 0,
  projectId: null,
  simulationId: null,
  graphTaskId: null,
  prepareTaskId: null,
  posts: [],
  comments: [],
  totalActions: 0,
  error: null,
};

const POLL_GRAPH_MS = 3000;
const POLL_PREPARE_MS = 3000;
const POLL_RUN_MS = 3000;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError';

export interface StartSimArgs {
  simulationRequirement: string;
  seedText?: string;
  projectName?: string;
  /** When supplied, the ad is appended to the seed text as the focus event. */
  ad?: AdIdea;
  /** Cap simulation rounds — default 24 (≈1 simulated day) to keep cost down for MVP. */
  maxRounds?: number;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

export interface UseMiroFishSim {
  readonly state: SimState;
  readonly start: (args: StartSimArgs) => Promise<void>;
  readonly cancel: () => void;
  readonly reset: () => void;
  readonly running: boolean;
}

export const useMiroFishSim = (): UseMiroFishSim => {
  const [state, setState] = useState<SimState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  // Tracks the latest sim id created in `start` so cancel() can hit the
  // backend's /stop endpoint even after the local AbortController fires.
  const activeSimIdRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const cancel = useCallback(() => {
    const simId = activeSimIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    if (simId) {
      // fire-and-forget: server may take a moment to wind down workers
      void stopSimulation(simId).catch(err =>
        console.warn('[useMiroFishSim] backend stop failed', err),
      );
    }
    setState(prev =>
      prev.stage === 'sim_done' || prev.stage === 'idle' || prev.stage === 'error'
        ? prev
        : { ...prev, stage: 'cancelled', message: 'ยกเลิกแล้ว — แจ้ง backend ให้หยุดด้วย' },
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    activeSimIdRef.current = null;
    setState(INITIAL);
  }, []);

  const start = useCallback(async (args: StartSimArgs) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      // ── Stage 1: upload seed + generate ontology ───────────────────
      setState({
        ...INITIAL,
        stage: 'seed_uploading',
        message: 'อัปโหลด seed และวิเคราะห์ ontology...',
      });

      const adAppendix = args.ad
        ? `

=== Ad ที่จะทดสอบกับชุมชน ===
Style: ${args.ad.style}
Copy:
${args.ad.copy}

Visual idea:
${args.ad.visual_idea}
`
        : '';

      const ontology = await generateOntology({
        simulationRequirement: args.simulationRequirement,
        seedText: `${args.seedText ?? ''}${adAppendix}`,
        projectName: args.projectName ?? `MTR Sim ${new Date().toISOString().slice(0, 16)}`,
        signal,
      });

      if (signal.aborted) return;
      setState(prev => ({
        ...prev,
        projectId: ontology.projectId,
        message: `Ontology พร้อม (${ontology.entityTypeCount} entity types · ${ontology.edgeTypeCount} edge types)`,
      }));

      // ── Stage 2: build graph + poll task ───────────────────────────
      setState(prev => ({
        ...prev,
        stage: 'graph_building',
        message: 'กำลังสร้าง community graph...',
      }));

      const build = await buildGraph({
        projectId: ontology.projectId,
        signal,
      });
      setState(prev => ({ ...prev, graphTaskId: build.taskId }));

      while (!signal.aborted) {
        const task = await getTaskStatus(build.taskId, signal);
        setState(prev => ({
          ...prev,
          progressPercent: Math.round(task.progress ?? 0),
          message: task.message ?? prev.message,
        }));
        if (task.status === 'completed') break;
        if (task.status === 'failed') {
          throw new Error(task.error ?? 'Graph build failed');
        }
        await sleep(POLL_GRAPH_MS, signal);
      }
      if (signal.aborted) return;

      // ── Stage 3: create simulation ─────────────────────────────────
      setState(prev => ({
        ...prev,
        stage: 'sim_creating',
        message: 'สร้าง simulation environment...',
        progressPercent: 0,
      }));

      const sim = await createSimulation({
        projectId: ontology.projectId,
        signal,
      });
      const simulationId = sim.simulation_id;
      activeSimIdRef.current = simulationId;
      setState(prev => ({ ...prev, simulationId }));

      // ── Stage 4: prepare profiles + poll ───────────────────────────
      setState(prev => ({
        ...prev,
        stage: 'sim_preparing',
        message: 'กำลัง generate agent profiles...',
      }));

      const prep = await prepareSimulation({
        simulationId,
        signal,
      });

      if (prep.alreadyPrepared) {
        setState(prev => ({ ...prev, message: 'พบ profiles ที่ prepare ไว้แล้ว — ข้ามขั้นนี้' }));
      } else if (prep.taskId) {
        setState(prev => ({ ...prev, prepareTaskId: prep.taskId }));
        while (!signal.aborted) {
          const status = await getPrepareStatus({
            simulationId,
            taskId: prep.taskId ?? undefined,
            signal,
          });
          setState(prev => ({
            ...prev,
            progressPercent: Math.round(status.progress),
            message: status.message ?? prev.message,
          }));
          if (status.status === 'ready' || status.status === 'completed') break;
          if (status.status === 'failed') {
            throw new Error(status.error ?? 'Prepare failed');
          }
          await sleep(POLL_PREPARE_MS, signal);
        }
      }
      if (signal.aborted) return;

      // ── Stage 5: start simulation ──────────────────────────────────
      setState(prev => ({
        ...prev,
        stage: 'sim_starting',
        message: 'สั่ง simulation เริ่มรัน...',
        progressPercent: 0,
      }));

      await startSimulation({
        simulationId,
        platform: 'parallel',
        maxRounds: args.maxRounds ?? 24,
        force: false,
        signal,
      });

      // ── Stage 6: poll run-status until finished ────────────────────
      setState(prev => ({
        ...prev,
        stage: 'sim_running',
        message: 'agents กำลังโต้ตอบในชุมชนเสมือน...',
      }));

      // Bounded idle-while-warming-up grace period (engine may report 'idle'
      // briefly before workers spin up). Past this we give up rather than
      // looping forever on a silently-crashed runner.
      const MAX_IDLE_GRACE_TICKS = 8; // 8 × POLL_RUN_MS ≈ 24s
      let idleTicks = 0;
      while (!signal.aborted) {
        const status = await getRunStatus(simulationId, signal);
        setState(prev => ({
          ...prev,
          progressPercent: Math.round(status.progressPercent),
          totalActions: status.totalActionsCount,
          message:
            status.totalRounds > 0
              ? `รอบที่ ${status.currentRound}/${status.totalRounds} · ${status.totalActionsCount} actions`
              : prev.message,
        }));
        const r = status.runnerStatus.toLowerCase();
        if (r === 'finished' || r === 'completed' || r === 'done' || r === 'stopped') {
          break;
        }
        if (r === 'idle') {
          if (status.totalActionsCount > 0) {
            // engine finished and returned to idle — treat as done
            break;
          }
          idleTicks += 1;
          if (idleTicks >= MAX_IDLE_GRACE_TICKS) {
            throw new Error(
              'Simulation engine remained idle — agents never produced actions. ตรวจ MiroFish logs.',
            );
          }
          await sleep(POLL_RUN_MS, signal);
          continue;
        }
        // any non-idle activity resets the grace counter
        idleTicks = 0;
        if (r === 'failed' || r === 'error') {
          throw new Error(`Simulation runner ${r}`);
        }
        await sleep(POLL_RUN_MS, signal);
      }
      if (signal.aborted) return;

      // ── Stage 7: fetch posts + comments ────────────────────────────
      setState(prev => ({
        ...prev,
        message: 'ดึง posts + comments...',
      }));

      const [redditPosts, twitterPosts] = await Promise.all([
        getPosts({ simulationId, platform: 'reddit', limit: 30, signal }).catch(() => ({
          total: 0,
          posts: [],
        })),
        getPosts({ simulationId, platform: 'twitter', limit: 30, signal }).catch(() => ({
          total: 0,
          posts: [],
        })),
      ]);
      const allPosts = [...redditPosts.posts, ...twitterPosts.posts];

      const { comments } = await getComments({
        simulationId,
        limit: 50,
        signal,
      }).catch(() => ({ comments: [] as MiroFishComment[] }));

      if (signal.aborted) return;
      setState(prev => ({
        ...prev,
        stage: 'sim_done',
        message: `เสร็จ · ${allPosts.length} posts · ${comments.length} comments`,
        progressPercent: 100,
        posts: allPosts,
        comments,
      }));
    } catch (err) {
      if (isAbortError(err)) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useMiroFishSim]', err);
      setState(prev => ({
        ...prev,
        stage: 'error',
        error: message,
        message: `ล้มเหลว: ${message}`,
      }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const running =
    state.stage !== 'idle' &&
    state.stage !== 'sim_done' &&
    state.stage !== 'error' &&
    state.stage !== 'cancelled';

  return { state, start, cancel, reset, running };
};

/** Best-effort cleanup that the cancel button can also trigger. */
export const stopSim = async (simulationId: string): Promise<void> => {
  try {
    await stopSimulation(simulationId);
  } catch (err) {
    console.warn('[stopSim] failed', err);
  }
};
