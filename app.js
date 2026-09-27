/**
 * RewriteNicely — Minimalist In-Browser AI Text Rewriter
 * - Native AI: Used if available (Background: GREEN)
 * - Local GGUF: SmolLM2-135M (~100MB) loaded locally only if native AI is absent
 * - Dynamic Background: GREEN when AI is ready, MAGENTA when unavailable
 */

// Application State
const state = {
  hasNativeAI: false,
  localModelEnabled: false,
  localModelLoaded: false,
  localModelLoading: false,
  wllamaInstance: null
};

// DOM Elements
const elements = {
  body: document.body,
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  localModelSection: document.getElementById('localModelSection'),
  chkLocalModel: document.getElementById('chkLocalModel'),
  modelBadge: document.getElementById('modelBadge'),
  progressWrap: document.getElementById('progressWrap'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressInfo: document.getElementById('progressInfo'),
  inputText: document.getElementById('inputText'),
  btnRewrite: document.getElementById('btnRewrite'),
  btnSample: document.getElementById('btnSample'),
  btnCopy: document.getElementById('btnCopy'),
  copyBtnText: document.getElementById('copyBtnText'),
  outputBox: document.getElementById('outputBox'),
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
  }, 2800);
}

/**
 * Check if the browser supports Native Built-in AI APIs
 */
async function probeNativeAI() {
  const aiObj = window.ai || self.ai;
  if (!aiObj) return false;

  try {
    // 1. Check Rewriter API
    if (aiObj.rewriter) {
      if (typeof aiObj.rewriter.availability === 'function') {
        const avail = await aiObj.rewriter.availability();
        if (avail === 'readily' || avail === 'available') return true;
      } else if (typeof aiObj.rewriter.capabilities === 'function') {
        const caps = await aiObj.rewriter.capabilities();
        if (caps.available === 'readily') return true;
      }
    }

    // 2. Check LanguageModel (Prompt API)
    if (aiObj.languageModel) {
      if (typeof aiObj.languageModel.availability === 'function') {
        const avail = await aiObj.languageModel.availability();
        if (avail === 'readily' || avail === 'available') return true;
      } else if (typeof aiObj.languageModel.capabilities === 'function') {
        const caps = await aiObj.languageModel.capabilities();
        if (caps.available === 'readily') return true;
      }
    }

    // 3. Legacy session check
    if (typeof aiObj.canCreateTextSession === 'function') {
      const can = await aiObj.canCreateTextSession();
      if (can === 'readily') return true;
    }
  } catch (err) {
    console.warn('Native AI check encountered an error:', err);
  }

  return false;
}

/**
 * Update Background Theme & Status
 */
function updateThemeState() {
  const isAvailable = state.hasNativeAI || (state.localModelEnabled && state.localModelLoaded);

  elements.body.classList.remove('state-probing');
  if (isAvailable) {
    elements.body.classList.add('state-available');
    elements.body.classList.remove('state-unavailable');

    if (state.hasNativeAI) {
      elements.statusText.textContent = 'Chrome Native AI Active';
      elements.localModelSection.style.display = 'none'; // Hide local model toggle when native is present
    } else {
      elements.statusText.textContent = 'Local AI Ready (SmolLM2 GGUF)';
    }
  } else {
    elements.body.classList.add('state-unavailable');
    elements.body.classList.remove('state-available');

    elements.statusText.textContent = 'Native AI Unavailable';
    elements.localModelSection.style.display = 'block'; // Show local model toggle when native is missing
  }
}

/**
 * Load the local SmolLM2 GGUF model via Wllama (llama.cpp WebAssembly)
 */
async function loadLocalGGUFModel() {
  if (state.localModelLoaded && state.wllamaInstance) {
    state.localModelEnabled = true;
    updateThemeState();
    return;
  }

  try {
    state.localModelLoading = true;
    elements.progressWrap.style.display = 'flex';
    elements.progressBarFill.style.width = '10%';
    elements.progressInfo.textContent = 'Initializing WebAssembly engine...';
    elements.modelBadge.textContent = 'Loading...';

    // Import Wllama
    const { Wllama } = await import('https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/index.js');

    const configPaths = {
      'single-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/single-thread/wllama.wasm',
      'multi-thread/wllama.wasm': 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/multi-thread/wllama.wasm'
    };

    state.wllamaInstance = new Wllama(configPaths);

    elements.progressInfo.textContent = 'Loading local smollm2-135m-instruct-q4_k_m.gguf (100MB)...';
    elements.progressBarFill.style.width = '30%';

    // Load from local static server endpoint
    await state.wllamaInstance.loadModelFromUrl('/models/smollm2-135m-instruct-q4_k_m.gguf', {
      progressCallback: ({ loaded, total }) => {
        if (total > 0) {
          const pct = Math.round((loaded / total) * 100);
          elements.progressBarFill.style.width = `${Math.max(30, pct)}%`;
          elements.progressInfo.textContent = `Streaming local model weights: ${pct}% (${(loaded / 1024 / 1024).toFixed(1)}MB / ${(total / 1024 / 1024).toFixed(1)}MB)`;
        }
      }
    });

    state.localModelLoaded = true;
    state.localModelLoading = false;
    state.localModelEnabled = true;

    elements.progressBarFill.style.width = '100%';
    elements.progressInfo.textContent = 'Model loaded in memory! Ready for zero-server rewrites.';
    elements.modelBadge.textContent = 'Active (100MB)';
    elements.modelBadge.style.color = '#00e676';

    updateThemeState();
    showToast('Local GGUF model loaded! Background switched to Green.');
  } catch (err) {
    console.error('Failed to load local GGUF model:', err);
    state.localModelLoading = false;
    elements.progressInfo.textContent = `Load note: ${err.message}`;
    elements.modelBadge.textContent = 'Error';
    showToast(`Error loading model: ${err.message}`);
  }
}

/**
 * Execute Text Rewriting
 */
async function handleRewrite() {
  const text = elements.inputText.value.trim();
  if (!text) {
    elements.inputText.focus();
    showToast('Please enter text to rewrite');
    return;
  }

  elements.btnRewrite.disabled = true;
  elements.outputBox.textContent = 'Thinking and polishing your text...';

  try {
    // 1. Native AI Path
    if (state.hasNativeAI) {
      const aiObj = window.ai || self.ai;
      if (aiObj.rewriter) {
        const rewriter = await aiObj.rewriter.create({ tone: 'more-formal', length: 'as-is' });
        const result = await rewriter.rewrite(text);
        elements.outputBox.textContent = result;
        showToast('Polished using Chrome Native Rewriter AI');
        return;
      } else if (aiObj.languageModel) {
        const session = await aiObj.languageModel.create();
        const result = await session.prompt(`Rewrite politely and professionally: ${text}`);
        elements.outputBox.textContent = result;
        showToast('Polished using Chrome Native Language Model');
        return;
      }
    }

    // 2. Local SmolLM2 GGUF Path
    if (state.localModelEnabled && state.localModelLoaded && state.wllamaInstance) {
      const prompt = `<|im_start|>system\nYou are an expert writing assistant. Rewrite the following text to be professional, polite, concise, and constructive. Return only the rewritten text without explanations.<|im_end|>\n<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant\n`;

      elements.outputBox.textContent = '';
      const response = await state.wllamaInstance.createCompletion(prompt, {
        nPredict: 120,
        sampling: {
          temp: 0.3,
          top_p: 0.9
        },
        onNewToken: (token, piece, currentText) => {
          elements.outputBox.textContent = currentText.trimStart();
        }
      });

      elements.outputBox.textContent = response.trim();
      showToast('Polished using Local SmolLM2-135M GGUF');
      return;
    }

    // 3. Fallback when local model is not yet toggled on
    elements.outputBox.textContent =
      `Please enable the "Load Local AI Model (SmolLM2 GGUF)" toggle above to run the on-device AI.\n\nDemonstration rewrite:\n"I wanted to follow up regarding the budget report. Could you please share the current version when you have a moment? Thank you."`;
    showToast('Enable the Local Model toggle above to run AI');
  } catch (err) {
    console.error('Rewrite error:', err);
    elements.outputBox.textContent = `Error during rewriting: ${err.message}`;
  } finally {
    elements.btnRewrite.disabled = false;
  }
}

/**
 * Copy Output Text
 */
async function handleCopy() {
  const content = elements.outputBox.textContent.trim();
  if (!content || content.includes('Your polished, professional rewrite will appear here')) {
    showToast('Nothing to copy yet');
    return;
  }

  try {
    await navigator.clipboard.writeText(content);
    elements.copyBtnText.textContent = 'Copied!';
    elements.btnCopy.style.background = 'var(--theme-primary)';
    elements.btnCopy.style.color = '#030712';

    showToast('Copied to clipboard!');

    setTimeout(() => {
      elements.copyBtnText.textContent = 'Copy';
      elements.btnCopy.style.background = '';
      elements.btnCopy.style.color = '';
    }, 2000);
  } catch (e) {
    showToast('Failed to copy to clipboard');
  }
}

/**
 * Sample Drafts
 */
function handleSample() {
  const samples = [
    'send me the budget report right now or else',
    'The project timeline makes no sense and whoever planned this was clueless. We cannot do it.',
    'I dont know what you want me to do with this slide deck, it looks completely terrible.',
    'Hey guys this API is broken and slow fix it please asap'
  ];
  elements.inputText.value = samples[Math.floor(Math.random() * samples.length)];
  elements.inputText.focus();
}

/**
 * Event Listeners
 */
function initEvents() {
  // Local model toggle
  elements.chkLocalModel.addEventListener('change', (e) => {
    if (e.target.checked) {
      loadLocalGGUFModel();
    } else {
      state.localModelEnabled = false;
      updateThemeState();
      showToast('Local model disabled. Background reverted to Magenta.');
    }
  });

  // Buttons
  elements.btnRewrite.addEventListener('click', handleRewrite);
  elements.btnCopy.addEventListener('click', handleCopy);
  elements.btnSample.addEventListener('click', handleSample);

  // Command/Ctrl + Enter to trigger rewrite
  elements.inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRewrite();
    }
  });
}

/**
 * Initialization
 */
async function init() {
  initEvents();
  state.hasNativeAI = await probeNativeAI();
  updateThemeState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
