const test = require('node:test');
const assert = require('node:assert');
const { MetricCalculator, safeStorage, initTrustedTypes } = require('./app.js');

test('MetricCalculator - baseline values are correct', () => {
  const baseline = MetricCalculator.getBaseline();
  assert.strictEqual(baseline.traffic, 142);
  assert.strictEqual(baseline.delta, 0);
  assert.strictEqual(baseline.percentIncrease, 0);
  assert.strictEqual(baseline.tagText, '+12% vs avg');
  assert.strictEqual(baseline.builds, 3);
  assert.strictEqual(baseline.buildTagClass, 'tag tag-info');
  assert.strictEqual(baseline.memoryMB, 318);
  assert.strictEqual(baseline.memoryTagText, 'Limit: 1024 MB');
});

test('MetricCalculator - spike generates values strictly within min and max boundaries', () => {
  const minResult = MetricCalculator.calculateSpike(() => 0);
  assert.strictEqual(minResult.traffic, 350);
  assert.strictEqual(minResult.delta, 350 - 142);
  assert.strictEqual(minResult.percentIncrease, Math.round(((350 - 142) / 142) * 100));

  const maxResult = MetricCalculator.calculateSpike(() => 0.999999);
  assert.strictEqual(maxResult.traffic, 850);
  assert.strictEqual(maxResult.delta, 850 - 142);
  assert.strictEqual(maxResult.percentIncrease, Math.round(((850 - 142) / 142) * 100));

  for (let i = 0; i < 100; i++) {
    const result = MetricCalculator.calculateSpike();
    assert.ok(result.traffic >= 350 && result.traffic <= 850, `Traffic ${result.traffic} out of range [350, 850]`);
    assert.strictEqual(result.delta, result.traffic - 142);
    assert.strictEqual(result.percentIncrease, Math.round(((result.traffic - 142) / 142) * 100));
    assert.strictEqual(result.tagText, `+${result.percentIncrease}% spike`);
  }
});

test('MetricCalculator - build pipeline state transitions & boundaries', () => {
  let current = 3;
  let res = MetricCalculator.queueBuild(current, 104, '12:00:00 PM');
  assert.strictEqual(res.builds, 4);
  assert.strictEqual(res.logEntry.type, 'queued');
  assert.strictEqual(res.logEntry.tagClass, 'tag tag-warning');
  assert.ok(res.logEntry.message.includes('104'));

  current = 10;
  res = MetricCalculator.queueBuild(current, 105, '12:01:00 PM');
  assert.strictEqual(res.builds, 10);
  assert.strictEqual(res.buildTagText, 'Queue Full (10 max)');

  current = 1;
  res = MetricCalculator.completeBuild(current, 106, '12:02:00 PM');
  assert.strictEqual(res.builds, 0);
  assert.strictEqual(res.buildTagText, 'All Tasks Completed');
  assert.strictEqual(res.logEntry.type, 'success');
  assert.strictEqual(res.logEntry.tagClass, 'tag tag-success');

  current = 0;
  res = MetricCalculator.completeBuild(current, 107, '12:03:00 PM');
  assert.strictEqual(res.builds, 0);

  current = 2;
  res = MetricCalculator.failBuild(current, 108, '12:04:00 PM');
  assert.strictEqual(res.builds, 1);
  assert.strictEqual(res.logEntry.type, 'failed');
  assert.strictEqual(res.logEntry.tagClass, 'tag tag-danger');
});

test('MetricCalculator - formatBytes handles various byte magnitudes', () => {
  assert.strictEqual(MetricCalculator.formatBytes(0), '0 B');
  assert.strictEqual(MetricCalculator.formatBytes(512), '512 B');
  assert.strictEqual(MetricCalculator.formatBytes(1024), '1 KB');
  assert.strictEqual(MetricCalculator.formatBytes(1536), '1.5 KB');
  assert.strictEqual(MetricCalculator.formatBytes(1048576), '1 MB');
  assert.strictEqual(MetricCalculator.formatBytes(1073741824), '1 GB');
  assert.strictEqual(MetricCalculator.formatBytes(-10), '0 B');
  assert.strictEqual(MetricCalculator.formatBytes(null), '0 B');
});

test('MetricCalculator - parseTelemetry processes Go server runtime telemetry', () => {
  const sample = {
    status: 'online',
    allocMB: 4.8,
    sysMB: 12.2,
    numGC: 3,
    goroutines: 4,
    pid: 1234
  };
  const parsed = MetricCalculator.parseTelemetry(sample);
  assert.strictEqual(parsed.memoryMB, 4.8);
  assert.strictEqual(parsed.memoryUnit, 'MB');
  assert.strictEqual(parsed.tagText, 'Heap: 4.8 MB • GC: 3');
  assert.ok(parsed.details.includes('PID: 1234'));

  const fallback = MetricCalculator.parseTelemetry(null);
  assert.strictEqual(fallback.memoryMB, 318);
  assert.strictEqual(fallback.tagText, 'Limit: 1024 MB');
});

test('MetricCalculator - simulateMemoryChange computes delta and threshold tags', () => {
  const normal = MetricCalculator.simulateMemoryChange(300, 50);
  assert.strictEqual(normal.memoryMB, 350);
  assert.strictEqual(normal.tagClass, 'tag tag-purple');

  const warning = MetricCalculator.simulateMemoryChange(600, 100);
  assert.strictEqual(warning.memoryMB, 700);
  assert.strictEqual(warning.tagClass, 'tag tag-warning');

  const danger = MetricCalculator.simulateMemoryChange(850, 50);
  assert.strictEqual(danger.memoryMB, 900);
  assert.strictEqual(danger.tagClass, 'tag tag-danger');

  const maxClamped = MetricCalculator.simulateMemoryChange(1000, 100);
  assert.strictEqual(maxClamped.memoryMB, 1024);

  const minClamped = MetricCalculator.simulateMemoryChange(100, -200);
  assert.strictEqual(minClamped.memoryMB, 50);
});

test('MetricCalculator - generateDiagnosticSnapshot creates complete valid schema', () => {
  const mockState = {
    traffic: 520,
    delta: 378,
    percentIncrease: 266,
    tagText: '+266% spike',
    builds: 6,
    buildTagText: 'Active: Running',
    memoryMB: 450,
    memoryTagText: 'Heap: 450 MB • GC: 5',
    activityLog: [
      { id: 105, type: 'queued', tagText: 'Queued', message: 'Build #105 queued', time: '12:00:00 PM' }
    ]
  };

  const clientInfo = {
    theme: 'dark',
    userAgent: 'Mozilla/5.0 Test',
    serverStatus: 'Server: Online',
    environment: 'HTTP Server'
  };

  const snapshot = MetricCalculator.generateDiagnosticSnapshot(mockState, clientInfo);
  assert.strictEqual(snapshot.metadata.application, "E.'s Dev Dashboard");
  assert.strictEqual(snapshot.client.theme, 'dark');
  assert.strictEqual(snapshot.metrics.traffic.current, 520);
  assert.strictEqual(snapshot.metrics.builds.active, 6);
  assert.strictEqual(snapshot.metrics.memory.currentMB, 450);
  assert.strictEqual(snapshot.recentActivity.length, 1);
});

test('MetricCalculator - formatMarkdownReport outputs clean markdown table and items', () => {
  const mockSnapshot = {
    metadata: { timestamp: '2026-08-23T12:00:00Z' },
    server: { status: 'Online' },
    client: { theme: 'light' },
    metrics: {
      traffic: { current: 142, statusTag: '+12% vs avg' },
      builds: { active: 3, maxCapacity: 10, statusTag: 'Active' },
      memory: { currentMB: 318, limitMB: 1024, statusTag: 'Normal' }
    },
    recentActivity: [
      { time: '12:00:00 PM', tagText: 'Success', message: 'Build completed' }
    ]
  };

  const md = MetricCalculator.formatMarkdownReport(mockSnapshot);
  assert.ok(md.includes('# E.\'s Dev Dashboard - Diagnostic Telemetry Report'));
  assert.ok(md.includes('142 req/s'));
  assert.ok(md.includes('3 / 10'));
  assert.ok(md.includes('318 MB / 1024 MB'));
  assert.ok(md.includes('**[Success]** Build completed'));

  const emptyMd = MetricCalculator.formatMarkdownReport(null);
  assert.ok(emptyMd.includes('No telemetry data available'));
});

test('MetricCalculator - filterActivityLog filters by severity and search query', () => {
  const sampleLog = [
    { id: 101, type: 'queued', tagText: 'Queued', message: 'Build #101 queued for deployment', time: '10:00 AM' },
    { id: 102, type: 'success', tagText: 'Success', message: 'Build #102 completed successfully', time: '10:05 AM' },
    { id: 103, type: 'failed', tagText: 'Failed', message: 'Build #103 failed during tests', time: '10:10 AM' },
    { id: 104, type: 'success', tagText: 'GC Reclaim', message: 'Server Garbage Collection executed', time: '10:15 AM' }
  ];

  // 1. Filter by severity: all
  const allEvents = MetricCalculator.filterActivityLog(sampleLog, { severity: 'all' });
  assert.strictEqual(allEvents.length, 4);

  // 2. Filter by severity: queued
  const queuedEvents = MetricCalculator.filterActivityLog(sampleLog, { severity: 'queued' });
  assert.strictEqual(queuedEvents.length, 1);
  assert.strictEqual(queuedEvents[0].id, 101);

  // 3. Filter by severity: failed
  const failedEvents = MetricCalculator.filterActivityLog(sampleLog, { severity: 'failed' });
  assert.strictEqual(failedEvents.length, 1);
  assert.strictEqual(failedEvents[0].id, 103);

  // 4. Filter by text search: 'Garbage'
  const searchGC = MetricCalculator.filterActivityLog(sampleLog, { query: 'Garbage' });
  assert.strictEqual(searchGC.length, 1);
  assert.strictEqual(searchGC[0].id, 104);

  // 5. Filter by ID search: '102'
  const searchID = MetricCalculator.filterActivityLog(sampleLog, { query: '102' });
  assert.strictEqual(searchID.length, 1);
  assert.strictEqual(searchID[0].id, 102);

  // 6. Combined filter: severity 'success' AND query 'Build'
  const combined = MetricCalculator.filterActivityLog(sampleLog, { severity: 'success', query: 'Build' });
  assert.strictEqual(combined.length, 1);
  assert.strictEqual(combined[0].id, 102);

  // 7. Empty / unmatched search query
  const unmatched = MetricCalculator.filterActivityLog(sampleLog, { query: 'non-existent' });
  assert.strictEqual(unmatched.length, 0);

  // 8. Null / invalid log handling
  assert.deepStrictEqual(MetricCalculator.filterActivityLog(null), []);
});

test('MetricCalculator - trimActivityLog enforces FIFO limit of 5 items', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  const trimmed = MetricCalculator.trimActivityLog(items, 5);
  assert.strictEqual(trimmed.length, 5);
  assert.deepStrictEqual(trimmed, [1, 2, 3, 4, 5]);

  assert.deepStrictEqual(MetricCalculator.trimActivityLog(null), []);
});

test('MetricCalculator - validateTheme strictly enforces allowlist against injection payloads', () => {
  // Valid themes
  assert.strictEqual(MetricCalculator.validateTheme('dark'), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme('light'), 'light');

  // Injection and malformed payloads
  assert.strictEqual(MetricCalculator.validateTheme('<script>alert(1)</script>'), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme('"><img src=x onerror=alert(1)>'), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme('__proto__'), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme(''), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme(null), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme(undefined), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme(12345), 'dark');
  assert.strictEqual(MetricCalculator.validateTheme({}), 'dark');
});

test('MetricCalculator - robustly handles unexpected / NaN / invalid types in calculation methods', () => {
  // calculateSpike with faulty randomFn
  const safeSpike = MetricCalculator.calculateSpike(() => -5);
  assert.ok(typeof safeSpike.traffic === 'number' && !isNaN(safeSpike.traffic));

  // queueBuild / completeBuild / failBuild with non-number or NaN counts
  const qRes = MetricCalculator.queueBuild(NaN, 999);
  assert.strictEqual(qRes.builds, 4); // safely defaults to INITIAL_BUILDS (3) + 1 = 4

  const cRes = MetricCalculator.completeBuild(-5, 999);
  assert.strictEqual(cRes.builds, 0);

  // simulateMemoryChange with non-numeric / negative parameters
  const memRes = MetricCalculator.simulateMemoryChange(500, NaN);
  assert.ok(!isNaN(memRes.memoryMB));
});

test('safeStorage - gracefully returns fallback if localStorage is undefined or throws', () => {
  const result = safeStorage.get('non_existent_key', 'fallback_value');
  assert.strictEqual(result, 'fallback_value');
});

test('safeStorage - set operation does not throw in restricted storage context', () => {
  assert.doesNotThrow(() => {
    safeStorage.set('test_key', 'test_val');
  });
});

test('initTrustedTypes - returns null gracefully when window.trustedTypes is unavailable in headless/node context', () => {
  const policy = initTrustedTypes();
  assert.strictEqual(policy, null);
});

test('initTrustedTypes - creates default policy and strictly forbids dynamic HTML injection', () => {
  let createdPolicyName = null;
  let policyRules = null;

  global.window = {
    trustedTypes: {
      createPolicy: (name, rules) => {
        createdPolicyName = name;
        policyRules = rules;
        return { name, ...rules };
      }
    }
  };

  try {
    const policy = initTrustedTypes();
    assert.strictEqual(createdPolicyName, 'default');
    assert.ok(policy !== null);
    assert.strictEqual(typeof policyRules.createHTML, 'function');
    assert.strictEqual(typeof policyRules.createScript, 'function');
    assert.strictEqual(typeof policyRules.createScriptURL, 'function');

    // Mathematical DOM XSS refusal: createHTML throws TypeError
    assert.throws(() => {
      policyRules.createHTML('<img src=x onerror=alert(1)>');
    }, TypeError);

    // Pass-through script and URL validation
    assert.strictEqual(policyRules.createScript('console.log("safe");'), 'console.log("safe");');
    assert.strictEqual(policyRules.createScriptURL('https://localhost:8080/app.js'), 'https://localhost:8080/app.js');
  } finally {
    delete global.window;
  }
});

