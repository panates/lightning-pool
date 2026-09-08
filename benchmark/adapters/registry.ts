import type { LibId } from '../types.js';
import type { Adapter } from './adapter.js';

/**
 * Dynamic-import map so adding another library later doesn't require
 * touching every caller - just a new loader entry and a new LibId.
 */
// Order matters: ALL_LIB_IDS (below) drives the default --lib=all run
// order, and whichever library runs first in a given process/scenario
// tends to look slower/noisier (process/CPU warm-up, not a real code
// difference). generic-pool runs first so lightning-pool - the library
// this benchmark exists to evaluate - isn't the one absorbing that bias
// by default.
const ADAPTER_LOADERS: Record<LibId, () => Promise<Adapter>> = {
  'generic-pool': async () =>
    (await import('./generic-pool.adapter.js')).genericPoolAdapter,
  'lightning-pool': async () =>
    (await import('./lightning-pool.adapter.js')).lightningPoolAdapter,
};

export const ALL_LIB_IDS = Object.keys(ADAPTER_LOADERS) as LibId[];

export function isLibId(value: string): value is LibId {
  return Object.prototype.hasOwnProperty.call(ADAPTER_LOADERS, value);
}

export async function loadAdapter(id: LibId): Promise<Adapter> {
  const loader = ADAPTER_LOADERS[id];
  if (!loader) throw new Error(`Unknown benchmark adapter "${id}"`);
  return loader();
}
