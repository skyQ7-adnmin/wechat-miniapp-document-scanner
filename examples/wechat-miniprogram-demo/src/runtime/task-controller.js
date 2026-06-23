/**
 * src/runtime/task-controller.js — Async task lifecycle management.
 *
 * Prevents stale detection results from overwriting user adjustments.
 */

class TaskController {
  constructor() {
    this._currentId = 0;
  }

  /**
   * Start a new task. Invalidates any prior running tasks.
   * @returns {{ id:number, valid:function():boolean }}
   */
  start() {
    this._currentId += 1;
    const id = this._currentId;
    return {
      id,
      valid: () => this._currentId === id,
    };
  }

  /**
   * Invalidate all running tasks.
   */
  abort() {
    this._currentId += 1;
  }

  /**
   * Check if a task ID is still the current one.
   * @param {number} taskId
   * @returns {boolean}
   */
  isCurrent(taskId) {
    return taskId === this._currentId;
  }
}

/**
 * Create a detection task. Runs func and applies result only if task is still current.
 * @param {TaskController} controller
 * @param {Function} detectFn - async function returning detection result
 * @param {Function} onStart - called when detection starts
 * @param {Function} onResult - called with (result, task) if task still current
 * @param {Function} onError - called with (error) if task still current
 * @returns {object} task
 */
function createDetectionTask(controller, detectFn, onStart, onResult, onError) {
  const task = controller.start();
  if (onStart) onStart(task);
  detectFn()
    .then((result) => {
      if (controller.isCurrent(task.id) && onResult) onResult(result, task);
    })
    .catch((err) => {
      if (controller.isCurrent(task.id) && onError) onError(err);
    });
  return task;
}

module.exports = { TaskController, createDetectionTask };
