// W3C Trusted Types Policy Initialization (Mathematical DOM XSS Immunity)
const initTrustedTypes = () => {
  if (typeof window !== 'undefined' && window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
    try {
      return window.trustedTypes.createPolicy('default', {
        createHTML: () => {
          throw new TypeError('Dynamic HTML injection is strictly prohibited by security policy.');
        },
        createScript: (string) => string,
        createScriptURL: (url) => url
      });
    } catch (_) {
      // Policy already registered or restricted
      return null;
    }
  }
  return null;
};

// Initialize default security policy in browser context
const trustedPolicy = initTrustedTypes();

// Safe Storage Utility
const safeStorage = {
  get(key, fallback = null) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch (_) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // Silently ignore when storage is blocked
    }
  }
};

// Pure calculation and state transformation helpers (exportable for unit tests)
const MetricCalculator = {
  INITIAL_TRAFFIC: 142,
  INITIAL_TAG: '+12% vs avg',
  MIN_SPIKE: 350,
  MAX_SPIKE: 850,

  INITIAL_BUILDS: 3,
  MAX_BUILDS: 10,
  MIN_BUILDS: 0,
  INITIAL_BUILD_TAG: "E.'s Pipeline \u2022 Go & JS",

  INITIAL_MEMORY: 318,
  MEMORY_LIMIT: 1024,
  INITIAL_MEMORY_TAG: 'Limit: 1024 MB',

  calculateSpike(randomFn = Math.random) {
    const spikeTraffic = Math.floor(randomFn() * (this.MAX_SPIKE - this.MIN_SPIKE + 1)) + this.MIN_SPIKE;
    const spikeDelta = spikeTraffic - this.INITIAL_TRAFFIC;
    const percentIncrease = Math.round((spikeDelta / this.INITIAL_TRAFFIC) * 100);
    return {
      traffic: spikeTraffic,
      delta: spikeDelta,
      percentIncrease,
      tagText: `+${percentIncrease}% spike`,
      tagClass: 'tag tag-success'
    };
  },

  getBaseline() {
    return {
      traffic: this.INITIAL_TRAFFIC,
      delta: 0,
      percentIncrease: 0,
      tagText: this.INITIAL_TAG,
      tagClass: 'tag tag-success',
      builds: this.INITIAL_BUILDS,
      buildTagText: this.INITIAL_BUILD_TAG,
      buildTagClass: 'tag tag-info',
      memoryMB: this.INITIAL_MEMORY,
      memoryUnit: 'MB',
      memoryTagText: this.INITIAL_MEMORY_TAG,
      memoryTagClass: 'tag tag-purple'
    };
  },

  formatBytes(bytes) {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${val} ${sizes[i]}`;
  },

  parseTelemetry(data) {
    if (!data || typeof data !== 'object') {
      return {
        memoryMB: this.INITIAL_MEMORY,
        memoryUnit: 'MB',
        tagText: this.INITIAL_MEMORY_TAG,
        tagClass: 'tag tag-purple',
        details: 'Simulated Local Heap'
      };
    }

    const allocMB = typeof data.allocMB === 'number' ? parseFloat(data.allocMB.toFixed(1)) : this.INITIAL_MEMORY;
    const numGC = typeof data.numGC === 'number' ? data.numGC : 0;
    const goroutines = typeof data.goroutines === 'number' ? data.goroutines : 1;

    return {
      memoryMB: allocMB,
      memoryUnit: 'MB',
      tagText: `Heap: ${allocMB} MB \u2022 GC: ${numGC}`,
      tagClass: 'tag tag-purple',
      details: `Goroutines: ${goroutines} \u2022 PID: ${data.pid || 'N/A'}`
    };
  },

  simulateMemoryChange(currentMB, deltaMB, minMB = 50, maxLimit = 1024) {
    const base = typeof currentMB === 'number' && !isNaN(currentMB) ? currentMB : this.INITIAL_MEMORY;
    const delta = typeof deltaMB === 'number' && !isNaN(deltaMB) ? deltaMB : 0;
    const updated = Math.min(maxLimit, Math.max(minMB, parseFloat((base + delta).toFixed(1))));
    const percent = Math.round((updated / maxLimit) * 100);
    const tagClass = percent > 85 ? 'tag tag-danger' : (percent > 65 ? 'tag tag-warning' : 'tag tag-purple');
    return {
      memoryMB: updated,
      memoryUnit: 'MB',
      tagText: `Simulated: ${percent}% limit`,
      tagClass
    };
  },

  queueBuild(currentBuilds, buildId, timeStr = 'Just now') {
    const validCount = typeof currentBuilds === 'number' && !isNaN(currentBuilds) ? currentBuilds : this.INITIAL_BUILDS;
    const newBuilds = Math.min(this.MAX_BUILDS, Math.max(this.MIN_BUILDS, validCount + 1));
    const tagText = newBuilds >= this.MAX_BUILDS ? 'Queue Full (10 max)' : 'Active: Running';
    const tagClass = newBuilds >= this.MAX_BUILDS ? 'tag tag-warning' : 'tag tag-info';
    return {
      builds: newBuilds,
      buildTagText: tagText,
      buildTagClass: tagClass,
      logEntry: {
        id: buildId,
        type: 'queued',
        tagText: 'Queued',
        tagClass: 'tag tag-warning',
        message: `Build #${buildId} queued for deployment`,
        time: timeStr
      }
    };
  },

  completeBuild(currentBuilds, buildId, timeStr = 'Just now') {
    const validCount = typeof currentBuilds === 'number' && !isNaN(currentBuilds) ? currentBuilds : this.INITIAL_BUILDS;
    const newBuilds = Math.max(this.MIN_BUILDS, validCount - 1);
    const tagText = newBuilds === 0 ? 'All Tasks Completed' : `Active: ${newBuilds} remaining`;
    const tagClass = newBuilds === 0 ? 'tag tag-success' : 'tag tag-info';
    return {
      builds: newBuilds,
      buildTagText: tagText,
      buildTagClass: tagClass,
      logEntry: {
        id: buildId,
        type: 'success',
        tagText: 'Success',
        tagClass: 'tag tag-success',
        message: `Build #${buildId} completed successfully`,
        time: timeStr
      }
    };
  },

  failBuild(currentBuilds, buildId, timeStr = 'Just now') {
    const validCount = typeof currentBuilds === 'number' && !isNaN(currentBuilds) ? currentBuilds : this.INITIAL_BUILDS;
    const newBuilds = Math.max(this.MIN_BUILDS, validCount - 1);
    const tagText = newBuilds === 0 ? 'Build Failed (Queue empty)' : 'Warning: Build Failed';
    const tagClass = 'tag tag-danger';
    return {
      builds: newBuilds,
      buildTagText: tagText,
      buildTagClass: tagClass,
      logEntry: {
        id: buildId,
        type: 'failed',
        tagText: 'Failed',
        tagClass: 'tag tag-danger',
        message: `Build #${buildId} failed during test phase`,
        time: timeStr
      }
    };
  },

  trimActivityLog(logArray, maxItems = 5) {
    if (!Array.isArray(logArray)) return [];
    return logArray.slice(0, maxItems);
  },

  validateTheme(theme) {
    return theme === 'light' || theme === 'dark' ? theme : 'dark';
  },

  filterActivityLog(logArray, criteria = {}) {
    if (!Array.isArray(logArray)) return [];
    const severity = (criteria.severity || 'all').toLowerCase();
    const query = (criteria.query || '').trim().toLowerCase();

    return logArray.filter(item => {
      // Filter by severity
      if (severity !== 'all' && item.type.toLowerCase() !== severity) {
        return false;
      }

      // Filter by text query
      if (query.length > 0) {
        const messageMatch = item.message && item.message.toLowerCase().includes(query);
        const tagMatch = item.tagText && item.tagText.toLowerCase().includes(query);
        const idMatch = item.id && item.id.toString().includes(query);
        const timeMatch = item.time && item.time.toLowerCase().includes(query);
        return messageMatch || tagMatch || idMatch || timeMatch;
      }

      return true;
    });
  },

  generateDiagnosticSnapshot(state, clientInfo = {}) {
    return {
      metadata: {
        application: "E.'s Dev Dashboard",
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: clientInfo.environment || 'local'
      },
      server: {
        status: clientInfo.serverStatus || 'Online'
      },
      client: {
        theme: clientInfo.theme || 'dark',
        userAgent: clientInfo.userAgent || 'unknown'
      },
      metrics: {
        traffic: {
          current: state.traffic,
          unit: 'req/s',
          delta: state.delta,
          percentIncrease: state.percentIncrease,
          statusTag: state.tagText
        },
        builds: {
          active: state.builds,
          maxCapacity: this.MAX_BUILDS,
          statusTag: state.buildTagText
        },
        memory: {
          currentMB: state.memoryMB,
          limitMB: this.MEMORY_LIMIT,
          statusTag: state.memoryTagText
        }
      },
      recentActivity: Array.isArray(state.activityLog) ? state.activityLog : []
    };
  },

  formatMarkdownReport(snapshot) {
    if (!snapshot || !snapshot.metrics) return '# Diagnostic Report\n\nNo telemetry data available.';

    const meta = snapshot.metadata || {};
    const metrics = snapshot.metrics || {};
    const server = snapshot.server || {};
    const client = snapshot.client || {};

    let report = `# E.'s Dev Dashboard - Diagnostic Telemetry Report\n\n`;
    report += `**Generated:** ${meta.timestamp || new Date().toISOString()}\n`;
    report += `**Server Status:** ${server.status || 'Unknown'}\n`;
    report += `**Active Theme:** ${client.theme || 'dark'}\n\n`;

    report += `## System Metrics\n\n`;
    report += `| Metric | Current Value | Status / Tag |\n`;
    report += `| :--- | :--- | :--- |\n`;
    report += `| **API Requests** | ${metrics.traffic?.current || 0} req/s | ${metrics.traffic?.statusTag || 'N/A'} |\n`;
    report += `| **Active Build Jobs** | ${metrics.builds?.active || 0} / ${metrics.builds?.maxCapacity || 10} | ${metrics.builds?.statusTag || 'N/A'} |\n`;
    report += `| **Memory Heap** | ${metrics.memory?.currentMB || 0} MB / ${metrics.memory?.limitMB || 1024} MB | ${metrics.memory?.statusTag || 'N/A'} |\n\n`;

    report += `## Recent Pipeline Events\n\n`;
    if (Array.isArray(snapshot.recentActivity) && snapshot.recentActivity.length > 0) {
      snapshot.recentActivity.forEach(evt => {
        report += `- [${evt.time || 'N/A'}] **[${evt.tagText || 'Event'}]** ${evt.message || ''}\n`;
      });
    } else {
      report += `*No recent pipeline events recorded.*\n`;
    }

    return report;
  },

  generateSparklinePath(points, width = 120, height = 32) {
    if (!Array.isArray(points) || points.length === 0) {
      return { line: '', area: '' };
    }
    const validPoints = points.map(p => (typeof p === 'number' && !isNaN(p) ? p : 0));
    if (validPoints.length === 1) {
      const midY = height / 2;
      return {
        line: `M 0,${midY} L ${width},${midY}`,
        area: `M 0,${midY} L ${width},${midY} L ${width},${height} L 0,${height} Z`
      };
    }

    const min = Math.min(...validPoints);
    const max = Math.max(...validPoints);
    const range = max === min ? 1 : max - min;
    const padding = 2;
    const chartHeight = height - (padding * 2);

    const coords = validPoints.map((val, idx) => {
      const x = (idx / (validPoints.length - 1)) * width;
      const normalized = (val - min) / range;
      const y = height - padding - (normalized * chartHeight);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const line = `M ${coords.join(' L ')}`;
    const area = `M ${coords[0]} L ${coords.join(' L ')} L ${width},${height} L 0,${height} Z`;

    return { line, area };
  },

  calculateProbeStats(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return { avgLatencyMs: 0, uptimePct: 100, isAlive: false };
    }
    const total = history.length;
    const aliveCount = history.filter(h => h && h.alive).length;
    const uptimePct = parseFloat(((aliveCount / total) * 100).toFixed(1));

    const aliveItems = history.filter(h => h && h.alive && typeof h.latencyMs === 'number');
    const avgLatencyMs = aliveItems.length > 0
      ? parseFloat((aliveItems.reduce((acc, h) => acc + h.latencyMs, 0) / aliveItems.length).toFixed(1))
      : 0;

    const isAlive = history[history.length - 1]?.alive ?? false;

    return { avgLatencyMs, uptimePct, isAlive };
  },

  evaluateThresholds(state, config = { trafficWarn: 500, memoryWarnMB: 750, buildsMax: 10 }) {
    if (!state || typeof state !== 'object') {
      return { trafficWarning: false, memoryWarning: false, buildsWarning: false };
    }
    const trafficWarn = config.trafficWarn || 500;
    const memoryWarnMB = config.memoryWarnMB || 750;
    const buildsMax = config.buildsMax || 10;

    return {
      trafficWarning: (state.traffic || 0) >= trafficWarn,
      memoryWarning: (state.memoryMB || 0) >= memoryWarnMB,
      buildsWarning: (state.builds || 0) >= buildsMax
    };
  },

  filterCommands(commands, query) {
    if (!Array.isArray(commands)) return [];
    const trimmed = (query || '').trim().toLowerCase();
    if (trimmed.length === 0) return [...commands];

    return commands.filter(cmd => {
      if (!cmd || typeof cmd !== 'object') return false;
      const titleMatch = cmd.title && cmd.title.toLowerCase().includes(trimmed);
      const categoryMatch = cmd.category && cmd.category.toLowerCase().includes(trimmed);
      const idMatch = cmd.id && cmd.id.toLowerCase().includes(trimmed);
      return Boolean(titleMatch || categoryMatch || idMatch);
    });
  },

  reorderSections(currentOrder, draggedId, targetId) {
    if (!Array.isArray(currentOrder)) return [];
    const order = [...currentOrder];
    const fromIndex = order.indexOf(draggedId);
    const toIndex = order.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return order;
    }

    const [moved] = order.splice(fromIndex, 1);
    const newTargetIndex = order.indexOf(targetId);
    order.splice(newTargetIndex, 0, moved);
    return order;
  },

  generateBuildStages(buildId, isSuccess = true, durationMs = 120) {
    const validDuration = typeof durationMs === 'number' && durationMs > 0 ? durationMs : 120;
    const dur1 = Math.max(1, Math.round(validDuration * 0.15));
    const dur2 = Math.max(1, Math.round(validDuration * 0.45));
    const dur3 = Math.max(1, Math.round(validDuration * 0.25));
    const dur4 = Math.max(1, Math.round(validDuration * 0.15));

    return [
      {
        id: 'stage-lint',
        name: '1. Syntax & Static Lint',
        status: 'success',
        durationMs: dur1,
        log: 'node --check app.js theme-init.js; gofmt -s -l . (0 syntax/lint errors)'
      },
      {
        id: 'stage-test',
        name: '2. Unit & Integration Tests',
        status: isSuccess ? 'success' : 'failed',
        durationMs: dur2,
        log: isSuccess
          ? 'All 16 Node.js unit tests and 11 Go integration tests passed'
          : 'AssertionError: unexpected status code 500 during regression execution'
      },
      {
        id: 'stage-sast',
        name: '3. OWASP ASVS SAST Gate',
        status: isSuccess ? 'success' : 'skipped',
        durationMs: isSuccess ? dur3 : 0,
        log: isSuccess
          ? 'govulncheck (0 vulnerabilities), gosec (0 security issues)'
          : 'Gate skipped due to prior unit test failure'
      },
      {
        id: 'stage-build',
        name: '4. Hermetic Binary Compilation',
        status: isSuccess ? 'success' : 'skipped',
        durationMs: isSuccess ? dur4 : 0,
        log: isSuccess
          ? 'CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o server.exe (Clean hermetic binary)'
          : 'Compilation omitted'
      }
    ];
  }
};

function initDashboard() {
  const trafficValueEl = document.getElementById('val-traffic');
  const trafficTagEl = document.getElementById('traffic-tag');
  const trafficCardEl = document.getElementById('card-traffic');

  const buildsValueEl = document.getElementById('val-builds');
  const buildsCardEl = document.getElementById('card-builds');
  const buildsTagEl = document.getElementById('builds-tag') || (buildsCardEl ? buildsCardEl.querySelector('.tag') : null);

  const memoryValueEl = document.getElementById('val-memory');
  const memoryUnitEl = document.getElementById('memory-unit');
  const memoryTagEl = document.getElementById('memory-tag');
  const memoryCardEl = document.getElementById('card-memory');

  const lastUpdatedEl = document.getElementById('last-updated-time');
  const activityListEl = document.getElementById('activity-list');
  const activityCountEl = document.getElementById('activity-results-count');
  const activitySearchInput = document.getElementById('input-activity-search');

  const btnFilterAll = document.getElementById('btn-filter-all');
  const btnFilterQueued = document.getElementById('btn-filter-queued');
  const btnFilterSuccess = document.getElementById('btn-filter-success');
  const btnFilterFailed = document.getElementById('btn-filter-failed');
  const filterButtons = [btnFilterAll, btnFilterQueued, btnFilterSuccess, btnFilterFailed].filter(Boolean);

  const btnTrafficSpike = document.getElementById('btn-traffic-spike');
  const btnReset = document.getElementById('btn-reset');
  const btnQueueBuild = document.getElementById('btn-queue-build');
  const btnCompleteBuild = document.getElementById('btn-complete-build');
  const btnFailBuild = document.getElementById('btn-fail-build');
  const btnTriggerGC = document.getElementById('btn-trigger-gc');
  const btnSimulateAlloc = document.getElementById('btn-simulate-alloc');
  const btnExportJSON = document.getElementById('btn-export-json');
  const btnCopyReport = document.getElementById('btn-copy-report');
  const btnClearLog = document.getElementById('btn-clear-log');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const statusIndicatorEl = document.getElementById('status-indicator');
  const statusDotEl = document.getElementById('status-dot');
  const statusTextEl = document.getElementById('status-text');

  const btnOpenPalette = document.getElementById('btn-open-palette');
  const modalPalette = document.getElementById('modal-command-palette');
  const inputPalette = document.getElementById('input-command-palette');
  const paletteResults = document.getElementById('palette-results');
  const btnClosePalette = document.getElementById('btn-close-palette');

  const btnDensityComfortable = document.getElementById('btn-density-comfortable');
  const btnDensityCompact = document.getElementById('btn-density-compact');

  const probesGridEl = document.getElementById('probes-grid');
  const btnRefreshProbes = document.getElementById('btn-refresh-probes');
  const btnOpenAddProbe = document.getElementById('btn-open-add-probe');
  const modalAddProbe = document.getElementById('modal-add-probe');
  const formAddProbe = document.getElementById('form-add-probe');
  const inputProbeName = document.getElementById('input-probe-name');
  const inputProbeUrl = document.getElementById('input-probe-url');
  const btnCancelAddProbe = document.getElementById('btn-cancel-add-probe');
  const btnCloseProbeModal = document.getElementById('btn-close-probe-modal');

  const modalPipeline = document.getElementById('modal-pipeline-inspector');
  const pipelineSummaryBar = document.getElementById('pipeline-summary-bar');
  const pipelineStepper = document.getElementById('pipeline-stepper');
  const btnClosePipelineModal = document.getElementById('btn-close-pipeline-modal');
  const btnDonePipeline = document.getElementById('btn-done-pipeline');

  const sparklineLineBuilds = document.getElementById('sparkline-line-builds');
  const sparklineAreaBuilds = document.getElementById('sparkline-area-builds');
  const sparklineLineTraffic = document.getElementById('sparkline-line-traffic');
  const sparklineAreaTraffic = document.getElementById('sparkline-area-traffic');
  const sparklineLineMemory = document.getElementById('sparkline-line-memory');
  const sparklineAreaMemory = document.getElementById('sparkline-area-memory');

  const THEME_STORAGE_KEY = 'dashboard_theme';
  const PROBES_STORAGE_KEY = 'dashboard_probes';
  const DENSITY_STORAGE_KEY = 'dashboard_density';
  const LAYOUT_STORAGE_KEY = 'dashboard_layout_order';

  function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function applyTheme(theme) {
    const validated = MetricCalculator.validateTheme(theme);
    document.documentElement.setAttribute('data-theme', validated);
    const isLight = validated === 'light';

    if (btnThemeToggle) {
      btnThemeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      btnThemeToggle.setAttribute('aria-label', 'Theme mode toggle');
      btnThemeToggle.setAttribute('title', 'Toggle dark/light theme');
    }
  }

  const activeTheme = MetricCalculator.validateTheme(document.documentElement.getAttribute('data-theme') || safeStorage.get(THEME_STORAGE_KEY, 'dark'));
  applyTheme(activeTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const currentTheme = MetricCalculator.validateTheme(document.documentElement.getAttribute('data-theme'));
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      safeStorage.set(THEME_STORAGE_KEY, newTheme);
      applyTheme(newTheme);
    });
  }

  function setDensity(density) {
    const validDensity = density === 'compact' ? 'compact' : 'comfortable';
    document.documentElement.setAttribute('data-density', validDensity);
    safeStorage.set(DENSITY_STORAGE_KEY, validDensity);

    if (btnDensityComfortable) {
      const isComfortable = validDensity === 'comfortable';
      btnDensityComfortable.classList.toggle('active', isComfortable);
      btnDensityComfortable.setAttribute('aria-pressed', isComfortable ? 'true' : 'false');
    }
    if (btnDensityCompact) {
      const isCompact = validDensity === 'compact';
      btnDensityCompact.classList.toggle('active', isCompact);
      btnDensityCompact.setAttribute('aria-pressed', isCompact ? 'true' : 'false');
    }
  }

  const initialDensity = safeStorage.get(DENSITY_STORAGE_KEY, 'comfortable');
  setDensity(initialDensity);

  if (btnDensityComfortable) btnDensityComfortable.addEventListener('click', () => setDensity('comfortable'));
  if (btnDensityCompact) btnDensityCompact.addEventListener('click', () => setDensity('compact'));

  const defaultProbes = [
    { id: 'probe-server', name: "E.'s Local Server", url: 'http://127.0.0.1:8080/health', alive: true, latencyMs: 4.2, uptimePct: 100, history: [{ alive: true, latencyMs: 4.2 }] },
    { id: 'probe-frontend', name: 'Frontend Dev Server', url: 'http://127.0.0.1:3000/', alive: false, latencyMs: 0, uptimePct: 0, history: [] },
    { id: 'probe-api', name: 'Local Auth / API Service', url: 'http://127.0.0.1:5000/api/health', alive: false, latencyMs: 0, uptimePct: 0, history: [] }
  ];

  let storedProbes = null;
  try {
    const raw = safeStorage.get(PROBES_STORAGE_KEY);
    if (raw) storedProbes = JSON.parse(raw);
  } catch (_) {
    storedProbes = null;
  }

  let nextBuildId = 104;
  const state = {
    ...MetricCalculator.getBaseline(),
    statusMessage: 'Just now',
    filterSeverity: 'all',
    filterSearch: '',
    sparklineHistory: {
      traffic: [135, 142, 140, 145, 138, 142, 142],
      builds: [3, 3, 4, 3, 2, 3, 3],
      memory: [315, 318, 318, 320, 318, 322, 318]
    },
    probes: Array.isArray(storedProbes) && storedProbes.length > 0 ? storedProbes : defaultProbes,
    activityLog: [
      {
        id: 103,
        type: 'success',
        tagText: 'Success',
        tagClass: 'tag tag-success',
        message: 'Build #103 completed successfully',
        time: getFormattedTime()
      },
      {
        id: 102,
        type: 'queued',
        tagText: 'Queued',
        tagClass: 'tag tag-warning',
        message: 'Build #102 queued for deployment',
        time: getFormattedTime()
      }
    ]
  };

  function pushSparkline(metric, value) {
    if (!state.sparklineHistory[metric]) return;
    state.sparklineHistory[metric].push(value);
    if (state.sparklineHistory[metric].length > 25) {
      state.sparklineHistory[metric].shift();
    }
  }

  function renderSparklines() {
    if (sparklineLineBuilds && sparklineAreaBuilds) {
      const paths = MetricCalculator.generateSparklinePath(state.sparklineHistory.builds, 120, 32);
      sparklineLineBuilds.setAttribute('d', paths.line);
      sparklineAreaBuilds.setAttribute('d', paths.area);
    }
    if (sparklineLineTraffic && sparklineAreaTraffic) {
      const paths = MetricCalculator.generateSparklinePath(state.sparklineHistory.traffic, 120, 32);
      sparklineLineTraffic.setAttribute('d', paths.line);
      sparklineAreaTraffic.setAttribute('d', paths.area);
    }
    if (sparklineLineMemory && sparklineAreaMemory) {
      const paths = MetricCalculator.generateSparklinePath(state.sparklineHistory.memory, 120, 32);
      sparklineLineMemory.setAttribute('d', paths.line);
      sparklineAreaMemory.setAttribute('d', paths.area);
    }
  }

  function evaluateAndApplyThresholds() {
    const thresholds = MetricCalculator.evaluateThresholds(state, {
      trafficWarn: 500,
      memoryWarnMB: 750,
      buildsMax: 10
    });

    if (trafficCardEl) {
      trafficCardEl.classList.toggle('threshold-warning', thresholds.trafficWarning);
    }
    if (memoryCardEl) {
      memoryCardEl.classList.toggle('threshold-critical', thresholds.memoryWarning);
    }
    if (buildsCardEl) {
      buildsCardEl.classList.toggle('threshold-warning', thresholds.buildsWarning);
    }
  }

  function triggerCardPulse(element) {
    if (!element || typeof element.animate !== 'function') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    element.animate(
      [
        { boxShadow: '0 0 0 0 rgba(56, 189, 248, 0.45)', borderColor: 'var(--accent-primary)' },
        { boxShadow: '0 0 0 8px rgba(56, 189, 248, 0.45)', borderColor: 'var(--accent-primary)', offset: 0.5 },
        { boxShadow: 'var(--shadow-md)', borderColor: 'var(--border-color)' }
      ],
      { duration: 600, easing: 'ease-out' }
    );
  }

  function saveProbes() {
    safeStorage.set(PROBES_STORAGE_KEY, JSON.stringify(state.probes));
  }

  function renderProbes() {
    if (!probesGridEl) return;
    while (probesGridEl.firstChild) {
      probesGridEl.removeChild(probesGridEl.firstChild);
    }

    if (state.probes.length === 0) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'probe-item-card';
      emptyCard.textContent = 'No local service probes registered. Click "+ Add Service" above.';
      probesGridEl.appendChild(emptyCard);
      return;
    }

    state.probes.forEach(probe => {
      const stats = MetricCalculator.calculateProbeStats(probe.history);

      const card = document.createElement('div');
      card.className = 'probe-item-card';

      const header = document.createElement('div');
      header.className = 'probe-item-header';

      const titleGroup = document.createElement('div');
      const nameEl = document.createElement('h3');
      nameEl.className = 'probe-item-name';
      nameEl.textContent = probe.name;

      const urlEl = document.createElement('span');
      urlEl.className = 'probe-item-url';
      urlEl.textContent = probe.url;

      titleGroup.appendChild(nameEl);
      titleGroup.appendChild(urlEl);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete-probe';
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('aria-label', `Delete probe ${probe.name}`);
      deleteBtn.title = 'Remove probe';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => {
        state.probes = state.probes.filter(p => p.id !== probe.id);
        saveProbes();
        renderProbes();
      });

      header.appendChild(titleGroup);
      header.appendChild(deleteBtn);

      const statusRow = document.createElement('div');
      statusRow.className = 'probe-item-status-row';

      const pill = document.createElement('span');
      pill.className = `probe-pill ${probe.alive ? 'probe-pill-online' : 'probe-pill-offline'}`;
      pill.textContent = probe.alive ? '● Online' : '○ Offline';

      const latencyEl = document.createElement('span');
      latencyEl.className = 'probe-latency';
      latencyEl.textContent = probe.alive ? `${probe.latencyMs.toFixed(1)} ms (${stats.uptimePct}% up)` : 'Unreachable';

      statusRow.appendChild(pill);
      statusRow.appendChild(latencyEl);

      card.appendChild(header);
      card.appendChild(statusRow);
      probesGridEl.appendChild(card);
    });
  }

  async function pollProbes() {
    const isFileMode = typeof window !== 'undefined' && window.location.protocol === 'file:';

    for (const probe of state.probes) {
      if (isFileMode) {
        const isServerSelf = probe.url.includes('8080');
        const alive = isServerSelf;
        const latencyMs = isServerSelf ? parseFloat((Math.random() * 5 + 2).toFixed(1)) : 0;
        probe.alive = alive;
        probe.latencyMs = latencyMs;
        if (!Array.isArray(probe.history)) probe.history = [];
        probe.history.push({ alive, latencyMs });
        if (probe.history.length > 20) probe.history.shift();
      } else {
        try {
          const res = await fetch(`/api/probe?target=${encodeURIComponent(probe.url)}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            probe.alive = Boolean(data.alive);
            probe.latencyMs = typeof data.latencyMs === 'number' ? data.latencyMs : 0;
            if (!Array.isArray(probe.history)) probe.history = [];
            probe.history.push({ alive: probe.alive, latencyMs: probe.latencyMs });
            if (probe.history.length > 20) probe.history.shift();
          } else {
            probe.alive = false;
            probe.latencyMs = 0;
          }
        } catch (_) {
          probe.alive = false;
          probe.latencyMs = 0;
        }
      }
    }
    saveProbes();
    renderProbes();
  }

  if (btnOpenAddProbe && modalAddProbe) {
    btnOpenAddProbe.addEventListener('click', () => {
      if (typeof modalAddProbe.showModal === 'function') {
        modalAddProbe.showModal();
        if (inputProbeName) inputProbeName.focus();
      }
    });
  }
  if (btnCloseProbeModal && modalAddProbe) {
    btnCloseProbeModal.addEventListener('click', () => modalAddProbe.close());
  }
  if (btnCancelAddProbe && modalAddProbe) {
    btnCancelAddProbe.addEventListener('click', () => modalAddProbe.close());
  }
  if (formAddProbe && modalAddProbe) {
    formAddProbe.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = inputProbeName ? inputProbeName.value.trim() : '';
      const url = inputProbeUrl ? inputProbeUrl.value.trim() : '';

      if (name && url) {
        const newProbe = {
          id: `probe-${Date.now()}`,
          name,
          url,
          alive: false,
          latencyMs: 0,
          uptimePct: 0,
          history: []
        };
        state.probes.push(newProbe);
        saveProbes();
        renderProbes();
        modalAddProbe.close();
        if (inputProbeName) inputProbeName.value = '';
        if (inputProbeUrl) inputProbeUrl.value = '';
        pollProbes();
      }
    });
  }
  if (btnRefreshProbes) {
    btnRefreshProbes.addEventListener('click', pollProbes);
  }

  function openPipelineInspector(item) {
    if (!modalPipeline || !pipelineSummaryBar || !pipelineStepper) return;

    while (pipelineSummaryBar.firstChild) pipelineSummaryBar.removeChild(pipelineSummaryBar.firstChild);
    while (pipelineStepper.firstChild) pipelineStepper.removeChild(pipelineStepper.firstChild);

    const isSuccess = item.type !== 'failed';
    const stages = MetricCalculator.generateBuildStages(item.id, isSuccess);

    const titleSpan = document.createElement('span');
    titleSpan.textContent = `Event #${item.id}: ${item.message}`;

    const tagSpan = document.createElement('span');
    tagSpan.className = item.tagClass;
    tagSpan.textContent = item.tagText;

    pipelineSummaryBar.appendChild(titleSpan);
    pipelineSummaryBar.appendChild(tagSpan);

    stages.forEach(stage => {
      const stepDiv = document.createElement('div');
      stepDiv.className = `pipeline-step ${stage.status === 'success' ? 'step-success' : (stage.status === 'failed' ? 'step-failed' : '')}`;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'pipeline-step-icon';
      iconDiv.textContent = stage.status === 'success' ? '✅' : (stage.status === 'failed' ? '❌' : '⏳');

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'pipeline-step-details';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'pipeline-step-header';

      const nameEl = document.createElement('span');
      nameEl.className = 'pipeline-step-name';
      nameEl.textContent = stage.name;

      const durEl = document.createElement('span');
      durEl.className = 'pipeline-step-duration';
      durEl.textContent = stage.durationMs > 0 ? `${stage.durationMs}ms` : 'Skipped';

      headerDiv.appendChild(nameEl);
      headerDiv.appendChild(durEl);

      const logEl = document.createElement('div');
      logEl.className = 'pipeline-step-log';
      logEl.textContent = stage.log;

      detailsDiv.appendChild(headerDiv);
      detailsDiv.appendChild(logEl);

      stepDiv.appendChild(iconDiv);
      stepDiv.appendChild(detailsDiv);
      pipelineStepper.appendChild(stepDiv);
    });

    if (typeof modalPipeline.showModal === 'function') {
      modalPipeline.showModal();
    }
  }

  if (btnClosePipelineModal && modalPipeline) {
    btnClosePipelineModal.addEventListener('click', () => modalPipeline.close());
  }
  if (btnDonePipeline && modalPipeline) {
    btnDonePipeline.addEventListener('click', () => modalPipeline.close());
  }

  async function checkServerHealth() {
    if (!statusTextEl || !statusIndicatorEl || !statusDotEl) return;

    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      statusTextEl.textContent = 'Local File Mode';
      statusIndicatorEl.className = 'status-indicator status-file';
      statusDotEl.className = 'status-dot dot-file';
      return;
    }

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 3000) : null;
      
      const response = await fetch('/api/telemetry', {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) {
        const telemetry = await response.json();
        statusTextEl.textContent = 'Server: Online';
        statusIndicatorEl.className = 'status-indicator';
        statusDotEl.className = 'status-dot';

        const parsed = MetricCalculator.parseTelemetry(telemetry);
        state.memoryMB = parsed.memoryMB;
        state.memoryUnit = parsed.memoryUnit;
        state.memoryTagText = parsed.tagText;
        state.memoryTagClass = parsed.tagClass;
        pushSparkline('memory', state.memoryMB);
        render();
      } else {
        throw new Error('Non-200 response');
      }
    } catch (_) {
      statusTextEl.textContent = 'Server: Offline';
      statusIndicatorEl.className = 'status-indicator status-offline';
      statusDotEl.className = 'status-dot dot-offline';
    }
  }

  checkServerHealth();
  pollProbes();
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      checkServerHealth();
      pollProbes();
    });
    setInterval(checkServerHealth, 15000);
    setInterval(pollProbes, 15000);
  }

  function renderActivityList() {
    if (!activityListEl) return;

    const filtered = MetricCalculator.filterActivityLog(state.activityLog, {
      severity: state.filterSeverity,
      query: state.filterSearch
    });

    if (activityCountEl) {
      if (state.activityLog.length === 0) {
        activityCountEl.textContent = '0 events';
      } else if (filtered.length === state.activityLog.length) {
        activityCountEl.textContent = `Showing ${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
      } else {
        activityCountEl.textContent = `Showing ${filtered.length} of ${state.activityLog.length} events`;
      }
    }

    while (activityListEl.firstChild) {
      activityListEl.removeChild(activityListEl.firstChild);
    }

    if (state.activityLog.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'activity-empty';
      emptyItem.textContent = 'No recent pipeline activity recorded.';
      activityListEl.appendChild(emptyItem);
      return;
    }

    if (filtered.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'activity-empty';
      emptyItem.textContent = 'No events match the search criteria.';
      activityListEl.appendChild(emptyItem);
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      li.setAttribute('title', 'Click to inspect step-by-step pipeline diagnostics');
      li.setAttribute('tabindex', '0');
      li.setAttribute('role', 'button');

      const mainDiv = document.createElement('div');
      mainDiv.className = 'activity-main';

      const tagSpan = document.createElement('span');
      tagSpan.className = item.tagClass;
      tagSpan.textContent = item.tagText;

      const msgSpan = document.createElement('span');
      msgSpan.className = 'activity-msg';
      msgSpan.textContent = item.message;

      mainDiv.appendChild(tagSpan);
      mainDiv.appendChild(msgSpan);

      const timeSpan = document.createElement('time');
      timeSpan.className = 'activity-time';
      timeSpan.textContent = item.time;
      timeSpan.setAttribute('datetime', item.isoTime || new Date().toISOString());

      li.appendChild(mainDiv);
      li.appendChild(timeSpan);

      li.addEventListener('click', () => openPipelineInspector(item));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPipelineInspector(item);
        }
      });

      activityListEl.appendChild(li);
    });
  }

  function render() {
    if (trafficValueEl) {
      trafficValueEl.textContent = state.traffic.toLocaleString();
    }
    if (trafficTagEl) {
      trafficTagEl.textContent = state.tagText;
      trafficTagEl.className = state.tagClass;
    }
    if (buildsValueEl) {
      buildsValueEl.textContent = state.builds.toString();
    }
    if (buildsTagEl) {
      buildsTagEl.textContent = state.buildTagText;
      buildsTagEl.className = state.buildTagClass;
    }
    if (memoryValueEl) {
      memoryValueEl.textContent = state.memoryMB.toString();
    }
    if (memoryUnitEl) {
      memoryUnitEl.textContent = state.memoryUnit;
    }
    if (memoryTagEl) {
      memoryTagEl.textContent = state.memoryTagText;
      memoryTagEl.className = state.memoryTagClass;
    }
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = state.statusMessage;
    }

    renderSparklines();
    evaluateAndApplyThresholds();
    renderActivityList();
    renderProbes();
  }

  function handleTrafficSpike() {
    const spikeData = MetricCalculator.calculateSpike();
    state.traffic = spikeData.traffic;
    state.delta = spikeData.delta;
    state.percentIncrease = spikeData.percentIncrease;
    state.tagText = spikeData.tagText;
    state.tagClass = spikeData.tagClass;
    state.statusMessage = `${getFormattedTime()} (Traffic Spike: ${spikeData.traffic.toLocaleString()} req/s [+${spikeData.delta.toLocaleString()} req/s])`;

    pushSparkline('traffic', state.traffic);
    render();
    triggerCardPulse(trafficCardEl);
  }

  function handleReset() {
    const baseline = MetricCalculator.getBaseline();
    state.traffic = baseline.traffic;
    state.delta = baseline.delta;
    state.percentIncrease = baseline.percentIncrease;
    state.tagText = baseline.tagText;
    state.tagClass = baseline.tagClass;
    state.statusMessage = `${getFormattedTime()} (Traffic reset to baseline)`;

    pushSparkline('traffic', state.traffic);
    render();
    triggerCardPulse(trafficCardEl);
  }

  function handleQueueBuild() {
    if (state.builds >= MetricCalculator.MAX_BUILDS) {
      state.statusMessage = `${getFormattedTime()} (Queue limit reached: 10 max active jobs)`;
      render();
      return;
    }
    const result = MetricCalculator.queueBuild(state.builds, nextBuildId++, getFormattedTime());
    state.builds = result.builds;
    state.buildTagText = result.buildTagText;
    state.buildTagClass = result.buildTagClass;
    state.activityLog = MetricCalculator.trimActivityLog([result.logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (${result.logEntry.message})`;

    pushSparkline('builds', state.builds);
    render();
    triggerCardPulse(buildsCardEl);
  }

  function handleCompleteBuild() {
    if (state.builds === 0) {
      state.statusMessage = `${getFormattedTime()} (No active build jobs to complete)`;
      render();
      return;
    }
    const result = MetricCalculator.completeBuild(state.builds, nextBuildId++, getFormattedTime());
    state.builds = result.builds;
    state.buildTagText = result.buildTagText;
    state.buildTagClass = result.buildTagClass;
    state.activityLog = MetricCalculator.trimActivityLog([result.logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (${result.logEntry.message})`;

    pushSparkline('builds', state.builds);
    render();
    triggerCardPulse(buildsCardEl);
  }

  function handleFailBuild() {
    if (state.builds === 0) {
      state.statusMessage = `${getFormattedTime()} (No active build jobs to fail)`;
      render();
      return;
    }
    const result = MetricCalculator.failBuild(state.builds, nextBuildId++, getFormattedTime());
    state.builds = result.builds;
    state.buildTagText = result.buildTagText;
    state.buildTagClass = result.buildTagClass;
    state.activityLog = MetricCalculator.trimActivityLog([result.logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (${result.logEntry.message})`;

    pushSparkline('builds', state.builds);
    render();
    triggerCardPulse(buildsCardEl);
  }

  async function handleTriggerGC() {
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        const response = await fetch('/api/gc', { method: 'POST' });
        if (response.ok) {
          const gcResult = await response.json();
          const allocMB = parseFloat(gcResult.allocMB.toFixed(1));
          state.memoryMB = allocMB;
          state.memoryTagText = `Heap: ${allocMB} MB \u2022 GC: ${gcResult.numGC}`;
          state.memoryTagClass = 'tag tag-purple';

          const logEntry = {
            id: nextBuildId++,
            type: 'success',
            tagText: 'GC Reclaim',
            tagClass: 'tag tag-success',
            message: `Server Garbage Collection executed (Heap: ${allocMB} MB)`,
            time: getFormattedTime()
          };
          state.activityLog = MetricCalculator.trimActivityLog([logEntry, ...state.activityLog]);
          state.statusMessage = `${getFormattedTime()} (Server Garbage Collection complete)`;
          pushSparkline('memory', state.memoryMB);
          render();
          triggerCardPulse(memoryCardEl);
          return;
        }
      } catch (_) {
        // Fallback to simulated GC
      }
    }

    const simulated = MetricCalculator.simulateMemoryChange(state.memoryMB, -65);
    state.memoryMB = simulated.memoryMB;
    state.memoryTagText = simulated.tagText;
    state.memoryTagClass = simulated.tagClass;

    const logEntry = {
      id: nextBuildId++,
      type: 'success',
      tagText: 'GC Reclaim',
      tagClass: 'tag tag-success',
      message: `Simulated Garbage Collection reclaimed 65 MB heap`,
      time: getFormattedTime()
    };
    state.activityLog = MetricCalculator.trimActivityLog([logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (Simulated GC executed: -65 MB)`;
    pushSparkline('memory', state.memoryMB);
    render();
    triggerCardPulse(memoryCardEl);
  }

  function handleSimulateAlloc() {
    const simulated = MetricCalculator.simulateMemoryChange(state.memoryMB, 85);
    state.memoryMB = simulated.memoryMB;
    state.memoryTagText = simulated.tagText;
    state.memoryTagClass = simulated.tagClass;

    const logEntry = {
      id: nextBuildId++,
      type: 'queued',
      tagText: 'Allocated',
      tagClass: simulated.tagClass === 'tag tag-danger' ? 'tag tag-danger' : 'tag tag-warning',
      message: `Simulated load allocated +85 MB (Total: ${simulated.memoryMB} MB)`,
      time: getFormattedTime()
    };
    state.activityLog = MetricCalculator.trimActivityLog([logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (Simulated allocation: +85 MB)`;
    pushSparkline('memory', state.memoryMB);
    render();
    triggerCardPulse(memoryCardEl);
  }

  function handleExportJSON() {
    const clientInfo = {
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
      density: document.documentElement.getAttribute('data-density') || 'comfortable',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
      serverStatus: statusTextEl ? statusTextEl.textContent : 'Unknown',
      environment: typeof window !== 'undefined' && window.location.protocol === 'file:' ? 'Local File' : 'HTTP Server'
    };
    const snapshot = MetricCalculator.generateDiagnosticSnapshot(state, clientInfo);
    const jsonStr = JSON.stringify(snapshot, null, 2);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `dev-dashboard-snapshot-${Date.now()}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);

    state.statusMessage = `${getFormattedTime()} (Diagnostic JSON snapshot exported)`;
    render();
  }

  async function handleCopyReport() {
    const clientInfo = {
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
      density: document.documentElement.getAttribute('data-density') || 'comfortable',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
      serverStatus: statusTextEl ? statusTextEl.textContent : 'Unknown'
    };
    const snapshot = MetricCalculator.generateDiagnosticSnapshot(state, clientInfo);
    const markdown = MetricCalculator.formatMarkdownReport(snapshot);

    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(markdown);
        copied = true;
      } catch (_) {
        copied = false;
      }
    }

    state.statusMessage = copied
      ? `${getFormattedTime()} (Markdown report copied to clipboard!)`
      : `${getFormattedTime()} (Report generated; clipboard access unavailable)`;
    render();
  }

  function handleClearLog() {
    state.activityLog = [];
    state.statusMessage = `${getFormattedTime()} (Activity log cleared)`;
    render();
  }

  function setSeverityFilter(severity) {
    state.filterSeverity = severity;
    filterButtons.forEach(btn => {
      const match = btn.id === `btn-filter-${severity}`;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });
    renderActivityList();
  }

  const commands = [
    { id: 'cmd-traffic-spike', title: 'Simulate Traffic Spike', category: 'Actions', icon: '⚡', action: handleTrafficSpike },
    { id: 'cmd-traffic-reset', title: 'Reset Traffic', category: 'Actions', icon: '🔄', action: handleReset },
    { id: 'cmd-queue-build', title: 'Queue Build Job', category: 'Actions', icon: '⚙️', action: handleQueueBuild },
    { id: 'cmd-complete-build', title: 'Complete Build Job', category: 'Actions', icon: '✅', action: handleCompleteBuild },
    { id: 'cmd-fail-build', title: 'Simulate Failed Build', category: 'Actions', icon: '❌', action: handleFailBuild },
    { id: 'cmd-trigger-gc', title: 'Trigger Server Garbage Collection', category: 'Actions', icon: '🧹', action: handleTriggerGC },
    { id: 'cmd-sim-alloc', title: 'Simulate Memory Allocation', category: 'Actions', icon: '💾', action: handleSimulateAlloc },
    { id: 'cmd-density-compact', title: 'Switch to Compact View Density', category: 'View', icon: '📐', action: () => setDensity('compact') },
    { id: 'cmd-density-comfortable', title: 'Switch to Comfortable View Density', category: 'View', icon: '📏', action: () => setDensity('comfortable') },
    { id: 'cmd-theme-toggle', title: 'Toggle Dark / Light Theme', category: 'View', icon: '🌓', action: () => btnThemeToggle && btnThemeToggle.click() },
    { id: 'cmd-refresh-probes', title: 'Refresh Service Probes', category: 'Probes', icon: '🔍', action: pollProbes },
    { id: 'cmd-add-probe', title: 'Register Local Service Probe', category: 'Probes', icon: '➕', action: () => modalAddProbe && modalAddProbe.showModal() },
    { id: 'cmd-export-json', title: 'Export JSON Diagnostic Snapshot', category: 'Reports', icon: '📥', action: handleExportJSON },
    { id: 'cmd-copy-report', title: 'Copy Markdown Diagnostic Report', category: 'Reports', icon: '📋', action: handleCopyReport },
    { id: 'cmd-clear-log', title: 'Clear Pipeline Activity Log', category: 'Reports', icon: '🗑️', action: handleClearLog }
  ];

  let selectedPaletteIndex = 0;
  let activePaletteItems = [...commands];

  function renderPaletteList() {
    if (!paletteResults) return;
    while (paletteResults.firstChild) {
      paletteResults.removeChild(paletteResults.firstChild);
    }

    if (activePaletteItems.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'palette-item';
      emptyLi.textContent = 'No matching commands found.';
      paletteResults.appendChild(emptyLi);
      return;
    }

    activePaletteItems.forEach((cmd, idx) => {
      const li = document.createElement('li');
      li.className = `palette-item ${idx === selectedPaletteIndex ? 'active' : ''}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', idx === selectedPaletteIndex ? 'true' : 'false');

      const mainDiv = document.createElement('div');
      mainDiv.className = 'palette-item-main';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'palette-item-icon';
      iconSpan.textContent = cmd.icon;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'palette-item-title';
      titleSpan.textContent = cmd.title;

      mainDiv.appendChild(iconSpan);
      mainDiv.appendChild(titleSpan);

      const catSpan = document.createElement('span');
      catSpan.className = 'palette-item-category';
      catSpan.textContent = cmd.category;

      li.appendChild(mainDiv);
      li.appendChild(catSpan);

      li.addEventListener('click', () => {
        executePaletteItem(cmd);
      });
      li.addEventListener('mouseenter', () => {
        selectedPaletteIndex = idx;
        renderPaletteList();
      });

      paletteResults.appendChild(li);
    });
  }

  function executePaletteItem(cmd) {
    if (!cmd || typeof cmd.action !== 'function') return;
    if (modalPalette) modalPalette.close();
    cmd.action();
  }

  function openCommandPalette() {
    if (!modalPalette) return;
    activePaletteItems = [...commands];
    selectedPaletteIndex = 0;
    if (inputPalette) inputPalette.value = '';
    renderPaletteList();
    if (typeof modalPalette.showModal === 'function') {
      modalPalette.showModal();
      if (inputPalette) inputPalette.focus();
    }
  }

  if (btnOpenPalette) {
    btnOpenPalette.addEventListener('click', openCommandPalette);
  }
  if (btnClosePalette && modalPalette) {
    btnClosePalette.addEventListener('click', () => modalPalette.close());
  }

  if (inputPalette) {
    inputPalette.addEventListener('input', (e) => {
      activePaletteItems = MetricCalculator.filterCommands(commands, e.target.value);
      selectedPaletteIndex = 0;
      renderPaletteList();
    });

    inputPalette.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedPaletteIndex = (selectedPaletteIndex + 1) % Math.max(1, activePaletteItems.length);
        renderPaletteList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedPaletteIndex = (selectedPaletteIndex - 1 + activePaletteItems.length) % Math.max(1, activePaletteItems.length);
        renderPaletteList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activePaletteItems[selectedPaletteIndex]) {
          executePaletteItem(activePaletteItems[selectedPaletteIndex]);
        }
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if ((isCmdOrCtrl && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SEARCH')) {
        e.preventDefault();
        openCommandPalette();
      }
    });
  }

  const mainContainer = document.getElementById('main-content');
  const sections = Array.from(document.querySelectorAll('main > section[draggable="true"]'));

  let draggedSection = null;

  sections.forEach(section => {
    section.addEventListener('dragstart', (e) => {
      draggedSection = section;
      section.classList.add('section-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', section.id);
    });

    section.addEventListener('dragend', () => {
      if (draggedSection) {
        draggedSection.classList.remove('section-dragging');
      }
      sections.forEach(s => s.classList.remove('section-drag-over'));
      draggedSection = null;
    });

    section.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      section.classList.add('section-drag-over');
    });

    section.addEventListener('dragleave', () => {
      section.classList.remove('section-drag-over');
    });

    section.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('section-drag-over');
      if (draggedSection && draggedSection !== section && mainContainer) {
        const currentSections = Array.from(mainContainer.querySelectorAll('main > section'));
        const draggedIndex = currentSections.indexOf(draggedSection);
        const targetIndex = currentSections.indexOf(section);

        if (draggedIndex < targetIndex) {
          mainContainer.insertBefore(draggedSection, section.nextSibling);
        } else {
          mainContainer.insertBefore(draggedSection, section);
        }

        const newOrder = Array.from(mainContainer.querySelectorAll('main > section')).map(s => s.id).filter(Boolean);
        safeStorage.set(LAYOUT_STORAGE_KEY, JSON.stringify(newOrder));
      }
    });
  });

  try {
    const savedLayout = safeStorage.get(LAYOUT_STORAGE_KEY);
    if (savedLayout && mainContainer) {
      const orderIds = JSON.parse(savedLayout);
      if (Array.isArray(orderIds)) {
        orderIds.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.parentElement === mainContainer) {
            mainContainer.appendChild(el);
          }
        });
      }
    }
  } catch (_) {
  }

  if (btnTrafficSpike) btnTrafficSpike.addEventListener('click', handleTrafficSpike);
  if (btnReset) btnReset.addEventListener('click', handleReset);
  if (btnQueueBuild) btnQueueBuild.addEventListener('click', handleQueueBuild);
  if (btnCompleteBuild) btnCompleteBuild.addEventListener('click', handleCompleteBuild);
  if (btnFailBuild) btnFailBuild.addEventListener('click', handleFailBuild);
  if (btnTriggerGC) btnTriggerGC.addEventListener('click', handleTriggerGC);
  if (btnSimulateAlloc) btnSimulateAlloc.addEventListener('click', handleSimulateAlloc);
  if (btnExportJSON) btnExportJSON.addEventListener('click', handleExportJSON);
  if (btnCopyReport) btnCopyReport.addEventListener('click', handleCopyReport);
  if (btnClearLog) btnClearLog.addEventListener('click', handleClearLog);

  if (btnFilterAll) btnFilterAll.addEventListener('click', () => setSeverityFilter('all'));
  if (btnFilterQueued) btnFilterQueued.addEventListener('click', () => setSeverityFilter('queued'));
  if (btnFilterSuccess) btnFilterSuccess.addEventListener('click', () => setSeverityFilter('success'));
  if (btnFilterFailed) btnFilterFailed.addEventListener('click', () => setSeverityFilter('failed'));

  if (activitySearchInput) {
    activitySearchInput.addEventListener('input', (e) => {
      state.filterSearch = e.target.value;
      renderActivityList();
    });
  }

  // Initial render
  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
}

// Export for Node.js automated test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { safeStorage, MetricCalculator, initTrustedTypes };
}
