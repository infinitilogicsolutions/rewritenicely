/**
 * RewriteNicely — Browser AI API Detector & Engine
 * Probes Chrome Gemini Nano / window.ai / W3C AI specifications
 * Supports In-Browser Local Model (SmolLM2-135M via WebGPU/WASM) with no flags required
 * Dynamically switches background color to Green (Available) or Magenta (Unavailable)
 */

// Application State
const state = {
  isSecureContext: window.isSecureContext,
  simulationMode: 'auto', // 'auto' | 'green' | 'magenta'
  displayMode: 'ambient',  // 'ambient' | 'solid'
  detectedAvailable: false,
  probeResults: {},
  activeSession: null,
  localAI: {
    enabled: false,
    loading: false,
    loaded: false,
    pipeline: null,
    device: 'webgpu',
    modelName: 'onnx-community/SmolLM2-135M-Instruct'
  }
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
  toast: document.getElementById('toast'),
  // In-Browser AI elements
  chkLocalAI: document.getElementById('chkLocalAI'),
  modelStatusBanner: document.getElementById('modelStatusBanner'),
  modelStatusText: document.getElementById('modelStatusText'),
  modelProgressBar: document.getElementById('modelProgressBar'),
  modelFileInfo: document.getElementById('modelFileInfo'),
  techDeviceBadge: document.getElementById('techDeviceBadge')
};

/**
 * Toast Notification Utility
 */
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3200);
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
    results.apis.languageModel.supported = true;
    try {
      const can = await aiObj.canCreateTextSession();
      results.apis.languageModel.status = can === 'readily' ? 'ready' : can;
      results.apis.languageModel.details = `canCreateTextSession(): ${can}`;
    } catch (e) {
      results.apis.languageModel.details = e.message;
    }
  }

  // 2. Rewriter API
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

  // Determine native AI availability
  const hasReadyAI = Object.values(results.apis).some(
    api => api.supported && ['ready', 'readily', 'available', 'after-download'].includes(api.status)
  );

  state.detectedAvailable = hasReadyAI;
  state.probeResults = results;

  return results;
}

/**
 * Updates UI based on current state (detected, local in-browser, or simulated)
 */
function applyVisualTheme() {
  let isAvailable = state.detectedAvailable;

  // Local In-Browser Model overrides if active
  if (state.localAI.enabled) {
    isAvailable = true;
  } else if (state.simulationMode === 'green') {
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
    if (state.localAI.enabled) {
      elements.statusBadge.textContent = 'In-Browser AI Active';
      elements.heroHeading.textContent = 'In-Browser AI Engine is Available';
      elements.heroDescription.innerHTML =
        `Running <strong>SmolLM2-135M</strong> on-device via <strong>${state.localAI.device.toUpperCase()}</strong>. No Chrome flags or backend server needed! The background is set to <strong>Green</strong>.`;
      elements.colorStateValue.textContent = 'GREEN (#00E676 / Emerald)';
      elements.workbenchTag.textContent = state.localAI.loaded ? 'SmolLM2-135M Ready' : 'Loading Model...';
      elements.workbenchTag.className = 'pill-tag pill-info';
      elements.detectionSourceValue.textContent = `In-Browser Model (${state.localAI.device.toUpperCase()})`;
    } else {
      elements.statusBadge.textContent = 'AI API Available';
      elements.heroHeading.textContent = 'Browser AI API is Available';
      elements.heroDescription.innerHTML =
        'Built-in AI APIs (Gemini Nano / <code>window.ai</code>) were detected and ready for on-device execution. The background is now set to <strong>Green</strong>.';
      elements.colorStateValue.textContent = 'GREEN (#00E676 / Emerald)';
      elements.workbenchTag.textContent = 'Ready for Inference';
      elements.workbenchTag.className = 'pill-tag pill-info';
      elements.detectionSourceValue.textContent = state.simulationMode === 'green' ? 'Simulation (GREEN)' : 'Live Browser Probe';
    }

    elements.btnExecuteAI.disabled = false;
  } else {
    elements.body.classList.add('state-unavailable');
    elements.body.classList.remove('state-available');

    // Content updates for MAGENTA state
    elements.statusBadge.textContent = 'AI API Unavailable';
    elements.heroHeading.textContent = 'Browser AI API Not Detected';
    elements.heroDescription.innerHTML =
      'No active Built-in AI APIs (<code>window.ai</code> / Gemini Nano) were detected. Check the <strong>In-Browser AI (SmolLM2)</strong> toggle above or follow the setup guide below. The background is set to <strong>Magenta</strong>.';
    elements.colorStateValue.textContent = 'MAGENTA (#FF1493 / Neon)';
    elements.workbenchTag.textContent = 'AI Unavailable (Simulation Ready)';
    elements.workbenchTag.className = 'pill-tag';
    elements.detectionSourceValue.textContent = state.simulationMode === 'magenta' ? 'Simulation (MAGENTA)' : 'Live Browser Probe';
  }

  // Secure context info
  elements.secureContextValue.textContent = state.isSecureContext
    ? 'Yes (Secure localhost/HTTPS)'
    : 'No (Insecure — window.ai is disabled)';

  // Render capability list
  renderCapabilityList();

  // Render raw telemetry
  elements.diagnosticsOutput.textContent = JSON.stringify({
    localAIEngine: {
      enabled: state.localAI.enabled,
      loaded: state.localAI.loaded,
      model: state.localAI.modelName,
      device: state.localAI.device
    },
    browserAI: state.probeResults
  }, null, 2);
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

  // If In-Browser AI is active or loading, prepend it as the top capability
  let localItemHtml = '';
  if (state.localAI.enabled) {
    const statusText = state.localAI.loaded ? 'Ready / Active' : (state.localAI.loading ? 'Downloading...' : 'Enabled');
    localItemHtml = `
      <div class="capability-item" style="border: 1px solid var(--theme-border); background: rgba(0, 230, 118, 0.08);">
        <div class="cap-left">
          <span class="cap-name">SmolLM2-135M-Instruct (In-Browser WebGPU/WASM)</span>
          <span class="cap-desc">Client-side neural network running locally without flags</span>
        </div>
        <span class="cap-badge badge-ready">${statusText}</span>
      </div>
    `;
  }

  elements.capabilityList.innerHTML = localItemHtml + items.map(item => {
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
 * Activate the In-Browser AI Model (SmolLM2-135M)
 */
async function activateLocalAIEngine() {
  state.localAI.enabled = true;
  elements.modelStatusBanner.style.display = 'flex';
  
  // Detect WebGPU support
  const hasWebGPU = typeof navigator.gpu !== 'undefined';
  state.localAI.device = hasWebGPU ? 'webgpu' : 'wasm';
  elements.techDeviceBadge.textContent = hasWebGPU ? 'WebGPU (Hardware Accelerated)' : 'WASM (CPU Fallback)';

  // Immediately apply Green theme
  applyVisualTheme();
  showToast(`In-Browser AI enabled via ${state.localAI.device.toUpperCase()}! Background switched to GREEN.`);

  if (state.localAI.loaded && state.localAI.pipeline) {
    elements.modelStatusText.textContent = 'Active & Ready';
    elements.modelProgressBar.style.width = '100%';
    elements.modelFileInfo.textContent = 'SmolLM2-135M loaded in memory. Ready for instant text rewriting!';
    return;
  }

  // Load Transformers.js and Model
  try {
    state.localAI.loading = true;
    elements.modelStatusText.textContent = 'Loading Transformers.js engine...';
    elements.modelProgressBar.style.width = '15%';

    // Dynamic import from CDN
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
    
    // Configure environment
    env.allowLocalModels = false;

    elements.modelStatusText.textContent = 'Downloading SmolLM2-135M weights (~80MB)...';
    elements.modelProgressBar.style.width = '30%';

    const progressCallback = (p) => {
      if (p.status === 'progress') {
        const pct = Math.round(p.progress || 0);
        elements.modelProgressBar.style.width = `${Math.max(30, pct)}%`;
        const fileName = p.file ? p.file.split('/').pop() : 'model';
        elements.modelStatusText.textContent = `Downloading ${fileName} (${pct}%)`;
        elements.modelFileInfo.textContent = `Caching weights in browser storage (${p.loaded ? (p.loaded / 1024 / 1024).toFixed(1) + 'MB' : pct + '%'})`;
      } else if (p.status === 'done') {
        elements.modelStatusText.textContent = 'Compiling WebGPU shaders...';
        elements.modelProgressBar.style.width = '90%';
      }
    };

    // Initialize text-generation pipeline
    state.localAI.pipeline = await pipeline('text-generation', state.localAI.modelName, {
      device: state.localAI.device,
      dtype: 'q4',
      progress_callback: progressCallback
    });

    state.localAI.loaded = true;
    state.localAI.loading = false;

    elements.modelProgressBar.style.width = '100%';
    elements.modelStatusText.textContent = 'Active & Ready';
    elements.modelFileInfo.textContent = 'SmolLM2-135M is cached locally in browser storage. Subsequent launches are instant!';
    elements.workbenchTag.textContent = 'SmolLM2 Ready';
    showToast('SmolLM2-135M model ready! Try rewriting in the workbench.');
    applyVisualTheme();
  } catch (err) {
    console.error('Failed to load local in-browser model:', err);
    state.localAI.loading = false;
    elements.modelStatusText.textContent = 'Load error';
    elements.modelFileInfo.textContent = `Error: ${err.message}. Check browser WebGPU permissions or network connection.`;
    showToast(`Model load note: ${err.message}`);
  }
}

/**
 * Deactivate In-Browser AI Engine
 */
function deactivateLocalAIEngine() {
  state.localAI.enabled = false;
  elements.modelStatusBanner.style.display = 'none';
  applyVisualTheme();
  showToast('In-Browser AI disabled. Reverted to browser probe.');
}

/**
 * Setup Event Listeners
 */
function initEventListeners() {
  // In-Browser AI Checkbox Toggle
  if (elements.chkLocalAI) {
    elements.chkLocalAI.addEventListener('change', (e) => {
      if (e.target.checked) {
        activateLocalAIEngine();
      } else {
        deactivateLocalAIEngine();
      }
    });
  }

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
      // 1. Check if In-Browser Local Model is active
      if (state.localAI.enabled && state.localAI.pipeline) {
        elements.aiOutput.textContent = 'Running SmolLM2-135M on-device via WebGPU...';
        
        const messages = [
          {
            role: 'system',
            content: 'You are an expert writing assistant. Rewrite the user draft to be polite, clear, concise, and professional. Return only the rewritten text.'
          },
          {
            role: 'user',
            content: query
          }
        ];

        const output = await state.localAI.pipeline(messages, {
          max_new_tokens: 100,
          temperature: 0.3,
          do_sample: false
        });

        const generated = output[0]?.generated_text;
        const answer = Array.isArray(generated) ? generated.at(-1)?.content : generated;
        elements.aiOutput.textContent = `[SmolLM2-135M In-Browser Result]:\n\n${answer || 'No response returned.'}`;
        return;
      }

      const aiObj = window.ai || self.ai;

      // 2. Try Real Native Chrome Rewriter API
      if (aiObj && aiObj.rewriter && typeof aiObj.rewriter.create === 'function') {
        const rewriter = await aiObj.rewriter.create({ tone: 'more-formal', length: 'as-is' });
        const result = await rewriter.rewrite(query);
        elements.aiOutput.textContent = `[Chrome Rewriter API Result]:\n\n${result}`;
        return;
      }

      // 3. Try Real Native Chrome LanguageModel (Prompt API)
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

      // 4. Fallback Simulated Demonstration Stream
      await runSimulatedInference(query);
    } catch (err) {
      elements.aiOutput.textContent = `Execution Note: ${err.message}\nRunning fallback rewrite demonstration:\n\n`;
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
