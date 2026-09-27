const MAX_INPUT = 12_000;
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm';
const READY_STATES = new Set(['available', 'readily']);
const MODELS = {
  llama: {
    name: 'Llama 3.2 1B Instruct', size: '808 MB', toggleId: 'chkLlamaModel', badgeId: 'llamaBadge',
    localUrl: '/models/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    remoteUrl: 'https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
  gemma: {
    name: 'Gemma 3 1B IT', size: '806 MB', toggleId: 'chkGemmaModel', badgeId: 'gemmaBadge',
    localUrl: '/models/gemma-3-1b-it-Q4_K_M.gguf',
    remoteUrl: 'https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf',
  },
  qwen: {
    name: 'Qwen3 0.6B', size: '429 MB', toggleId: 'chkQwenModel', badgeId: 'qwenBadge',
    localUrl: '/models/Qwen3-0.6B-Q4_0.gguf',
    remoteUrl: 'https://huggingface.co/ggml-org/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_0.gguf',
  },
  smol: {
    name: 'SmolLM2 135M', size: '101 MB', toggleId: 'chkLocalModel', badgeId: 'smolBadge',
    localUrl: '/models/smollm2-135m-instruct-q4_k_m.gguf', remoteUrl: null,
  },
};

const state = { nativeAI: null, activeModel: null, loading: false, wllama: null };
const el = {
  body: document.body,
  status: document.getElementById('statusText'),
  help: document.getElementById('engineHelp'),
  progress: document.getElementById('progressWrap'),
  progressBar: document.getElementById('progressBarFill'),
  progressInfo: document.getElementById('progressInfo'),
  input: document.getElementById('inputText'),
  rewrite: document.getElementById('btnRewrite'),
  sample: document.getElementById('btnSample'),
  copy: document.getElementById('btnCopy'),
  copyText: document.getElementById('copyBtnText'),
  output: document.getElementById('outputBox'),
  toast: document.getElementById('toast'),
};
const controls = Object.fromEntries(Object.entries(MODELS).map(([key, model]) => [key, {
  toggle: document.getElementById(model.toggleId),
  badge: document.getElementById(model.badgeId),
}]));

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  el.toast.textContent = message;
  el.toast.classList.add('show');
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
}

function setOutput(text, copyable = false) {
  el.output.textContent = text;
  el.output.classList.toggle('placeholder-text', !copyable);
  el.copy.disabled = !copyable;
}

function setProgress(value, message) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  el.progressBar.style.width = `${percent}%`;
  el.progress.setAttribute('aria-valuenow', String(percent));
  el.progressInfo.textContent = message;
}

function setControlsDisabled(disabled) {
  for (const { toggle } of Object.values(controls)) toggle.disabled = disabled;
}

function refreshState() {
  const usable = Boolean(state.nativeAI || state.activeModel);
  el.body.classList.remove('state-probing', 'state-available', 'state-unavailable');
  el.body.classList.add(usable ? 'state-available' : 'state-unavailable');
  el.rewrite.disabled = !usable || state.loading;
  if (state.loading) return;
  if (state.activeModel) {
    el.status.textContent = `${MODELS[state.activeModel].name} ready`;
    el.help.textContent = 'The selected model runs locally in this browser tab.';
  } else if (state.nativeAI) {
    el.status.textContent = 'Chrome on-device AI ready';
    el.help.textContent = 'Chrome AI will be used unless you select a local model.';
  } else {
    el.status.textContent = 'Select an on-device model';
    el.help.textContent = 'Choose a model to enable rewriting.';
  }
}

async function probeNativeAI() {
  for (const candidate of [
    { name: 'rewriter', api: self.Rewriter, options: { tone: 'more-formal', length: 'as-is', format: 'plain-text' } },
    { name: 'languageModel', api: self.LanguageModel, options: {} },
  ]) {
    if (!candidate.api?.availability || !candidate.api?.create) continue;
    try {
      const availability = await candidate.api.availability(candidate.options);
      if (READY_STATES.has(availability)) return { ...candidate, availability };
    } catch (error) { console.warn(`${candidate.name} probe failed`, error); }
  }

  const legacy = self.ai;
  if (!legacy) return null;
  for (const [name, api] of [['rewriter', legacy.rewriter], ['languageModel', legacy.languageModel]]) {
    if (!api?.create) continue;
    try {
      const check = api.availability || api.capabilities;
      const result = check ? await check.call(api) : null;
      const availability = typeof result === 'string' ? result : result?.available;
      if (READY_STATES.has(availability)) return { name, api, options: {}, availability, legacy: true };
    } catch (error) { console.warn(`Legacy ${name} probe failed`, error); }
  }
  return null;
}

async function localModelExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch { return false; }
}

async function loadModel(key) {
  if (state.loading || (state.activeModel === key && state.wllama)) return;
  const model = MODELS[key];
  for (const [otherKey, { toggle }] of Object.entries(controls)) {
    if (otherKey !== key) toggle.checked = false;
  }
  state.loading = true;
  setControlsDisabled(true);
  el.progress.hidden = false;
  el.status.textContent = `Loading ${model.name}…`;
  setProgress(2, 'Starting the WebAssembly engine…');
  refreshState();

  try {
    if (state.wllama?.exit) await state.wllama.exit();
    const { Wllama } = await import(`${CDN_BASE}/index.js`);
    state.wllama = new Wllama({
      'single-thread/wllama.wasm': `${CDN_BASE}/single-thread/wllama.wasm`,
      'multi-thread/wllama.wasm': `${CDN_BASE}/multi-thread/wllama.wasm`,
    });

    const localUrl = new URL(model.localUrl, window.location.href).href;
    const hasLocalCopy = await localModelExists(localUrl);
    if (!hasLocalCopy && !model.remoteUrl) throw new Error(`The bundled ${model.name} file is missing.`);
    const url = hasLocalCopy ? localUrl : model.remoteUrl;
    const source = hasLocalCopy ? 'local model' : `${model.name} download`;
    setProgress(5, hasLocalCopy ? `Loading ${model.name} from disk…` : `Downloading ${model.name} (${model.size})…`);

    await state.wllama.loadModelFromUrl(url, {
      progressCallback: ({ loaded, total }) => {
        if (!total) return;
        const percent = Math.round((loaded / total) * 100);
        setProgress(percent, `${source}: ${percent}% (${(loaded / 1024 / 1024).toFixed(0)} / ${(total / 1024 / 1024).toFixed(0)} MB)`);
      },
    });
    state.activeModel = key;
    setProgress(100, `${model.name} is ready.`);
    controls[key].badge.textContent = 'Ready';
    toast(`${model.name} is ready.`);
  } catch (error) {
    console.error('Model load failed', error);
    state.activeModel = null;
    state.wllama = null;
    controls[key].toggle.checked = false;
    controls[key].badge.textContent = 'Error';
    setProgress(0, `Could not load the model: ${error.message}`);
    toast('The selected model could not be loaded.');
  } finally {
    state.loading = false;
    setControlsDisabled(false);
    refreshState();
  }
}

async function rewriteNative(text) {
  const strategy = state.nativeAI;
  let session;
  try {
    if (strategy.name === 'rewriter') {
      session = await strategy.api.create(strategy.options);
      return await session.rewrite(text);
    }
    const options = strategy.legacy ? {} : { initialPrompts: [{ role: 'system', content: 'Rewrite the user text to be professional, polite, concise, and constructive. Return only the rewrite.' }] };
    session = await strategy.api.create(options);
    return await session.prompt(text);
  } finally { session?.destroy?.(); }
}

function modelPrompt(key, text) {
  const safe = text.replaceAll('<|', '<\u200b|');
  const instruction = 'Rewrite the user text to be professional, polite, concise, and constructive. Return only the rewritten text.';
  if (key === 'llama') {
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${instruction}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${safe}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
  }
  if (key === 'gemma') {
    return `<bos><start_of_turn>user\n${instruction}\n\n${safe}<end_of_turn>\n<start_of_turn>model\n`;
  }
  if (key === 'qwen') {
    return `<|im_start|>system\n${instruction}<|im_end|>\n<|im_start|>user\n${safe}\n/no_think<|im_end|>\n<|im_start|>assistant\n`;
  }
  return `<|im_start|>system\n${instruction}<|im_end|>\n<|im_start|>user\n${safe}<|im_end|>\n<|im_start|>assistant\n`;
}

async function rewriteLocal(text) {
  const response = await state.wllama.createCompletion(modelPrompt(state.activeModel, text), {
    nPredict: 256,
    sampling: { temp: 0.3, top_p: 0.9 },
    onNewToken: (_token, _piece, current) => setOutput(current.trimStart(), true),
  });
  return response.trim();
}

async function handleRewrite() {
  const text = el.input.value.trim();
  if (!text) { el.input.focus(); toast('Enter some text to rewrite.'); return; }
  if (text.length > MAX_INPUT) { toast('Keep the draft under 12,000 characters.'); return; }
  el.rewrite.disabled = true;
  setOutput('Thinking and polishing your text…');
  try {
    const result = state.activeModel ? await rewriteLocal(text) : await rewriteNative(text);
    if (!result) throw new Error('The model returned an empty response.');
    setOutput(result, true);
    toast('Your rewrite is ready.');
  } catch (error) {
    console.error('Rewrite failed', error);
    if (!state.activeModel) state.nativeAI = null;
    setOutput(`The rewrite could not be completed. ${error.message}`);
    toast('The rewrite failed.');
  } finally { refreshState(); }
}

function toggleModel(key, checked) {
  if (checked) loadModel(key);
  else if (state.activeModel === key) {
    state.activeModel = null;
    refreshState();
  }
}

function initEvents() {
  for (const [key, { toggle }] of Object.entries(controls)) {
    toggle.addEventListener('change', (event) => toggleModel(key, event.target.checked));
  }
  el.rewrite.addEventListener('click', handleRewrite);
  el.sample.addEventListener('click', () => { el.input.value = 'Send me the budget report right now or else.'; el.input.focus(); });
  el.copy.addEventListener('click', async () => {
    if (el.copy.disabled) return;
    try {
      await navigator.clipboard.writeText(el.output.textContent.trim());
      el.copyText.textContent = 'Copied!';
      setTimeout(() => { el.copyText.textContent = 'Copy'; }, 1800);
    } catch { toast('Clipboard access was unavailable.'); }
  });
  el.input.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !el.rewrite.disabled) {
      event.preventDefault();
      handleRewrite();
    }
  });
}

async function init() {
  initEvents();
  state.nativeAI = await probeNativeAI();
  refreshState();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
