/**
 * In-process collector runner.
 *
 * On a fixed interval the runner evaluates enabled collectors whose next run is
 * due and invokes the ingestion service. This keeps automated evidence
 * collection working without any external scheduler or additional infrastructure
 * - it is simply a timer inside the existing Node process.
 */

const collectorService = require('./collector.service');

let timer = null;
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Sweeps for due collectors. Errors are logged but never crash the process.
 * @returns {Promise<void>}
 */
async function sweep() {
  try {
    await collectorService.runDueCollectors();
  } catch (err) {
    console.error(`Collector runner sweep failed: ${err.message}`);
  }
}

/**
 * Starts the recurring sweep. Safe to call multiple times (idempotent).
 * @returns {void}
 */
function startCollectorRunner() {
  if (timer) return;
  timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Trigger an initial sweep shortly after startup.
  setTimeout(sweep, 5000);
}

/**
 * Stops the recurring sweep (used by tests and graceful shutdown).
 * @returns {void}
 */
function stopCollectorRunner() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startCollectorRunner, stopCollectorRunner };
