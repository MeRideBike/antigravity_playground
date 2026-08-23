/**
 * E2E Integration & DOM Lifecycle Test Suite
 * Self-contained Node.js integration tests verifying end-to-end server orchestration,
 * HTTP security headers, client DOM mutations, and theme persistence.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { MetricCalculator, safeStorage, initTrustedTypes } = require('./app.js');

test('E2E - Server Lifecycle & HTTP Security Headers Verification', async (t) => {
  // 1. Compile or verify server binary
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'server_test_e2e.exe' : 'server_test_e2e';
  const binaryPath = path.join(__dirname, binaryName);

  // Compile dedicated test binary
  await new Promise((resolve, reject) => {
    const buildProc = spawn('go', ['build', '-o', binaryPath, 'main.go'], { cwd: __dirname });
    buildProc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Go compilation failed with code ${code}`));
    });
  });

  // 2. Spawn server process on test port 8989
  const testPort = '8989';
  const serverProc = spawn(binaryPath, ['-port', testPort], { cwd: __dirname });

  // Wait for server to start listening
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    // 3. Test HTTP GET /index.html and verify OWASP ASVS Level 3 Security Headers
    await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/index.html`, (res) => {
        assert.strictEqual(res.statusCode, 200);
        
        // Assert Content-Type
        assert.strictEqual(res.headers['content-type'], 'text/html; charset=utf-8');
        
        // Assert Hardened CSP
        const csp = res.headers['content-security-policy'];
        assert.ok(csp, 'CSP header must be present');
        assert.ok(csp.includes("default-src 'self'"), "CSP must include default-src 'self'");
        assert.ok(csp.includes("require-trusted-types-for 'script'"), 'CSP must enforce Trusted Types');
        assert.ok(csp.includes("frame-ancestors 'none'"), "CSP must enforce frame-ancestors 'none'");

        // Assert Cross-Origin Isolation & Defense Headers
        assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
        assert.strictEqual(res.headers['x-frame-options'], 'DENY');
        assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
        assert.strictEqual(res.headers['cross-origin-opener-policy'], 'same-origin');
        assert.strictEqual(res.headers['cross-origin-resource-policy'], 'same-origin');

        resolve();
      }).on('error', reject);
    });

    // 4. Test HTTP GET /health API endpoint
    await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/health`, (res) => {
        assert.strictEqual(res.statusCode, 200);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const payload = JSON.parse(data);
          assert.strictEqual(payload.status, 'online');
          assert.ok(payload.uptime, 'Uptime must be present');
          resolve();
        });
      }).on('error', reject);
    });

    // 5. Test HTTP GET /api/telemetry API endpoint
    await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/api/telemetry`, (res) => {
        assert.strictEqual(res.statusCode, 200);
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const payload = JSON.parse(data);
          assert.strictEqual(payload.status, 'online');
          assert.ok(typeof payload.allocMB === 'number', 'allocMB must be numeric');
          assert.ok(typeof payload.goroutines === 'number', 'goroutines must be numeric');
          resolve();
        });
      }).on('error', reject);
    });

    // 6. Test Whitelist Enforcement: Block source code (.go) access
    await new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}/main.go`, (res) => {
        assert.strictEqual(res.statusCode, 404, 'Source code main.go must return 404 Not Found');
        resolve();
      }).on('error', reject);
    });
  } finally {
    // Gracefully terminate server
    serverProc.kill();
    // Clean up test binary
    const fs = require('node:fs');
    try {
      if (fs.existsSync(binaryPath)) fs.unlinkSync(binaryPath);
    } catch (_) {}
  }
});

test('E2E - Client DOM Lifecycle & State Simulation', () => {
  // 1. Initial State Baseline
  const initial = MetricCalculator.getBaseline();
  assert.strictEqual(initial.builds, 3);
  assert.strictEqual(initial.traffic, 142);
  assert.strictEqual(initial.memoryMB, 318);

  // 2. Traffic Spike Simulation
  const spiked = MetricCalculator.calculateSpike(() => 0.5);
  assert.strictEqual(spiked.traffic, 600); // 350 + 0.5 * 500 = 600
  assert.strictEqual(spiked.delta, 458);
  assert.strictEqual(spiked.tagClass, 'tag tag-success');

  // 3. Build Queue State Transitions
  let buildState = MetricCalculator.queueBuild(initial.builds, 10);
  assert.strictEqual(buildState.builds, 4);
  assert.strictEqual(buildState.buildTagText, 'Active: Running');

  buildState = MetricCalculator.completeBuild(buildState.builds, 10);
  assert.strictEqual(buildState.builds, 3);
  assert.strictEqual(buildState.buildTagText, 'Active: 3 remaining');

  buildState = MetricCalculator.failBuild(buildState.builds, 10);
  assert.strictEqual(buildState.builds, 2);
  assert.strictEqual(buildState.buildTagText, 'Warning: Build Failed');

  // 4. Memory Allocation Diagnostics
  const memAlloc = MetricCalculator.simulateMemoryChange(initial.memoryMB, 128);
  assert.strictEqual(memAlloc.memoryMB, 446);
  assert.strictEqual(memAlloc.tagClass, 'tag tag-purple');

  // 5. Activity Log FIFO & Event Formatting
  const event1 = { id: 101, type: 'success', tagText: 'Success', tagClass: 'tag tag-success', message: 'Build #101 passed', time: 'Just now' };
  const event2 = { id: 102, type: 'queued', tagText: 'Queued', tagClass: 'tag tag-warning', message: 'Build #102 queued', time: '1m ago' };
  const event3 = { id: 103, type: 'failed', tagText: 'Failed', tagClass: 'tag tag-danger', message: 'Build #103 failed', time: '2m ago' };

  let log = MetricCalculator.trimActivityLog([event1, event2, event3]);
  assert.strictEqual(log.length, 3);

  // 6. Diagnostic Snapshot Serialization
  const snapshot = MetricCalculator.generateDiagnosticSnapshot(
    {
      traffic: spiked.traffic,
      delta: spiked.delta,
      percentIncrease: spiked.percentIncrease,
      tagText: spiked.tagText,
      builds: buildState.builds,
      buildTagText: buildState.buildTagText,
      memoryMB: memAlloc.memoryMB,
      memoryTagText: memAlloc.memoryTagText,
      activityLog: log
    },
    { environment: 'test', theme: 'dark', serverStatus: 'online' }
  );

  assert.strictEqual(snapshot.metadata.application, "E.'s Dev Dashboard");
  assert.strictEqual(snapshot.metrics.traffic.current, 600);
  assert.strictEqual(snapshot.metrics.builds.active, 2);

  // 7. Markdown Report Rendering
  const mdReport = MetricCalculator.formatMarkdownReport(snapshot);
  assert.ok(mdReport.includes('# E.\'s Dev Dashboard - Diagnostic Telemetry Report'));
  assert.ok(mdReport.includes('| **API Requests** | 600 req/s |'));
});
