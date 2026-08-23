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

test('MetricCalculator - generateSparklinePath produces valid SVG path syntax and handles edge cases', () => {
  // 1. Normal points array
  const res1 = MetricCalculator.generateSparklinePath([10, 20, 15, 30], 120, 32);
  assert.ok(res1.line.startsWith('M 0.0,'));
  assert.ok(res1.line.includes(' L '));
  assert.ok(res1.area.startsWith('M 0.0,'));
  assert.ok(res1.area.endsWith('L 120,32 L 0,32 Z'));

  // 2. Empty array
  const resEmpty = MetricCalculator.generateSparklinePath([]);
  assert.strictEqual(resEmpty.line, '');
  assert.strictEqual(resEmpty.area, '');

  // 3. Single point
  const resSingle = MetricCalculator.generateSparklinePath([100], 120, 32);
  assert.strictEqual(resSingle.line, 'M 0,16 L 120,16');
  assert.strictEqual(resSingle.area, 'M 0,16 L 120,16 L 120,32 L 0,32 Z');

  // 4. Uniform identical points (division by zero protection)
  const resUniform = MetricCalculator.generateSparklinePath([50, 50, 50], 120, 32);
  assert.ok(resUniform.line.includes('L'));
  assert.ok(!resUniform.line.includes('NaN'));

  // 5. Non-number / NaN values handled defensively
  const resNaN = MetricCalculator.generateSparklinePath([10, NaN, 'invalid', 40], 120, 32);
  assert.ok(!resNaN.line.includes('NaN'));
});

test('MetricCalculator - calculateProbeStats accurately computes uptime and latency', () => {
  // Mixed alive and offline samples
  const history = [
    { alive: true, latencyMs: 10.0 },
    { alive: true, latencyMs: 20.0 },
    { alive: false, latencyMs: 0 },
    { alive: true, latencyMs: 30.0 }
  ];
  const stats = MetricCalculator.calculateProbeStats(history);
  assert.strictEqual(stats.uptimePct, 75.0); // 3 of 4 = 75%
  assert.strictEqual(stats.avgLatencyMs, 20.0); // (10+20+30)/3 = 20
  assert.strictEqual(stats.isAlive, true);

  // Empty history
  const emptyStats = MetricCalculator.calculateProbeStats([]);
  assert.strictEqual(emptyStats.uptimePct, 100);
  assert.strictEqual(emptyStats.avgLatencyMs, 0);
  assert.strictEqual(emptyStats.isAlive, false);

  // All offline
  const offlineStats = MetricCalculator.calculateProbeStats([
    { alive: false, latencyMs: 0 },
    { alive: false, latencyMs: 0 }
  ]);
  assert.strictEqual(offlineStats.uptimePct, 0);
  assert.strictEqual(offlineStats.avgLatencyMs, 0);
  assert.strictEqual(offlineStats.isAlive, false);
});

test('MetricCalculator - evaluateThresholds flags warnings when limits are reached', () => {
  // Baseline state (normal)
  const normalState = { traffic: 142, memoryMB: 318, builds: 3 };
  const normalThresholds = MetricCalculator.evaluateThresholds(normalState);
  assert.strictEqual(normalThresholds.trafficWarning, false);
  assert.strictEqual(normalThresholds.memoryWarning, false);
  assert.strictEqual(normalThresholds.buildsWarning, false);

  // Exceeded limits
  const warnState = { traffic: 550, memoryMB: 800, builds: 10 };
  const warnThresholds = MetricCalculator.evaluateThresholds(warnState);
  assert.strictEqual(warnThresholds.trafficWarning, true);
  assert.strictEqual(warnThresholds.memoryWarning, true);
  assert.strictEqual(warnThresholds.buildsWarning, true);

  // Null/undefined state
  const nullThresholds = MetricCalculator.evaluateThresholds(null);
  assert.strictEqual(nullThresholds.trafficWarning, false);
});

test('MetricCalculator - filterCommands searches commands by title, category, and ID', () => {
  const commands = [
    { id: 'cmd-traffic-spike', title: 'Simulate Traffic Spike', category: 'Actions' },
    { id: 'cmd-trigger-gc', title: 'Trigger Server GC', category: 'Actions' },
    { id: 'cmd-density-compact', title: 'Switch to Compact View Density', category: 'View' },
    { id: 'cmd-export-json', title: 'Export JSON Diagnostic Snapshot', category: 'Reports' }
  ];

  // Empty query returns all
  assert.strictEqual(MetricCalculator.filterCommands(commands, '').length, 4);
  assert.strictEqual(MetricCalculator.filterCommands(commands, '   ').length, 4);

  // Title search
  const gcMatch = MetricCalculator.filterCommands(commands, 'gc');
  assert.strictEqual(gcMatch.length, 1);
  assert.strictEqual(gcMatch[0].id, 'cmd-trigger-gc');

  // Category search
  const viewMatch = MetricCalculator.filterCommands(commands, 'view');
  assert.strictEqual(viewMatch.length, 1);
  assert.strictEqual(viewMatch[0].id, 'cmd-density-compact');

  // No match
  const noMatch = MetricCalculator.filterCommands(commands, 'nonexistentxyz');
  assert.strictEqual(noMatch.length, 0);

  // Non-array input
  assert.deepStrictEqual(MetricCalculator.filterCommands(null, 'test'), []);
});

test('MetricCalculator - reorderSections reorders layout arrays safely', () => {
  const original = ['sec-1', 'sec-2', 'sec-3', 'sec-4'];

  // Move sec-1 to sec-3 position
  const reordered = MetricCalculator.reorderSections(original, 'sec-1', 'sec-3');
  assert.deepStrictEqual(reordered, ['sec-2', 'sec-1', 'sec-3', 'sec-4']);

  // Move sec-4 to sec-1 position
  const reordered2 = MetricCalculator.reorderSections(original, 'sec-4', 'sec-1');
  assert.deepStrictEqual(reordered2, ['sec-4', 'sec-1', 'sec-2', 'sec-3']);

  // Invalid IDs returns unchanged order
  const invalidReorder = MetricCalculator.reorderSections(original, 'missing-id', 'sec-2');
  assert.deepStrictEqual(invalidReorder, original);

  // Non-array input returns empty
  assert.deepStrictEqual(MetricCalculator.reorderSections(null, 'a', 'b'), []);
});

test('MetricCalculator - generateBuildStages constructs 4-stage pipeline execution metadata', () => {
  // Successful build
  const successStages = MetricCalculator.generateBuildStages(105, true, 200);
  assert.strictEqual(successStages.length, 4);
  assert.strictEqual(successStages[0].name, '1. Syntax & Static Lint');
  assert.strictEqual(successStages[0].status, 'success');
  assert.strictEqual(successStages[1].name, '2. Unit & Integration Tests');
  assert.strictEqual(successStages[1].status, 'success');
  assert.strictEqual(successStages[2].name, '3. OWASP ASVS SAST Gate');
  assert.strictEqual(successStages[2].status, 'success');
  assert.strictEqual(successStages[3].name, '4. Hermetic Binary Compilation');
  assert.strictEqual(successStages[3].status, 'success');

  // Failed build
  const failedStages = MetricCalculator.generateBuildStages(106, false, 150);
  assert.strictEqual(failedStages.length, 4);
  assert.strictEqual(failedStages[1].status, 'failed');
  assert.strictEqual(failedStages[2].status, 'skipped');
  assert.strictEqual(failedStages[3].status, 'skipped');
});


