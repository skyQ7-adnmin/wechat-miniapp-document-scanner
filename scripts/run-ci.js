/**
 * scripts/run-ci.js — Cross-platform CI runner
 * Executes check, test, security in order. Fails fast.
 */
const { execSync } = require("child_process");

function run(label, cmd) {
  console.log(`\n=== ${label} ===`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ ${label} passed`);
  } catch (e) {
    console.error(`❌ ${label} FAILED`);
    process.exit(1);
  }
}

run("Check", "node -e \"require('./src/index.js');require('./src/detector/geometry');require('./src/detector/confidence');require('./src/crop/validate-points');require('./src/crop/coordinate-mapper');require('./src/runtime/task-controller');require('./src/runtime/timeout-controller');console.log('All modules OK')\"");
run("Test", "node --test tests/detector.test.js tests/geometry.test.js tests/coordinate-mapper.test.js tests/task-controller.test.js tests/init-flow.test.js");
run("Security", "node scripts/security-scan.js");
run("Demo verify", "node scripts/verify-demo.js");
console.log("\n🎉 All CI checks passed\n");
