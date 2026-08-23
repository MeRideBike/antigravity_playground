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
  }
};

// Dashboard Application
function initDashboard() {
  const trafficValueEl = document.getElementById('val-traffic');
  const trafficTagEl = document.getElementById('traffic-tag');
  const trafficCardEl = document.getElementById('card-traffic');

  const buildsValueEl = document.getElementById('val-builds');
  const buildsCardEl = document.getElementById('card-builds');
  const buildsTagEl = buildsCardEl ? buildsCardEl.querySelector('.tag') : null;

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

  // Theme Management
  const THEME_STORAGE_KEY = 'dashboard_theme';

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

  // Initialize theme with defensive allowlist check
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

  // Server Health & Telemetry Monitoring
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

  // Initial health check & periodic polling
  checkServerHealth();
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', checkServerHealth);
    setInterval(checkServerHealth, 15000);
  }

  function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // State Management
  let nextBuildId = 104;
  const state = {
    ...MetricCalculator.getBaseline(),
    statusMessage: 'Just now',
    filterSeverity: 'all',
    filterSearch: '',
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

  // High-performance animation using Web Animations API (avoids layout reflow)
  function triggerCardPulse(element) {
    if (!element || typeof element.animate !== 'function') return;
    
    // Check for reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    element.animate(
      [
        { boxShadow: '0 0 0 0 rgba(56, 189, 248, 0.45)', borderColor: 'var(--accent-primary)' },
        { boxShadow: '0 0 0 8px rgba(56, 189, 248, 0.45)', borderColor: 'var(--accent-primary)', offset: 0.5 },
        { boxShadow: 'var(--shadow-md)', borderColor: 'var(--border-color)' }
      ],
      {
        duration: 600,
        easing: 'ease-out'
      }
    );
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

    // Clear existing list items safely
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
      emptyItem.textContent = 'No events match the active search or filter criteria.';
      activityListEl.appendChild(emptyItem);
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'activity-item';

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
    renderActivityList();
  }

  function handleTrafficSpike() {
    const spikeData = MetricCalculator.calculateSpike();
    state.traffic = spikeData.traffic;
    state.delta = spikeData.delta;
    state.percentIncrease = spikeData.percentIncrease;
    state.tagText = spikeData.tagText;
    state.tagClass = spikeData.tagClass;
    state.statusMessage = `${getFormattedTime()} (Traffic Spike: ${spikeData.traffic.toLocaleString()} req/s [+${spikeData.delta.toLocaleString()} req/s])`;

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
    state.statusMessage = `${getFormattedTime()} (Reset traffic to baseline)`;

    render();
    triggerCardPulse(trafficCardEl);
  }

  function handleQueueBuild() {
    if (state.builds >= MetricCalculator.MAX_BUILDS) {
      state.statusMessage = `${getFormattedTime()} (Queue full: maximum 10 active build jobs reached)`;
      render();
      return;
    }
    const result = MetricCalculator.queueBuild(state.builds, nextBuildId++, getFormattedTime());
    state.builds = result.builds;
    state.buildTagText = result.buildTagText;
    state.buildTagClass = result.buildTagClass;
    state.activityLog = MetricCalculator.trimActivityLog([result.logEntry, ...state.activityLog]);
    state.statusMessage = `${getFormattedTime()} (${result.logEntry.message})`;

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
          render();
          triggerCardPulse(memoryCardEl);
          return;
        }
      } catch (_) {
        // Fallback to simulated GC if server error
      }
    }

    // Local simulated GC
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
    render();
    triggerCardPulse(memoryCardEl);
  }

  function handleExportJSON() {
    const clientInfo = {
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
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

  // Event Listeners
  if (btnTrafficSpike) {
    btnTrafficSpike.addEventListener('click', handleTrafficSpike);
  }
  if (btnReset) {
    btnReset.addEventListener('click', handleReset);
  }
  if (btnQueueBuild) {
    btnQueueBuild.addEventListener('click', handleQueueBuild);
  }
  if (btnCompleteBuild) {
    btnCompleteBuild.addEventListener('click', handleCompleteBuild);
  }
  if (btnFailBuild) {
    btnFailBuild.addEventListener('click', handleFailBuild);
  }
  if (btnTriggerGC) {
    btnTriggerGC.addEventListener('click', handleTriggerGC);
  }
  if (btnSimulateAlloc) {
    btnSimulateAlloc.addEventListener('click', handleSimulateAlloc);
  }
  if (btnExportJSON) {
    btnExportJSON.addEventListener('click', handleExportJSON);
  }
  if (btnCopyReport) {
    btnCopyReport.addEventListener('click', handleCopyReport);
  }
  if (btnClearLog) {
    btnClearLog.addEventListener('click', handleClearLog);
  }

  // Filter & Search Listeners
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
