export { MANAGER_CONFIG } from './manager.js';
export { PM_CONFIG } from './pm.js';
export { CRITIC_CONFIG } from './critic.js';
export { DESIGNER_CONFIG } from './designer.js';
export { DEVELOPER_CONFIG } from './developer.js';
export { REVIEWER_CONFIG } from './reviewer.js';
export { QA_CONFIG } from './qa.js';

export {
  PIPELINE,
  executionOrder,
  pickUpMap,
  handoffMap,
  pipelineFlow,
  buildHandoffGuide,
  getEntry,
  type PipelineEntry,
} from './pipeline.js';

import { PIPELINE } from './pipeline.js';

/**
 * Back-compat shape used by factory.ts, dashboard.ts, events.ts.
 * Prefer importing PIPELINE directly.
 */
export const ALL_AGENTS = PIPELINE.map(e => ({
  role: e.role,
  name: e.name,
  title: e.title,
  systemPrompt: e.systemPrompt,
}));
