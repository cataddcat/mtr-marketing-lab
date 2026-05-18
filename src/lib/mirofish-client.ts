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

const EnvelopeErr = v.object({
  success: v.literal(false),
  error: v.string(),
  traceback: v.optional(v.string()),
});

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
    throw new MiroFishError(
      errParsed.output.error,
      res.status,
      payload,
      errParsed.output.traceback,
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
    console.error('[mirofish] schema mismatch', okParsed.issues, payload);
    throw new MiroFishError(
      'MiroFish response did not match schema',
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
  service: v.optional(v.string()),
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

const OntologyResponseSchema = EnvelopeOk(
  v.object({
    project_id: v.string(),
    project_name: v.optional(v.string()),
    ontology: v.object({
      entity_types: v.array(v.unknown()),
      edge_types: v.array(v.unknown()),
    }),
    analysis_summary: v.optional(v.string()),
    files: v.array(v.unknown()),
    total_text_length: v.optional(v.number()),
  }),
);

export interface OntologyResult {
  projectId: string;
  projectName?: string;
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
  return {
    projectId: env.data.project_id,
    projectName: env.data.project_name,
    entityTypeCount: env.data.ontology.entity_types.length,
    edgeTypeCount: env.data.ontology.edge_types.length,
    analysisSummary: env.data.analysis_summary ?? '',
    textLength: env.data.total_text_length ?? 0,
  };
};

const BuildGraphResponseSchema = EnvelopeOk(
  v.object({
    project_id: v.string(),
    task_id: v.string(),
    message: v.optional(v.string()),
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

const TaskSchema = v.object({
  task_id: v.string(),
  // Backend uses 'processing' (not 'running'); see models/task.py TaskStatus.
  // task_type/created_at/updated_at/metadata/progress_detail are also returned
  // but the frontend doesn't need them — use looseObject so future backend
  // additions don't break this client.
  status: v.picklist(['pending', 'processing', 'completed', 'failed'] as const),
  progress: v.optional(v.number()),
  message: v.optional(v.string()),
  result: v.optional(v.unknown()),
  error: v.optional(v.string()),
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
  name: v.optional(v.string()),
  status: v.optional(v.string()),
  graph_id: v.optional(v.nullable(v.string())),
  created_at: v.optional(v.string()),
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
  project_id: v.optional(v.string()),
  graph_id: v.optional(v.string()),
  status: v.optional(v.string()),
  enable_twitter: v.optional(v.boolean()),
  enable_reddit: v.optional(v.boolean()),
  created_at: v.optional(v.string()),
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
    task_id: v.optional(v.string()),
    status: v.optional(v.string()),
    message: v.optional(v.string()),
    already_prepared: v.optional(v.boolean()),
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
    message: env.data.message,
  };
};

const PrepareStatusResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    status: v.string(),
    progress: v.optional(v.number()),
    message: v.optional(v.string()),
    error: v.optional(v.string()),
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
    message: env.data.message,
    error: env.data.error,
  };
};

const StartSimResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    runner_status: v.string(),
    process_pid: v.optional(v.number()),
    twitter_running: v.optional(v.boolean()),
    reddit_running: v.optional(v.boolean()),
    started_at: v.optional(v.string()),
    graph_memory_update_enabled: v.optional(v.boolean()),
    force_restarted: v.optional(v.boolean()),
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
  return { runnerStatus: env.data.runner_status, pid: env.data.process_pid };
};

const RunStatusResponseSchema = EnvelopeOk(
  v.object({
    simulation_id: v.string(),
    runner_status: v.string(),
    current_round: v.optional(v.number()),
    total_rounds: v.optional(v.number()),
    progress_percent: v.optional(v.number()),
    simulated_hours: v.optional(v.number()),
    total_simulation_hours: v.optional(v.number()),
    twitter_running: v.optional(v.boolean()),
    reddit_running: v.optional(v.boolean()),
    twitter_actions_count: v.optional(v.number()),
    reddit_actions_count: v.optional(v.number()),
    total_actions_count: v.optional(v.number()),
    started_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
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
  post_id: v.optional(v.union([v.string(), v.number()])),
  user_id: v.optional(v.union([v.string(), v.number()])),
  content: v.optional(v.string()),
  num_likes: v.optional(v.number()),
  num_dislikes: v.optional(v.number()),
  num_shares: v.optional(v.number()),
  created_at: v.optional(v.string()),
});
export type MiroFishPost = v.InferOutput<typeof PostSchema>;

const PostsResponseSchema = EnvelopeOk(
  v.object({
    platform: v.optional(v.string()),
    total: v.optional(v.number()),
    count: v.number(),
    posts: v.array(PostSchema),
    message: v.optional(v.string()),
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
  comment_id: v.optional(v.union([v.string(), v.number()])),
  post_id: v.optional(v.union([v.string(), v.number()])),
  user_id: v.optional(v.union([v.string(), v.number()])),
  content: v.optional(v.string()),
  num_likes: v.optional(v.number()),
  created_at: v.optional(v.string()),
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
    agent_id: v.optional(v.union([v.string(), v.number()])),
    prompt: v.optional(v.string()),
    result: v.unknown(),
    timestamp: v.optional(v.string()),
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
    prompt: env.data.prompt,
    result: env.data.result,
    timestamp: env.data.timestamp,
  };
};

const InterviewAllResponseSchema = EnvelopeOk(
  v.object({
    interviews_count: v.optional(v.number()),
    results: v.optional(v.array(v.unknown())),
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
  return {
    count: env.data.interviews_count ?? (env.data.results?.length ?? 0),
    results: env.data.results ?? [],
  };
};

export const miroFishUrl = (): string => MIROFISH_URL;
