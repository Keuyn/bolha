const state = {
  mode: 'local',
  theme: localStorage.getItem('md-reader-theme') || 'dark',
  rawMarkdown: ''
};

const $ = id => document.getElementById(id);
const $$ = (sel, ctx) => (ctx || document).querySelectorAll(sel);

const els = {
  modeBtns: $$('[data-mode]'),
  modeSections: {
    upload: $('mode-upload'),
    paste: $('mode-paste'),
    url: $('mode-url'),
    local: $('mode-local')
  },
  rawContent: $('raw-content'),
  content: $('content'),
  splitView: $('split-view'),
  emptyState: $('empty-state'),
  themeToggle: $('theme-toggle'),
  btnDownload: $('btn-download'),
  btnCopy: $('btn-copy'),
  fileInput: $('file-input'),
  dropZone: $('drop-zone'),
  pasteArea: $('paste-area'),
  btnRenderPaste: $('btn-render-paste'),
  urlInput: $('url-input'),
  btnFetchUrl: $('btn-fetch-url'),
  hlCss: $('highlight-css')
};

function render(markdown) {
  state.rawMarkdown = markdown;
  els.rawContent.textContent = markdown;

  els.content.innerHTML = marked.parse(markdown, { breaks: true, gfm: true });

  els.content.querySelectorAll('pre code').forEach(el => {
    hljs.highlightElement(el);
  });

  els.splitView.classList.add('visible');
  els.emptyState.style.display = 'none';
}

function setMode(mode) {
  state.mode = mode;

  els.modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  Object.entries(els.modeSections).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== mode);
  });

  if (mode === 'local') {
    loadLocal();
  }
}

function loadLocal() {
  els.splitView.classList.remove('visible');
  els.emptyState.style.display = 'flex';

  fetch('README.md')
    .then(r => {
      if (!r.ok) throw new Error('README.md não encontrado no diretório');
      return r.text();
    })
    .then(render)
    .catch(err => {
      els.emptyState.textContent = err.message;
    });
}

els.modeBtns.forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

els.fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => render(reader.result);
  reader.readAsText(file);
});

els.dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  els.dropZone.classList.add('dragover');
});

els.dropZone.addEventListener('dragleave', () => {
  els.dropZone.classList.remove('dragover');
});

els.dropZone.addEventListener('drop', e => {
  e.preventDefault();
  els.dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.md')) {
    alert('Por favor, arraste um arquivo .md');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => render(reader.result);
  reader.readAsText(file);
});

els.btnRenderPaste.addEventListener('click', () => {
  const text = els.pasteArea.value;
  if (!text.trim()) return;
  render(text);
});

els.pasteArea.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    els.btnRenderPaste.click();
  }
});

els.btnFetchUrl.addEventListener('click', fetchUrl);
els.urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchUrl();
});

function fetchUrl() {
  const url = els.urlInput.value.trim();
  if (!url) return;

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`Falha ao carregar (${r.status})`);
      return r.text();
    })
    .then(render)
    .catch(err => {
      alert('Erro: ' + err.message);
    });
}

const themes = {
  dark: {
    toggleText: '☀️',
    hlTheme: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css'
  },
  light: {
    toggleText: '🌙',
    hlTheme: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css'
  }
};

function setTheme(theme) {
  state.theme = theme;
  const t = themes[theme];
  document.documentElement.setAttribute('data-theme', theme);
  els.themeToggle.textContent = t.toggleText;
  els.hlCss.href = t.hlTheme;
  els.content.dataset.colorMode = theme;
  localStorage.setItem('md-reader-theme', theme);
}

els.themeToggle.addEventListener('click', () => {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
});

els.btnDownload.addEventListener('click', () => {
  const html = els.content.innerHTML;
  const theme = state.theme;
  const bg = theme === 'dark' ? '#0d1117' : '#fff';
  const colorMode = theme;

  const full = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>README</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown.min.css">
<style>body{margin:0;padding:40px;background:${bg}}img{max-width:100%}</style>
</head>
<body>
<article class="markdown-body" data-color-mode="${colorMode}">
${html}
</article>
</body>
</html>`;

  const blob = new Blob([full], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'README.html';
  a.click();
  URL.revokeObjectURL(a.href);
});

els.btnCopy.addEventListener('click', () => {
  navigator.clipboard.writeText(els.content.innerHTML)
    .then(() => {
      const orig = els.btnCopy.textContent;
      els.btnCopy.textContent = '✅';
      els.btnCopy.disabled = true;
      setTimeout(() => {
        els.btnCopy.textContent = orig;
        els.btnCopy.disabled = false;
      }, 2000);
    })
    .catch(() => {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(els.content);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
    });
});

setTheme(state.theme);
setMode('local');
