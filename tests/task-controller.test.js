/**
 * tests/task-controller.test.js — Tests for task controller
 */

const { TaskController, createDetectionTask } = require("../src/runtime/task-controller");

console.log("=== task-controller tests ===");

// 1. Basic task flow
function testBasicFlow() {
  const tc = new TaskController();
  const task1 = tc.start();
  console.assert(task1.valid(), "new task is valid");
  console.assert(tc.isCurrent(task1.id), "task is current");
  console.log("  ✅ basic flow");
}
testBasicFlow();

// 2. Task invalidation
function testInvalidation() {
  const tc = new TaskController();
  const task1 = tc.start();
  tc.abort();
  console.assert(!task1.valid(), "task invalid after abort");

  const task2 = tc.start();
  console.assert(task2.valid() && !task1.valid(), "new task valid, old invalid");
  console.log("  ✅ invalidation");
}
testInvalidation();

// 3. createDetectionTask with valid result
function testDetectionTaskResolves(done) {
  const tc = new TaskController();
  createDetectionTask(tc,
    () => Promise.resolve("result42"),
    (_task) => {},
    (result, task) => {
      console.assert(result === "result42", "result delivered");
      console.assert(task.valid(), "task still valid");
      console.log("  ✅ detection task resolves");
      done();
    },
    (_err) => {}
  );
}

// 4. createDetectionTask aborted before resolve
function testDetectionTaskAborted(done) {
  const tc = new TaskController();
  let resolved = false;
  createDetectionTask(tc,
    () => new Promise((r) => setTimeout(() => { resolved = true; r("late"); }, 100)),
    (_task) => {},
    (_result) => { console.log("  ❌ should not receive stale result"); done(); },
    (_err) => {}
  );
  tc.abort();
  setTimeout(() => {
    console.assert(resolved, "promise resolved");
    console.log("  ✅ detection task aborted");
    done();
  }, 200);
}

// Execute async tests and exit
let asyncCount = 0;
function done() { asyncCount++; if (asyncCount >= 2) { console.log("task-controller tests: PASS"); } }
testDetectionTaskResolves(done);
testDetectionTaskAborted(done);
