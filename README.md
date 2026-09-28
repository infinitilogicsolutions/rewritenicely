# RewriteNicely

Private, on-device text rewriting with Chrome built-in AI or one of four browser-loaded models:

- Llama 3.2 1B Instruct (Q4_K_M, about 808 MB)
- Gemma 3 1B IT (Q4_K_M, about 806 MB)
- Qwen3 0.6B (Q4_0, about 429 MB)
- SmolLM2 135M (downloads from Hugging Face, about 101 MB)

Run `npm start`, then open `http://127.0.0.1:3000/`. Only one model is loaded at a time. Models download from Hugging Face into browser storage when selected, then run privately in the browser.
