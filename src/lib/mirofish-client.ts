import * as v from 'valibot';

const MIROFISH_URL = (import.meta.env.VITE_MIROFISH_URL ?? '').replace(/\/+$/, '');

export const isMiroFishConfigured = (): boolean => MIROFISH_URL.length > 0;

export class MiroFishError extends Error {
  readonly status?: number;
  readonly detail?: unknown;
  readonly traceback?: string;

  constructor(message: string, status?: number, detail?: unknown, traceback?: string) {
    super(message);
    this.name = 'MiroFishError';
    this.status = status;
    this.detail = detail;
    this.traceback = traceback;
  }
}

// ════════════════════════════════════════════════════════════════════
// Response envelopes
// ════════════════════════════════════════════════════════════════════

const EnvelopeOk = <T extends v.GenericSchema>(data: T) =>
  v.object({
    success: v.literal(true),
    data,
  });

// Some MiroFish endpoints (notably /interview/all) return a third envelope
// shape when the subprocess fails: `success: false` at the top level but
// the error message + status are nested inside `data` rather than at the
// top level. EnvelopeErr is permissive enough to catch this — `error` is
// nullish — and the unwrap helper digs into data.error if needed.
const EnvelopeErr = v.looseObject({
  success: v.literal(false),
  error: v.nullish(v.string()),
  traceback: v.nullish(v.string()),
  data: v.nullish(v.unknown()),
});

const extractNestedError = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const obj = payload as Record<string, unknown>;
  // Common shapes (in priority):
  //   { data: { error: "..." } }
  //   { data: { message: "..." } }
  //   { message: "..." }
  if (obj.data && typeof obj.data === 'object') {
    const nested = obj.data as Record<string, unknown>;
    if (typeof nested.error === 'string' && nested.error) return nested.error;
    if (typeof nested.message === 'string' && nested.message) return nested.message;
  }
  if (typeof obj.message === 'string' && obj.message) return obj.message;
  return undefined;
};

const unwrap = async <T,>(
  res: Response,
  okSchema: v.GenericSchema<unknown, T>,
): Promise<T> => {
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new MiroFishError(
      `MiroFish returned non-JSON (status ${res.status})`,
      res.status,
    );
  }

  const errParsed = v.safeParse(EnvelopeErr, payload);
  if (errParsed.success) {
    // Prefer top-level error; fall back to nested data.error (the shape
    // /interview/all uses when the IPC subprocess fails).
    const errorMsg =
      errParsed.output.error ??
      extractNestedError(payload) ??
      `MiroFish reported failure (HTTP ${res.status}) but did not include an error message`;
    throw new MiroFishError(
      errorMsg,
      res.status,
      payload,
      errParsed.output.traceback ?? undefined,
    );
  }

  if (!res.ok) {
    throw new MiroFishError(
      `MiroFish HTTP ${res.status}`,
      res.status,
      payload,
    );
  }

  const okParsed = v.safeParse(okSchema, payload);
  if (!okParsed.success) {
    // Pre-flatten the issues so the browser console + thrown message
    // surface the actual mismatch path/expected/received instead of an
    // unexpanded "Array(1) Object". Past sessions wasted multiple
    // round-trips waiting for Cat to expand the dev-tools dropdown.
    const issueSummaries = okParsed.issues.map(issue => {
      const path = (issue.path ?? [])
        .map((seg: { key?: unknown }) =>
          seg.key === undefined ? '?' : String(seg.key),
        )
        .join('.');
      return `at "${path}": expected ${issue.expected}, received ${issue.received}`;
    });
    console.error('[mirofish] schema mismatch:\n  ' + issueSummaries.join('\n  '));
    console.error('[mirofish] full payload:', payload);
    throw new MiroFishError(
      `MiroFish response did not match schema — ${issueSummaries.join('; ')}`,
      res.status,
      payload,
    );
  }
  return okParsed.output;
};

const jsonRequest = async <T,>(
  path: string,
  body: unknown,
  method: 'POST' | 'PUT' = 'POST',
  okSchema: v.GenericSchema<unknown, T>,
  signal?: AbortSignal,
): Promise<T> => {
  if (!MIROFISH_URL) throw new MiroFishError('VITE_MIROFISH_URL is not configured');
  const res = await fetch(`${MIROFISH_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  return unwrap(res, okSchema);
};

const getRequest = async <T,>(
  path: string,
  okSchema: v.GenericSchema<unknown, T>,
  signal?: AbortSignal,
): Promise<T> => {
  if (!MIROFISH_URL) throw new MiroFishError('VITE_MIROFISH_URL is not configured');
  const res = await fetch(`${MIROFISH_URL}${path}`, { signal });
  return unwrap(res, okSchema);
};

// ════════════════════════════════════════════════════════════════════
// Health
// ════════════════════════════════════════════════════════════════════

const HealthSchema = v.object({
  status: v.string(),
  service: v.nullish(v.string()),
});

export const healthCheck = async (signal?: AbortSignal): Promise<{ status: string }> => {
  if (!MIROFISH_URL) throw new MiroFishError('VITE_MIROFISH_URL is not configured');
  const res = await fetch(`${MIROFISH_URL}/health`, { signal });
  const data: unknown = await res.json();
  const parsed = v.safeParse(HealthSchema, data);
  if (!parsed.success) throw new MiroFishError('Unexpected /health response');
  return { status: parsed.output.status };
};

// ════════════════════════════════════════════════════════════════════
// Graph: ontology generation (upload seed) + build
// ════════════════════════════════════════════════════════════════════

// Each entity_type in the ontology has at minimum a `name` field; backend
// also returns description, attributes, etc. which we don't need here.
const OntologyResponseSchema = EnvelopeOk(
  v.object({
    project_id: v.string(),
    project_name: v.nullish(v.string()),
    ontology: v.object({
      entity_types: v.array(v.looseObject({ name: v.string() })),
      edge_types: v.array(v.unknown()),
    }),
    analysis_summary: v.nullish(v.string()),
    files: v.array(v.unknown()),
    total_text_length: v.nullish(v.number()),
  }),
);

export interface OntologyResult {
  projectId: string;
  projectName?: string;
  /** Entity type names extracted from the ontology. Pass these straight
   *  into prepareSimulation() so the backend knows which graph entities
   *  to spawn agent profiles for — omitting them causes prepare to run
   *  to "task complete" but leave the simulation in a `failed` state
   *  (entity_types defaults to empty set on the backend, yielding zero
   *  profiles, yielding no simulation_config.json). */
  entityTypes: readonly string[];
  entityTypeCount: number;
  edgeTypeCount: number;
  analysisSummary: string;
  textLength: number;
}

/**
 * Step 1 of MiroFish pipeline. Uploads seed text (and/or files) plus a
 * simulation requirement → MiroFish creates a project + extracts ontology.
 */
export const generateOntology = async (params: {
  simulationRequirement: string;
  seedText?: string; // wrapped as a synthetic seed.txt file
  files?: readonly File[];
  projectName?: string;
  additionalContext?: string;
  signal?: AbortSignal;
}): Promise<OntologyResult> => {
  if (!MIROFISH_URL) throw new MiroFishError('VITE_MIROFISH_URL is not configured');

  const form = new FormData();
  form.append('simulation_requirement', params.simulationRequirement);
  if (params.projectName) form.append('project_name', params.projectName);
  if (params.additionalContext) form.append('additional_context', params.additionalContext);

  if (params.seedText && params.seedText.trim().length > 0) {
    const blob = new Blob([params.seedText], { type: 'text/plain' });
    form.append('files', new File([blob], 'seed.txt', { type: 'text/plain' }));
  }
  for (const f of params.files ?? []) {
    form.append('files', f);
  }

  const res = await fetch(`${MIROFISH_URL}/api/graph/ontology/generate`, {
    method: 'POST',
    body: form,
    signal: params.signal,
  });
  const env = await unwrap(res, OntologyResponseSchema);
  const entityTypes = env.data.ontology.entity_types.map(et => et.name);
  return {
    projectId: env.data.project_id,
    projectName: env.data.project_name ?? undefined,
    entityTypes,
    entityTypeCount: entityTypes.length,
    edgeTypeCount: env.data.ontology.edge_types.length,
    analysisSummary: env.data.analysis_summary ?? '',
    textLength: env.data.total_text_length ?? 0,
  };
};

const BuildGraphResponseSchema = EnvelopeOk(
  v.object({
    project_id: v.string(),
    task_id: v.string(),
    message: v.nullish(v.string()),
  }),
);

export const buildGraph = async (params: {
  projectId: string;
  graphName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  force?: boolean;
  signal?: AbortSignal;
}): Promise<{ projectId: string; taskId: string }> => {
  const env = await jsonRequest(
    '/api/graph/build',
    {
      project_id: params.projectId,
      graph_name: params.graphName,
      chunk_size: params.chunkSize,
      chunk_overlap: params.chunkOverlap,
      force: params.force,
    },
    'POST',
    BuildGraphResponseSchema,
    params.signal,
  );
  return { projectId: env.data.project_id, taskId: env.data.task_id };
};

// Use looseObject so extra backend fields (task_type, created_at,
// updated_at, metadata, progress_detail …) don't trip the parser when
// the backend evolves. Use v.nullish() instead of v.optional() for
// fields whose backend value can legitimately be null — Python `None`
// serialises to JSON `null`, which v.optional() rejects.
const TaskSchema = v.looseObject({
  task_id: v.string(),
  // Backend's TaskStatus enum (models/task.py) emits 'processing', not 'running'.
  status: v.picklist(['pending', 'processing', 'completed', 'failed'] as const),
  progress: v.nullish(v.number()),
  message: v.nullish(v.string()),
  result: v.nullish(v.unknown()),
  error: v.nullish(v.string()),
});
export type MiroFishTask = v.InferOutput<typeof TaskSchema>;

const TaskResponseSchema = EnvelopeOk(TaskSchema);

export const getTaskStatus = async (taskId: string, signal?: AbortSignal): Promise<MiroFishTask> => {
  const env = await getRequest(`/api/graph/task/${encodeURIComponent(taskId)}`, TaskResponseSchema, signal);
  return env.data;
};

// ════════════════════════════════════════════════════════════════════
// Project lookup
// ════════════════════════════════════════════════════════════════════

const ProjectSchema = v.object({
  project_id: v.string(),
  name: v.nullish(v.string()),
  status: v.nullish(v.string()),
  graph_id: v.nullish(v.string()),
  created_at: v.nullish(v.string()),
});
export type MiroFishProject = v.InferOutput<typeof ProjectSchema>;

const ProjectListResponseSchema = EnvelopeOk(
  v.object({
    projects: v.array(ProjectSchema),
  }),
);

export const listProjects = async (signal?: AbortSignal): Promise<MiroFishProject[]> => {
  const env = await getRequest('/api/graph/project/list', ProjectListResponseSchema, signal);
  return env.data.projects;
};

const ProjectResponseSchema = EnvelopeOk(ProjectSchema);

export const getProject = async (projectId: string, signal?: AbortSignal): Promise<MiroFishProject> => {
  const env = await getRequest(
    `/api/graph/project/${encodeURIComponent(projectId)}`,
    ProjectResponseSchema,
    signal,
  );
  return env.data;
};

// ════════════════════════════════════════════════════════════════════
// Simulation lifecycle
// ════════════════════════════════════════════════════════════════════

const SimulationStateSchema = v.object({
  simulation_id: v.string(),
  project_id: v.nullish(v.string()),
  graph_id: v.nullish(v.string()),
  status: v.nullish(v.string()),
  enable_twitter: v.nullish(v.boolean()),
  enable_reddit: v.nullish(v.boolean()),
  created_at: v.nullish(v.string()),
});
export type SimulationState = v.InferOutput<typeof SimulationStateSchema>;

const CreateSimResponseSchema = EnvelopeOk(SimulationStateSchema);

export const createSimulation = async (params: {
  projectId: string;
  graphId?: string;
  enableTwitter?: boolean;
  enableReddit?: boolean;
  signal?: AbortSignal;
}): Promise<SimulationState> => {
  const env = await jsonRequest(
    '/api/simulation/create',
    {
      project_id: params.projectId,
      graph_id: params.graphId,
      enable_twitter: params.enableTwitter ?? true,
      enable_reddit: params.enableReddit ?? true,
    },
    'POST',
    CreateSimResponseSchema,
    params.signal,
  );
  return env.data;
};

const PrepareResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    task_id: v.nullish(v.string()),
    status: v.nullish(v.string()),
    message: v.nullish(v.string()),
    already_prepared: v.nullish(v.boolean()),
  }),
);

export const prepareSimulation = async (params: {
  simulationId: string;
  entityTypes?: readonly string[];
  useLlmForProfiles?: boolean;
  parallelProfileCount?: number;
  forceRegenerate?: boolean;
  signal?: AbortSignal;
}): Promise<{
  simulationId: string;
  taskId: string | null;
  alreadyPrepared: boolean;
  status: string;
  message?: string;
}> => {
  const env = await jsonRequest(
    '/api/simulation/prepare',
    {
      simulation_id: params.simulationId,
      entity_types: params.entityTypes,
      use_llm_for_profiles: params.useLlmForProfiles,
      parallel_profile_count: params.parallelProfileCount,
      force_regenerate: params.forceRegenerate,
    },
    'POST',
    PrepareResponseSchema,
    params.signal,
  );
  return {
    simulationId: env.data.simulation_id,
    taskId: env.data.task_id ?? null,
    alreadyPrepared: env.data.already_prepared ?? false,
    status: env.data.status ?? 'unknown',
    message: env.data.message ?? undefined,
  };
};

// Backend has four response shapes for /prepare/status:
//   1. sim already prepared          → has simulation_id
//   2. sim not started                → has simulation_id
//   3. task missing but sim prepared  → has simulation_id + task_id
//   4. task found, polling progress   → task.to_dict() — NO simulation_id
// Use looseObject + nullish so schema accepts all four; the helper falls
// back to params.simulationId when the backend omits it.
const PrepareStatusResponseSchema = EnvelopeOk(
  v.looseObject({
    simulation_id: v.nullish(v.string()),
    status: v.string(),
    progress: v.nullish(v.number()),
    message: v.nullish(v.string()),
    error: v.nullish(v.string()),
  }),
);

export const getPrepareStatus = async (
  params: { simulationId: string; taskId?: string; signal?: AbortSignal },
): Promise<{ status: string; progress: number; message?: string; error?: string }> => {
  const env = await jsonRequest(
    '/api/simulation/prepare/status',
    { simulation_id: params.simulationId, task_id: params.taskId },
    'POST',
    PrepareStatusResponseSchema,
    params.signal,
  );
  return {
    status: env.data.status,
    progress: env.data.progress ?? 0,
    // Coalesce JSON null → undefined at the client boundary so consumers
    // see a single "absent" shape regardless of whether the backend
    // serialised the field as null (Python None) or omitted it.
    message: env.data.message ?? undefined,
    error: env.data.error ?? undefined,
  };
};

const StartSimResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    runner_status: v.string(),
    process_pid: v.nullish(v.number()),
    twitter_running: v.nullish(v.boolean()),
    reddit_running: v.nullish(v.boolean()),
    started_at: v.nullish(v.string()),
    graph_memory_update_enabled: v.nullish(v.boolean()),
    force_restarted: v.nullish(v.boolean()),
  }),
);

export const startSimulation = async (params: {
  simulationId: string;
  platform?: 'twitter' | 'reddit' | 'parallel';
  maxRounds?: number;
  enableGraphMemoryUpdate?: boolean;
  force?: boolean;
  signal?: AbortSignal;
}): Promise<{ runnerStatus: string; pid?: number }> => {
  const env = await jsonRequest(
    '/api/simulation/start',
    {
      simulation_id: params.simulationId,
      platform: params.platform ?? 'parallel',
      max_rounds: params.maxRounds,
      enable_graph_memory_update: params.enableGraphMemoryUpdate ?? false,
      force: params.force ?? false,
    },
    'POST',
    StartSimResponseSchema,
    params.signal,
  );
  return { runnerStatus: env.data.runner_status, pid: env.data.process_pid ?? undefined };
};

const RunStatusResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    runner_status: v.string(),
    current_round: v.nullish(v.number()),
    total_rounds: v.nullish(v.number()),
    progress_percent: v.nullish(v.number()),
    simulated_hours: v.nullish(v.number()),
    total_simulation_hours: v.nullish(v.number()),
    twitter_running: v.nullish(v.boolean()),
    reddit_running: v.nullish(v.boolean()),
    twitter_actions_count: v.nullish(v.number()),
    reddit_actions_count: v.nullish(v.number()),
    total_actions_count: v.nullish(v.number()),
    started_at: v.nullish(v.string()),
    updated_at: v.nullish(v.string()),
  }),
);

export interface RunStatus {
  simulationId: string;
  runnerStatus: string;
  currentRound: number;
  totalRounds: number;
  progressPercent: number;
  twitterActionsCount: number;
  redditActionsCount: number;
  totalActionsCount: number;
}

export const getRunStatus = async (
  simulationId: string,
  signal?: AbortSignal,
): Promise<RunStatus> => {
  const env = await getRequest(
    `/api/simulation/${encodeURIComponent(simulationId)}/run-status`,
    RunStatusResponseSchema,
    signal,
  );
  const d = env.data;
  return {
    simulationId: d.simulation_id,
    runnerStatus: d.runner_status,
    currentRound: d.current_round ?? 0,
    totalRounds: d.total_rounds ?? 0,
    progressPercent: d.progress_percent ?? 0,
    twitterActionsCount: d.twitter_actions_count ?? 0,
    redditActionsCount: d.reddit_actions_count ?? 0,
    totalActionsCount: d.total_actions_count ?? 0,
  };
};

const StopSimResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    runner_status: v.string(),
  }),
);

export const stopSimulation = async (
  simulationId: string,
  signal?: AbortSignal,
): Promise<{ runnerStatus: string }> => {
  const env = await jsonRequest(
    '/api/simulation/stop',
    { simulation_id: simulationId },
    'POST',
    StopSimResponseSchema,
    signal,
  );
  return { runnerStatus: env.data.runner_status };
};

// ════════════════════════════════════════════════════════════════════
// Sim output: posts + comments
// ════════════════════════════════════════════════════════════════════

const PostSchema = v.looseObject({
  post_id: v.nullish(v.union([v.string(), v.number()])),
  user_id: v.nullish(v.union([v.string(), v.number()])),
  content: v.nullish(v.string()),
  num_likes: v.nullish(v.number()),
  num_dislikes: v.nullish(v.number()),
  num_shares: v.nullish(v.number()),
  created_at: v.nullish(v.string()),
});
export type MiroFishPost = v.InferOutput<typeof PostSchema>;

const PostsResponseSchema = EnvelopeOk(
  v.object({
    platform: v.nullish(v.string()),
    total: v.nullish(v.number()),
    count: v.number(),
    posts: v.array(PostSchema),
    message: v.nullish(v.string()),
  }),
);

export const getPosts = async (params: {
  simulationId: string;
  platform?: 'twitter' | 'reddit';
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<{ total: number; posts: MiroFishPost[] }> => {
  const qs = new URLSearchParams();
  if (params.platform) qs.set('platform', params.platform);
  qs.set('limit', String(params.limit ?? 50));
  qs.set('offset', String(params.offset ?? 0));
  const env = await getRequest(
    `/api/simulation/${encodeURIComponent(params.simulationId)}/posts?${qs.toString()}`,
    PostsResponseSchema,
    params.signal,
  );
  return { total: env.data.total ?? env.data.count, posts: env.data.posts };
};

const CommentSchema = v.looseObject({
  comment_id: v.nullish(v.union([v.string(), v.number()])),
  post_id: v.nullish(v.union([v.string(), v.number()])),
  user_id: v.nullish(v.union([v.string(), v.number()])),
  content: v.nullish(v.string()),
  num_likes: v.nullish(v.number()),
  created_at: v.nullish(v.string()),
});
export type MiroFishComment = v.InferOutput<typeof CommentSchema>;

const CommentsResponseSchema = EnvelopeOk(
  v.object({
    count: v.number(),
    comments: v.array(CommentSchema),
  }),
);

export const getComments = async (params: {
  simulationId: string;
  postId?: string | number;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<{ comments: MiroFishComment[] }> => {
  const qs = new URLSearchParams();
  if (params.postId !== undefined) qs.set('post_id', String(params.postId));
  qs.set('limit', String(params.limit ?? 50));
  qs.set('offset', String(params.offset ?? 0));
  const env = await getRequest(
    `/api/simulation/${encodeURIComponent(params.simulationId)}/comments?${qs.toString()}`,
    CommentsResponseSchema,
    params.signal,
  );
  return { comments: env.data.comments };
};

// ════════════════════════════════════════════════════════════════════
// Interview — for Sprint M2/M3
// ════════════════════════════════════════════════════════════════════

const InterviewResponseSchema = EnvelopeOk(
  v.object({
    agent_id: v.nullish(v.union([v.string(), v.number()])),
    prompt: v.nullish(v.string()),
    result: v.unknown(),
    timestamp: v.nullish(v.string()),
  }),
);

export interface InterviewResult {
  agentId: string | number;
  prompt?: string;
  result: unknown;
  timestamp?: string;
}

export const interviewAgent = async (params: {
  simulationId: string;
  agentId: number;
  prompt: string;
  platform?: 'twitter' | 'reddit';
  timeoutSec?: number;
  signal?: AbortSignal;
}): Promise<InterviewResult> => {
  const env = await jsonRequest(
    '/api/simulation/interview',
    {
      simulation_id: params.simulationId,
      agent_id: params.agentId,
      prompt: params.prompt,
      platform: params.platform,
      timeout: params.timeoutSec ?? 60,
    },
    'POST',
    InterviewResponseSchema,
    params.signal,
  );
  return {
    agentId: env.data.agent_id ?? params.agentId,
    prompt: env.data.prompt ?? undefined,
    result: env.data.result,
    timestamp: env.data.timestamp ?? undefined,
  };
};

// Backend `data` shape for /interview/all (from simulation_runner.interview_agents_batch):
//   {
//     success: true,
//     interviews_count: N,
//     result: {
//       interviews_count: N,
//       results: {
//         "twitter_0": { agent_id, response, platform },   // dict, NOT list
//         "reddit_0":  { ... },
//         ...
//       }
//     },
//     timestamp: "..."
//   }
// Use looseObject + v.record for the dict-shaped results map.
const InterviewAllResponseSchema = EnvelopeOk(
  v.looseObject({
    success: v.nullish(v.boolean()),
    interviews_count: v.nullish(v.number()),
    timestamp: v.nullish(v.string()),
    result: v.nullish(
      v.looseObject({
        interviews_count: v.nullish(v.number()),
        // Map of "<platform>_<agent_id>" → { agent_id, response, platform }.
        // Treat each entry as unknown; consumer parses .response payload.
        results: v.nullish(v.record(v.string(), v.unknown())),
      }),
    ),
  }),
);

export const interviewAll = async (params: {
  simulationId: string;
  prompt: string;
  platform?: 'twitter' | 'reddit';
  timeoutSec?: number;
  signal?: AbortSignal;
}): Promise<{ count: number; results: unknown[] }> => {
  const env = await jsonRequest(
    '/api/simulation/interview/all',
    {
      simulation_id: params.simulationId,
      prompt: params.prompt,
      platform: params.platform,
      timeout: params.timeoutSec ?? 300,
    },
    'POST',
    InterviewAllResponseSchema,
    params.signal,
  );
  // Flatten the dict-of-entries into a plain array — community-sim.ts
  // parses each entry independently and doesn't care about platform
  // ordering. Each entry is `{ agent_id, response, platform }` where
  // `response` is the agent's reply string (often itself JSON, parsed
  // downstream by parseInterview()).
  const resultsDict = env.data.result?.results ?? {};
  const flattened = Object.values(resultsDict);
  return {
    count: env.data.result?.interviews_count ?? env.data.interviews_count ?? flattened.length,
    results: flattened,
  };
};

export const miroFishUrl = (): string => MIROFISH_URL;
