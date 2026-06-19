const DESIGNER_REPOSITORY = "chuyi198452-arch/chuyi198452-arch.github.io";
const DESIGNER_BRANCH = "main";
const DESIGNER_API_VERSION = "2026-03-10";
const DESIGNER_TOKEN_STORAGE_KEY = `chu-blog:${DESIGNER_REPOSITORY}:github-token`;
const HOME_CONFIG_PATH = "_data/home.json";
const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const DEFAULT_HOME_CONFIG = {
  brand: "Chu's Blog",
  brand_mark: "C",
  meta_description: "Chu 的个人博客，记录 AI Coding、Web 开发与成长思考。",
  eyebrow: "HELLO, WORLD!",
  hero_title: "把复杂的技术，",
  hero_highlight: "写成看得懂的故事。",
  hero_intro: "你好，我是 Chu。这里记录我学习 AI Coding、搭建 Web 应用，以及一路上踩过的坑和得到的灵感。",
  primary_button: "开始阅读",
  secondary_button: "认识我",
  newsletter_eyebrow: "KEEP BUILDING",
  newsletter_title: "慢慢写，持续做。",
  newsletter_text: "这个博客会和我一起成长。下一篇，也许就是一次新的尝试。",
  newsletter_button: "了解更多",
  footer_text: "Chu. Built by hand, with a little help from AI.",
  accent: "#ff5c35",
  accent_dark: "#d83d1b",
  hero_layout: "text-left",
  hero_visual: "code",
  hero_image: "",
  hero_image_alt: "首页展示图片",
  article_columns: "2"
};

const CODE_CARD_HTML = `
  <div class="code-card" aria-label="代码装饰卡片">
    <div class="code-card-top"><i></i><i></i><i></i><span>hello.js</span></div>
    <pre><code><span class="code-purple">const</span> dream = {
  idea: <span class="code-green">"做点有趣的事"</span>,
  action: <span class="code-green">"现在就开始"</span>
};

<span class="code-purple">while</span> (dream.idea) {
  learn();
  build();
  share();
}</code></pre>
  </div>`;

const designerTokenInput = document.querySelector("#designerGithubToken");
const designerConnectButton = document.querySelector("#designerConnect");
const designerForgetButton = document.querySelector("#designerForgetToken");
const designerConnectionStatus = document.querySelector("#designerConnectionStatus");
const designerForm = document.querySelector("#pageDesignerForm");
const designerPreviewFrame = document.querySelector("#homePreviewFrame");
const designerReloadPreview = document.querySelector("#reloadDesignerPreview");
const designerSaveButton = document.querySelector("#saveHomeDesign");
const designerResult = document.querySelector("#designerResult");
const heroImageFileInput = document.querySelector("#homeHeroImageFile");
const heroImagePathInput = document.querySelector("#homeHeroImage");
const accentInput = document.querySelector("#homeAccent");
const accentDarkInput = document.querySelector("#homeAccentDark");
const accentOutput = document.querySelector("#homeAccentValue");
const accentDarkOutput = document.querySelector("#homeAccentDarkValue");

let homeConfigSha = null;
let pendingHeroImage = null;
let pendingHeroImagePreview = "";

function input(name) {
  return designerForm.elements.namedItem(name);
}

function readStoredDesignerToken() {
  try {
    return localStorage.getItem(DESIGNER_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveDesignerToken() {
  try {
    localStorage.setItem(DESIGNER_TOKEN_STORAGE_KEY, designerTokenInput.value.trim());
    return true;
  } catch {
    return false;
  }
}

function clearDesignerToken() {
  try {
    localStorage.removeItem(DESIGNER_TOKEN_STORAGE_KEY);
  } catch {
    // 浏览器禁止存储时，清空当前输入框仍然有效。
  }
  designerTokenInput.value = "";
}

function designerApiHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${designerTokenInput.value.trim()}`,
    "X-GitHub-Api-Version": DESIGNER_API_VERSION
  };
}

async function designerGithubRequest(url, options = {}, allowNotFound = false) {
  if (!designerTokenInput.value.trim()) throw new Error("请先连接 GitHub");
  const response = await fetch(url, {
    ...options,
    headers: { ...designerApiHeaders(), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const hint = response.status === 401
      ? "令牌无效或已过期"
      : response.status === 403
        ? "令牌缺少 Contents 写入权限"
        : payload.message;
    const error = new Error(hint || `GitHub 请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function base64ToUtf8(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择"));
    reader.readAsDataURL(file);
  });
}

function readHomeForm() {
  const data = new FormData(designerForm);
  return Object.fromEntries(Object.keys(DEFAULT_HOME_CONFIG).map((key) => [key, String(data.get(key) ?? "").trim()]));
}

function applyHomeConfig(config) {
  Object.entries(DEFAULT_HOME_CONFIG).forEach(([key, fallback]) => {
    const field = input(key);
    if (field) field.value = config[key] ?? fallback;
  });
  accentOutput.value = accentInput.value;
  accentDarkOutput.value = accentDarkInput.value;
  updateHomePreview();
}

function setText(documentRoot, selector, value) {
  const element = documentRoot.querySelector(selector);
  if (element) element.textContent = value;
}

function updatePreviewVisual(documentRoot, config) {
  const visual = documentRoot.querySelector("#homeHeroVisual");
  if (!visual) return;
  if (config.hero_visual === "image" && (pendingHeroImagePreview || config.hero_image)) {
    const figure = documentRoot.createElement("figure");
    figure.className = "hero-image-card";
    const image = documentRoot.createElement("img");
    image.alt = config.hero_image_alt || "首页展示图片";
    image.src = pendingHeroImagePreview || new URL(config.hero_image, designerPreviewFrame.contentWindow.location.href).href;
    figure.append(image);
    visual.replaceChildren(figure);
    return;
  }
  visual.innerHTML = CODE_CARD_HTML;
}

function updateHomePreview() {
  accentOutput.value = accentInput.value;
  accentDarkOutput.value = accentDarkInput.value;
  const config = readHomeForm();
  let documentRoot;
  try {
    documentRoot = designerPreviewFrame.contentDocument;
  } catch {
    return;
  }
  if (!documentRoot?.documentElement) return;

  documentRoot.documentElement.style.setProperty("--accent", config.accent);
  documentRoot.documentElement.style.setProperty("--accent-dark", config.accent_dark);
  setText(documentRoot, ".brand-mark", config.brand_mark);
  setText(documentRoot, ".brand > span:last-child", config.brand);
  setText(documentRoot, ".hero .eyebrow", config.eyebrow);
  setText(documentRoot, ".hero-intro", config.hero_intro);
  setText(documentRoot, ".hero-actions .primary", config.primary_button);
  setText(documentRoot, ".hero-actions .secondary", config.secondary_button);
  setText(documentRoot, ".newsletter .eyebrow", config.newsletter_eyebrow);
  setText(documentRoot, ".newsletter h2", config.newsletter_title);
  setText(documentRoot, ".newsletter p:not(.eyebrow)", config.newsletter_text);
  setText(documentRoot, ".newsletter .button", config.newsletter_button);

  const title = documentRoot.querySelector(".hero h1");
  if (title) {
    const lineBreak = documentRoot.createElement("br");
    const highlight = documentRoot.createElement("span");
    highlight.textContent = config.hero_highlight;
    title.replaceChildren(documentRoot.createTextNode(config.hero_title), lineBreak, highlight);
  }

  const hero = documentRoot.querySelector(".hero");
  if (hero) {
    hero.classList.remove("hero-layout-text-left", "hero-layout-text-right", "hero-layout-stacked");
    hero.classList.add(`hero-layout-${config.hero_layout}`);
  }

  const articleGrid = documentRoot.querySelector("#articleGrid");
  if (articleGrid) {
    articleGrid.classList.remove("article-columns-1", "article-columns-2");
    articleGrid.classList.add(`article-columns-${config.article_columns}`);
  }

  const footer = documentRoot.querySelector(".site-footer .footer-inner > p");
  if (footer) footer.textContent = `© ${new Date().getFullYear()} ${config.footer_text}`;
  updatePreviewVisual(documentRoot, config);
}

async function loadHomeConfig() {
  const apiUrl = `https://api.github.com/repos/${DESIGNER_REPOSITORY}/contents/${HOME_CONFIG_PATH}?ref=${DESIGNER_BRANCH}`;
  const payload = await designerGithubRequest(apiUrl);
  const remoteConfig = JSON.parse(base64ToUtf8(payload.content));
  homeConfigSha = payload.sha;
  pendingHeroImage = null;
  pendingHeroImagePreview = "";
  heroImageFileInput.value = "";
  applyHomeConfig({ ...DEFAULT_HOME_CONFIG, ...remoteConfig });
}

async function verifyDesignerConnection({ restored = false } = {}) {
  designerConnectButton.disabled = true;
  designerConnectionStatus.className = "form-status loading";
  designerConnectionStatus.textContent = restored ? "正在恢复连接并载入配置…" : "正在验证并载入配置…";
  try {
    const repo = await designerGithubRequest(`https://api.github.com/repos/${DESIGNER_REPOSITORY}`);
    await loadHomeConfig();
    const tokenSaved = saveDesignerToken();
    designerConnectionStatus.className = tokenSaved ? "form-status success" : "form-status error";
    designerConnectionStatus.textContent = tokenSaved
      ? `已连接并载入：${repo.full_name}`
      : "配置已载入，但浏览器禁止保存令牌";
    designerForgetButton.disabled = false;
    return true;
  } catch (error) {
    if (restored && error.status === 401) clearDesignerToken();
    designerConnectionStatus.className = "form-status error";
    designerConnectionStatus.textContent = error.message;
    return false;
  } finally {
    designerConnectButton.disabled = false;
  }
}

function imageExtension(file) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };
  return extensions[file.type];
}

async function uploadHeroImage(file) {
  const extension = imageExtension(file);
  if (!extension) throw new Error("只支持 JPG、PNG、WebP 或 GIF 图片");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("图片不能超过 3MB，请先压缩后再上传");
  const path = `assets/images/home-hero-${Date.now()}.${extension}`;
  const dataUrl = await fileToDataUrl(file);
  const content = String(dataUrl).split(",")[1];
  await designerGithubRequest(`https://api.github.com/repos/${DESIGNER_REPOSITORY}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "upload homepage hero image",
      content,
      branch: DESIGNER_BRANCH
    })
  });
  return path;
}

designerForm.addEventListener("input", updateHomePreview);
designerPreviewFrame.addEventListener("load", updateHomePreview);
designerReloadPreview.addEventListener("click", () => {
  designerPreviewFrame.contentWindow.location.reload();
});

heroImageFileInput.addEventListener("change", async () => {
  const file = heroImageFileInput.files[0];
  if (!file) {
    pendingHeroImage = null;
    pendingHeroImagePreview = "";
    updateHomePreview();
    return;
  }
  const extension = imageExtension(file);
  if (!extension || file.size > MAX_IMAGE_SIZE) {
    heroImageFileInput.value = "";
    pendingHeroImage = null;
    pendingHeroImagePreview = "";
    designerResult.hidden = false;
    designerResult.className = "publish-result error";
    designerResult.textContent = !extension ? "图片格式不支持" : "图片超过 3MB，请先压缩";
    return;
  }
  pendingHeroImage = file;
  pendingHeroImagePreview = await fileToDataUrl(file);
  input("hero_visual").value = "image";
  designerResult.hidden = true;
  updateHomePreview();
});

designerConnectButton.addEventListener("click", () => verifyDesignerConnection());
designerForgetButton.addEventListener("click", () => {
  clearDesignerToken();
  designerForgetButton.disabled = true;
  designerConnectionStatus.className = "form-status";
  designerConnectionStatus.textContent = "已从此浏览器清除令牌";
});

designerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!designerForm.reportValidity()) return;
  if (!designerTokenInput.value.trim()) {
    designerConnectionStatus.className = "form-status error";
    designerConnectionStatus.textContent = "请先连接 GitHub，再保存页面设计";
    return;
  }

  designerSaveButton.disabled = true;
  designerSaveButton.textContent = "正在保存…";
  designerResult.hidden = false;
  designerResult.className = "publish-result loading";

  try {
    const config = readHomeForm();
    if (pendingHeroImage) {
      designerResult.textContent = "正在上传首页图片…";
      config.hero_image = await uploadHeroImage(pendingHeroImage);
      heroImagePathInput.value = config.hero_image;
    }
    if (config.hero_visual === "image" && !config.hero_image) {
      throw new Error("选择自定义图片时，请先选择一张图片");
    }

    designerResult.textContent = "正在创建首页配置提交…";
    const apiUrl = `https://api.github.com/repos/${DESIGNER_REPOSITORY}/contents/${HOME_CONFIG_PATH}`;
    if (!homeConfigSha) {
      const currentFile = await designerGithubRequest(`${apiUrl}?ref=${DESIGNER_BRANCH}`, {}, true);
      homeConfigSha = currentFile?.sha || null;
    }
    const body = {
      message: "update homepage design",
      content: utf8ToBase64(`${JSON.stringify(config, null, 2)}\n`),
      branch: DESIGNER_BRANCH
    };
    if (homeConfigSha) body.sha = homeConfigSha;

    const result = await designerGithubRequest(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    homeConfigSha = result.content.sha;
    pendingHeroImage = null;
    pendingHeroImagePreview = "";
    heroImageFileInput.value = "";
    saveDesignerToken();
    designerResult.className = "publish-result success";
    designerResult.innerHTML = `
      <strong>首页设计已保存！</strong>
      <span>GitHub 提交 ${window.ChuBlog.escapeHtml(result.commit.sha.slice(0, 7))} 已创建，通常 30～90 秒后上线。</span>
      <a href="index.html" target="_blank">查看首页 →</a>`;
    designerConnectionStatus.className = "form-status success";
    designerConnectionStatus.textContent = "已连接，配置保存成功";
    updateHomePreview();
  } catch (error) {
    designerResult.className = "publish-result error";
    designerResult.textContent = `保存失败：${error.message}`;
  } finally {
    designerSaveButton.disabled = false;
    designerSaveButton.textContent = "保存到 GitHub";
  }
});

applyHomeConfig(DEFAULT_HOME_CONFIG);
const storedDesignerToken = readStoredDesignerToken();
if (storedDesignerToken) {
  designerTokenInput.value = storedDesignerToken;
  verifyDesignerConnection({ restored: true });
} else {
  designerForgetButton.disabled = true;
}
