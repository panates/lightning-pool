import type { ScenarioMeta, ScenarioName } from '../types.js';
import { ACQUIRE_RELEASE_SCENARIO } from './acquire-release.js';
import { ACQUIRE_RELEASE_CONCURRENT_SCENARIO } from './acquire-release-concurrent.js';
import { CREATE_DESTROY_CHURN_SCENARIO } from './create-destroy-churn.js';
import { QUEUE_CONTENTION_SCENARIO } from './queue-contention.js';
import { VALIDATE_ON_BORROW_SCENARIO } from './validate-on-borrow.js';

export const SCENARIOS: Record<ScenarioName, ScenarioMeta> = {
  'acquire-release': ACQUIRE_RELEASE_SCENARIO,
  'acquire-release-concurrent': ACQUIRE_RELEASE_CONCURRENT_SCENARIO,
  'queue-contention': QUEUE_CONTENTION_SCENARIO,
  'create-destroy-churn': CREATE_DESTROY_CHURN_SCENARIO,
  'validate-on-borrow': VALIDATE_ON_BORROW_SCENARIO,
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS) as ScenarioName[];

export function isScenarioName(value: string): value is ScenarioName {
  return Object.prototype.hasOwnProperty.call(SCENARIOS, value);
}

export * from './acquire-release.js';
export * from './acquire-release-concurrent.js';
export * from './create-destroy-churn.js';
export * from './queue-contention.js';
export * from './validate-on-borrow.js';
