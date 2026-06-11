/** Serializes Remotion renders — one at a time to avoid OOM. */
let chain = Promise.resolve();

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function withRenderLock(fn) {
  const run = chain.then(() => fn());
  chain = run.catch(() => {});
  return run;
}
