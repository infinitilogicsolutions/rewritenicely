/**
 * RewriteNicely — Browser AI API Detector & Engine
 * Probes Chrome Gemini Nano / window.ai / W3C AI specifications
 * Dynamically switches background color to Green (Available) or Magenta (Unavailable)
 */

// Application State
const state = {
  isSecureContext: window.isSecureContext,
  simulationMode: 'auto', // 'auto' | 'green' | 'magenta'
  displayMode: 'ambient',  // 'ambient' | 'solid'
  detectedAvailable: false,
  probeResults: {},
  activeSession: null
};

// DOM Element References
const elements = {
  body: document.body,
  statusBadge: document.getElementById('statusBadge'),
  heroHeading: document.getElementById('heroHeading'),
  heroDescription: document.getElementById('heroDescription'),
  colorStateValue: document.getElementById('colorStateValue'),
  secureContextValue: document.getElementById('secureContextValue'),
  detectionSourceValue: document.getElementById('detectionSourceValue'),
  capabilityList: document.getElementById('capabilityList'),
  diagnosticsOutput: document.getElementById('diagnosticsOutput'),
  btnModeAmbient: document.getElementById('btnModeAmbient'),
  btnModeSolid: document.getElementById('btnModeSolid'),
  btnSimAuto: document.getElementById('btnSimAuto'),
  btnSimGreen: document.getElementById('btnSimGreen'),
  btnSimMagenta: document.getElementById('btnSimMagenta'),
  btnRefreshProbe: document.getElementById('btnRefreshProbe'),
  aiPromptForm: document.getElementById('aiPromptForm'),
  promptInput: document.getElementById('promptInput'),
  btnExecuteAI: document.getElementById('btnExecuteAI'),
  btnUseSample: document.getElementById('btnUseSample'),
  aiOutput: document.getElementById('aiOutput'),
  workbenchTag: document.getElementById('workbenchTag'),
  toast: document.getElementById('toast')
};

/**
 * Toast Notification Utility
 */
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2600);
}

/**
 * Normalizes capability availability string
 */
function normalizeStatus(val) {
  if (val === 'readily' || val === 'available' || val === true) return 'ready';
  if (val === 'after-download' || val === 'downloading') return 'download';
  return 'none';
}

/**
 * Core AI API Probe Engine
 */
async function probeBrowserAI() {
  const results = {
    timestamp: new Date().toISOString(),
    isSecureContext: window.isSecureContext,
    origin: window.location.origin,
    userAgent: navigator.userAgent,
    namespaces: {
      hasWindowAI: typeof window.ai !== 'undefined',
      hasSelfAI: typeof self.ai !== 'undefined',
      hasTranslation: typeof window.translation !== 'undefined'
    },
    apis: {
      languageModel: { supported: false, status: 'unsupported', details: null },
      rewriter: { supported: false, status: 'unsupported', details: null },
      writer: { supported: false, status: 'unsupported', details: null },
      summarizer: { supported: false, status: 'unsupported', details: null },
      languageDetector: { supported: false, status: 'unsupported', details: null },
      translator: { supported: false, status: 'unsupported', details: null }
    }
  };

  const aiObj = window.ai || self.ai;

  // 1. LanguageModel / Prompt API
  if (aiObj && aiObj.languageModel) {
    results.apis.languageModel.supported = true;
    try {
      if (typeof aiObj.languageModel.availability === 'function') {
        const avail = await aiObj.languageModel.availability();
        results.apis.languageModel.status = avail;
        results.apis.languageModel.details = `availability(): ${avail}`;
      } else if (typeof aiObj.languageModel.capabilities === 'function') {
        const caps = await aiObj.languageModel.capabilities();
        results.apis.languageModel.status = caps.available;
        results.apis.languageModel.details = `capabilities(): ${caps.available}`;
      }
    } catch (err) {
      results.apis.languageModel.details = `Error: ${err.message}`;
    }
  } else if (aiObj && typeof aiObj.canCreateTextSession === 'function') {
    // Legacy Chrome Canary window.ai
    results.apis.languageModel.supported = true;
    try {
      const can = await aiObj.canCreateTextSession();
      results.apis.languageModel.status = can === 'readily' ? 'ready' : can;
      results.apis.languageModel.details = `canCreateTextSession(): ${can}`;
    } catch (e) {
      results.apis.languageModel.details = e.message;
    }
  }

  // 2. Rewriter API (Directly matches rewritenicely purpose!)
  if (aiObj && aiObj.rewriter) {
    results.apis.rewriter.supported = true;
    try {
      if (typeof aiObj.rewriter.availability === 'function') {
        const avail = await aiObj.rewriter.availability();
        results.apis.rewriter.status = avail;
        results.apis.rewriter.details = `availability(): ${avail}`;
      } else if (typeof aiObj.rewriter.capabilities === 'function') {
        const caps = await aiObj.rewriter.capabilities();
        results.apis.rewriter.status = caps.available;
        results.apis.rewriter.details = `capabilities(): ${caps.available}`;
      }
    } catch (err) {
      results.apis.rewriter.details = `Error: ${err.message}`;
    }
  }

  // 3. Writer API
  if (aiObj && aiObj.writer) {
    results.apis.writer.supported = true;
    try {
      if (typeof aiObj.writer.availability === 'function') {
        const avail = await aiObj.writer.availability();
        results.apis.writer.status = avail;
        results.apis.writer.details = `availability(): ${avail}`;
      } else if (typeof aiObj.writer.capabilities === 'function') {
        const caps = await aiObj.writer.capabilities();
        results.apis.writer.status = caps.available;
        results.apis.writer.details = `capabilities(): ${caps.available}`;
      }
    } catch (err) {
      results.apis.writer.details = `Error: ${err.message}`;
    }
  }

  // 4. Summarizer API
  if (aiObj && aiObj.summarizer) {
    results.apis.summarizer.supported = true;
    try {
      if (typeof aiObj.summarizer.availability === 'function') {
        const avail = await aiObj.summarizer.availability();
        results.apis.summarizer.status = avail;
        results.apis.summarizer.details = `availability(): ${avail}`;
      } else if (typeof aiObj.summarizer.capabilities === 'function') {
        const caps = await aiObj.summarizer.capabilities();
        results.apis.summarizer.status = caps.available;
        results.apis.summarizer.details = `capabilities(): ${caps.available}`;
      }
    } catch (err) {
      results.apis.summarizer.details = `Error: ${err.message}`;
    }
  }

  // 5. Language Detector & Translator
  if (aiObj && aiObj.languageDetector) {
    results.apis.languageDetector.supported = true;
    try {
      const caps = typeof aiObj.languageDetector.capabilities === 'function'
        ? await aiObj.languageDetector.capabilities()
        : null;
      results.apis.languageDetector.status = caps?.available || 'present';
    } catch (e) {
      results.apis.languageDetector.details = e.message;
    }
  }

  if (window.translation && typeof window.translation.canTranslate === 'function') {
    results.apis.translator.supported = true;
    try {
      const can = await window.translation.canTranslate({ sourceLanguage: 'en', targetLanguage: 'es' });
      results.apis.translator.status = can;
    } catch (e) {
      results.apis.translator.details = e.message;
    }
  }

  // Determine overall AI availability
  const hasReadyAI = Object.values(results.apis).some(
    api => api.supported && ['ready', 'readily', 'available', 'after-download'].includes(api.status)
  );

  state.detectedAvailable = hasReadyAI;
  state.probeResults = results;

  return results;
}

/**
 * Updates UI based on current state (detected or simulated)
 */
function applyVisualTheme() {
  let isAvailable = state.detectedAvailable;

  if (state.simulationMode === 'green') {
    isAvailable = true;
  } else if (state.simulationMode === 'magenta') {
    isAvailable = false;
  }

  // Manage body classes for Color switching
  elements.body.classList.remove('state-probing');
  if (isAvailable) {
    elements.body.classList.add('state-available');
    elements.body.classList.remove('state-unavailable');

    // Content updates for GREEN state
    elements.statusBadge.textContent = 'AI API Available';
    elements.heroHeading.textContent = 'Browser AI API is Available';
    elements.heroDescription.innerHTML =
      'Built-in AI APIs (Gemini Nano / <code>window.ai</code>) were detected and ready for on-device execution. The background is now set to <strong>Green</strong>.';
    elements.colorStateValue.textContent = 'GREEN (#00E676 / Emerald)';
    elements.workbenchTag.textContent = 'Ready for Inference';
    elements.workbenchTag.className = 'pill-tag pill-info';
    elements.btnExecuteAI.disabled = false;
  } else {
    elements.body.classList.add('state-unavailable');
    elements.body.classList.remove('state-available');

    // Content updates for MAGENTA state
    elements.statusBadge.textContent = 'AI API Unavailable';
    elements.heroHeading.textContent = 'Browser AI API Not Detected';
    elements.heroDescription.innerHTML =
      'No active Built-in AI APIs (<code>window.ai</code> / Gemini Nano) were detected in this browser session. The background is set to <strong>Magenta</strong>.';
    elements.colorStateValue.textContent = 'MAGENTA (#FF1493 / Neon)';
    elements.workbenchTag.textContent = 'AI Unavailable (Simulation Ready)';
    elements.workbenchTag.className = 'pill-tag';
  }

  // Secure context info
  elements.secureContextValue.textContent = state.isSecureContext
    ? 'Yes (Secure localhost/HTTPS)'
    : 'No (Insecure — window.ai is disabled)';

  // Detection source
  if (state.simulationMode === 'auto') {
    elements.detectionSourceValue.textContent = 'Live Browser Probe';
  } else {
    elements.detectionSourceValue.textContent = `Simulation (${state.simulationMode.toUpperCase()})`;
  }

  // Render capability list
  renderCapabilityList();

  // Render raw telemetry
  elements.diagnosticsOutput.textContent = JSON.stringify(state.probeResults, null, 2);
}

/**
 * Render capability matrix cards
 */
function renderCapabilityList() {
  const apis = state.probeResults.apis || {};

  const items = [
    {
      name: 'ai.languageModel',
      desc: 'Prompt API for Gemini Nano text generation',
      data: apis.languageModel
    },
    {
      name: 'ai.rewriter',
      desc: 'Specialized API for rewriting, tone shifting, and polishing',
      data: apis.rewriter
    },
    {
      name: 'ai.writer',
      desc: 'Generative writing assistant API',
      data: apis.writer
    },
    {
      name: 'ai.summarizer',
      desc: 'On-device document and passage summarization',
      data: apis.summarizer
    },
    {
      name: 'ai.languageDetector',
      desc: 'Zero-latency on-device language identification',
      data: apis.languageDetector
    },
    {
      name: 'translation / translator',
      desc: 'Offline and browser-native neural translation',
      data: apis.translator
    }
  ];

  elements.capabilityList.innerHTML = items.map(item => {
    let badgeClass = 'badge-none';
    let label = 'Not Supported';

    if (state.simulationMode === 'green') {
      badgeClass = 'badge-ready';
      label = 'Ready (Sim)';
    } else if (state.simulationMode === 'magenta') {
      badgeClass = 'badge-none';
      label = 'Unavailable';
    } else if (item.data && item.data.supported) {
      const norm = normalizeStatus(item.data.status);
      if (norm === 'ready') {
        badgeClass = 'badge-ready';
        label = item.data.status || 'Ready';
      } else if (norm === 'download') {
        badgeClass = 'badge-download';
        label = 'Downloading';
      } else {
        badgeClass = 'badge-none';
        label = item.data.status || 'No';
      }
    }

    return `
      <div class="capability-item">
        <div class="cap-left">
          <span class="cap-name">${item.name}</span>
          <span class="cap-desc">${item.desc}</span>
        </div>
        <span class="cap-badge ${badgeClass}">${label}</span>
      </div>
    `;
  }).join('');
}

/**
 * Setup Event Listeners
 */
function initEventListeners() {
  // Display Mode toggles (Ambient vs Solid)
  elements.btnModeAmbient.addEventListener('click', () => {
    state.displayMode = 'ambient';
    elements.body.classList.remove('mode-solid');
    elements.body.classList.add('mode-ambient');
    elements.btnModeAmbient.classList.add('active');
    elements.btnModeSolid.classList.remove('active');
  });

  elements.btnModeSolid.addEventListener('click', () => {
    state.displayMode = 'solid';
    elements.body.classList.add('mode-solid');
    elements.body.classList.remove('mode-ambient');
    elements.btnModeSolid.classList.add('active');
    elements.btnModeAmbient.classList.remove('active');
  });

  // Simulation controls
  elements.btnSimAuto.addEventListener('click', () => {
    state.simulationMode = 'auto';
    updateSimButtons(elements.btnSimAuto);
    applyVisualTheme();
    showToast('Switched to Live Auto-Detection');
  });

  elements.btnSimGreen.addEventListener('click', () => {
    state.simulationMode = 'green';
    updateSimButtons(elements.btnSimGreen);
    applyVisualTheme();
    showToast('Simulating Green State (AI Available)');
  });

  elements.btnSimMagenta.addEventListener('click', () => {
    state.simulationMode = 'magenta';
    updateSimButtons(elements.btnSimMagenta);
    applyVisualTheme();
    showToast('Simulating Magenta State (AI Unavailable)');
  });

  function updateSimButtons(activeBtn) {
    [elements.btnSimAuto, elements.btnSimGreen, elements.btnSimMagenta].forEach(btn => {
      btn.classList.remove('active');
    });
    activeBtn.classList.add('active');
  }

  // Re-scan button
  elements.btnRefreshProbe.addEventListener('click', async () => {
    elements.btnRefreshProbe.disabled = true;
    elements.capabilityList.innerHTML = '<div class="capability-loading">Re-scanning APIs...</div>';
    await probeBrowserAI();
    applyVisualTheme();
    elements.btnRefreshProbe.disabled = false;
    showToast('Re-scan completed');
  });

  // Sample prompt button
  elements.btnUseSample.addEventListener('click', () => {
    const samples = [
      'Rewrite politely for an executive: The deadline is impossible and we need 2 more weeks.',
      'Polish this sentence to be concise and crisp: In view of the fact that we are currently experiencing latency, changes will be implemented.',
      'Explain in one friendly sentence why browser-native AI is fast and private.'
    ];
    elements.promptInput.value = samples[Math.floor(Math.random() * samples.length)];
    elements.promptInput.focus();
  });

  // Prompt / Rewrite Submission
  elements.aiPromptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = elements.promptInput.value.trim();
    if (!query) return;

    elements.btnExecuteAI.disabled = true;
    elements.aiOutput.textContent = 'Generating on-device response...';

    try {
      const aiObj = window.ai || self.ai;

      // Try Real Rewriter API
      if (aiObj && aiObj.rewriter && typeof aiObj.rewriter.create === 'function') {
        const rewriter = await aiObj.rewriter.create({ tone: 'more-formal', length: 'as-is' });
        const result = await rewriter.rewrite(query);
        elements.aiOutput.textContent = `[Rewriter API Result]:\n\n${result}`;
        return;
      }

      // Try Real LanguageModel (Prompt API)
      if (aiObj && aiObj.languageModel && typeof aiObj.languageModel.create === 'function') {
        const session = await aiObj.languageModel.create();
        elements.aiOutput.textContent = '';
        if (typeof session.promptStreaming === 'function') {
          const stream = session.promptStreaming(query);
          for await (const chunk of stream) {
            elements.aiOutput.textContent = chunk;
          }
        } else {
          const result = await session.prompt(query);
          elements.aiOutput.textContent = result;
        }
        return;
      }

      // Simulated Demonstration Stream (when Gemini Nano is not enabled locally)
      await runSimulatedInference(query);
    } catch (err) {
      elements.aiOutput.textContent = `Execution Error: ${err.message}\nFalling back to simulated result:\n\n`;
      await runSimulatedInference(query);
    } finally {
      elements.btnExecuteAI.disabled = false;
    }
  });

  // Copy Chrome Flag buttons
  document.querySelectorAll('.copy-flag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const flag = btn.getAttribute('data-flag');
      navigator.clipboard.writeText(flag).then(() => {
        showToast(`Copied flag: ${flag}`);
      });
    });
  });
}

/**
 * Simulates streaming token output for demo purposes
 */
async function runSimulatedInference(query) {
  const simulatedResponses = [
    `"Here is a refined, professional version:\n\n'I wanted to touch base regarding the proposed timeline. With our current scope, a two-week extension would ensure the deliverable meets our highest quality standards. Thank you for your flexibility.'"`,
    `"Polished and concise rewrite:\n\n'Due to current system latency, performance optimizations are now underway.'"`,
    `"Browser-native AI processes queries directly on your device via Gemini Nano, ensuring your data never leaves your hardware while delivering zero-latency results."`
  ];

  const responseText = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
  elements.aiOutput.textContent = '[Simulated Output]: ';

  for (let i = 0; i < responseText.length; i++) {
    elements.aiOutput.textContent += responseText[i];
    await new Promise(r => setTimeout(r, 18));
  }
}

/**
 * Application Bootstrap
 */
async function initApp() {
  initEventListeners();
  await probeBrowserAI();
  applyVisualTheme();
}

// Kickoff when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
