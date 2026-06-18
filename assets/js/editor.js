const REPOSITORY = "chuyi198452-arch/chuyi198452-arch.github.io";
const BRANCH = "main";
const API_VERSION = "2026-03-10";
const TOKEN_STORAGE_KEY = `chu-blog:${REPOSITORY}:github-token`;
const CATEGORY_LABELS = {
  "ai-coding": "AI Coding",
  web: "Web 开发",
  thinking: "成长思考"
};

const tokenInput = document.querySelector("#githubToken");
const connectionButton = document.querySelector("#testConnection");
const forgetTokenButton = document.querySelector("#forgetToken");
const connectionStatus = document.querySelector("#connectionStatus");
const editorForm = document.querySelector("#editorForm");
const titleInput = document.querySelector("#postTitle");
const slugInput = document.querySelector("#postSlug");
const categoryInput = document.querySelector("#postCategory");
const dateInput = document.querySelector("#postDate");
const summaryInput = document.querySelector("#postSummary");
const contentInput = document.querySelector("#postContent");
const preview = document.querySelector("#postPreview");
const publishButton = document.querySelector("#publishButton");
const publishResult = document.querySelector("#publishResult");
const historySelect = document.querySelector("#historyPost");
const loadPostButton = document.querySelector("#loadPost");
const newPostButton = document.querySelector("#newPost");
const historyStatus = document.querySelector("#historyStatus");
const publishModeTitle = document.querySelector("#publishModeTitle");
const publishModeHint = document.querySelector("#publishModeHint");
let slugWasEdited = false;
let availablePosts = [];
let loadedPost = null;

function localDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

dateInput.value = localDateString();

function slugify(value) {
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, "");
  return cleaned || `post-${timestamp}`;
}

function updatePreview() {
  const title = titleInput.value.trim() || "文章标题会显示在这里";
  const summary = summaryInput.value.trim() || "文章摘要会显示在这里。";
  const content = contentInput.value.trim() || "## 开始写作\n\n在左侧输入 Markdown，右侧会实时显示效果。";
  preview.innerHTML = `
    <p class="eyebrow">${window.ChuBlog.escapeHtml(CATEGORY_LABELS[categoryInput.value])}</p>
    <h1>${window.ChuBlog.escapeHtml(title)}</h1>
    <p class="lead">${window.ChuBlog.escapeHtml(summary)}</p>
    <hr>
    ${window.ChuBlog.renderMarkdown(content)}`;
}

titleInput.addEventListener("input", () => {
  if (!slugWasEdited) slugInput.value = slugify(titleInput.value);
  updatePreview();
});
slugInput.addEventListener("input", () => {
  slugWasEdited = Boolean(slugInput.value);
  slugInput.value = slugify(slugInput.value);
});
[categoryInput, summaryInput, contentInput].forEach((input) => input.addEventListener("input", updatePreview));
updatePreview();

function apiHeaders() {
  const token = tokenInput.value.trim();
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION
  };
}

function loadStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveToken() {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenInput.value.trim());
    return true;
  } catch {
    return false;
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // 浏览器禁用存储时，清空当前输入框仍然有效。
  }
  tokenInput.value = "";
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToUtf8(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest(url, options = {}, allowNotFound = false) {
  if (!tokenInput.value.trim()) throw new Error("请先输入 GitHub 令牌");
  const response = await fetch(url, {
    ...options,
    headers: { ...apiHeaders(), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const hint = response.status === 401 ? "令牌无效或已过期" : response.status === 403 ? "令牌缺少 Contents 写入权限" : payload.message;
    const error = new Error(hint || `GitHub 请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function createPostMarkdown({ title, date, category, summary, slug, content }) {
  return `---
layout: post
title: ${JSON.stringify(title)}
date: ${date} 08:00:00 +0800
category: ${category}
category_label: ${JSON.stringify(CATEGORY_LABELS[category])}
summary: ${JSON.stringify(summary)}
permalink: /posts/${slug}/
---

${content}
`;
}

function parseYamlValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'");
  return trimmed;
}

function parsePostMarkdown(markdown, fileName) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error("这篇文章缺少可识别的 YAML Front Matter");

  const metadata = {};
  match[1].split("\n").forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    metadata[line.slice(0, separator).trim()] = parseYamlValue(line.slice(separator + 1));
  });

  const fileSlug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/i, "");
  const permalinkSlug = String(metadata.permalink || "").match(/^\/posts\/([^/]+)\/?$/)?.[1];
  return {
    title: metadata.title || fileSlug,
    date: String(metadata.date || fileName.slice(0, 10)).slice(0, 10),
    category: CATEGORY_LABELS[metadata.category] ? metadata.category : "ai-coding",
    summary: metadata.summary || "",
    slug: permalinkSlug || fileSlug,
    content: match[2].replace(/^\n/, "").trimEnd()
  };
}

function resetHistoryList(message = "连接 GitHub 后自动加载") {
  availablePosts = [];
  historySelect.replaceChildren();
  const option = document.createElement("option");
  option.value = "";
  option.textContent = message;
  historySelect.append(option);
  historySelect.disabled = true;
  loadPostButton.disabled = true;
}

function setPublishingMode(isEditing) {
  publishModeTitle.textContent = isEditing ? "更新历史文章" : "发布新文章";
  publishModeHint.textContent = isEditing
    ? "保存后会更新原 Markdown 文件，文章地址保持不变。"
    : "确认预览无误后，将 Markdown 发布到 GitHub。";
  publishButton.textContent = isEditing ? "更新到 GitHub" : "发布到 GitHub";
}

function startNewPost() {
  loadedPost = null;
  editorForm.reset();
  dateInput.disabled = false;
  slugInput.disabled = false;
  dateInput.value = localDateString();
  slugWasEdited = false;
  historySelect.value = "";
  loadPostButton.disabled = true;
  publishResult.hidden = true;
  setPublishingMode(false);
  updatePreview();
}

async function loadPostList() {
  historyStatus.className = "form-status loading";
  historyStatus.textContent = "正在读取历史文章…";
  resetHistoryList("正在加载…");
  try {
    const files = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/contents/_posts?ref=${BRANCH}`);
    availablePosts = (Array.isArray(files) ? files : [])
      .filter((file) => file.type === "file" && file.name.toLowerCase().endsWith(".md"))
      .sort((a, b) => b.name.localeCompare(a.name));

    historySelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = availablePosts.length ? "选择一篇历史文章" : "暂时没有历史文章";
    historySelect.append(placeholder);
    availablePosts.forEach((file) => {
      const option = document.createElement("option");
      option.value = file.path;
      option.textContent = file.name.replace(/\.md$/i, "").replace(/^(\d{4}-\d{2}-\d{2})-/, "$1 · ");
      historySelect.append(option);
    });
    historySelect.disabled = availablePosts.length === 0;
    historyStatus.className = "form-status success";
    historyStatus.textContent = availablePosts.length ? `已找到 ${availablePosts.length} 篇文章` : "暂时没有历史文章";
  } catch (error) {
    resetHistoryList("历史文章加载失败");
    historyStatus.className = "form-status error";
    historyStatus.textContent = error.message;
  }
}

historySelect.addEventListener("change", () => {
  loadPostButton.disabled = !historySelect.value;
});

loadPostButton.addEventListener("click", async () => {
  const file = availablePosts.find((item) => item.path === historySelect.value);
  if (!file) return;
  loadPostButton.disabled = true;
  historyStatus.className = "form-status loading";
  historyStatus.textContent = "正在载入文章…";
  try {
    const payload = await githubRequest(file.url);
    const post = parsePostMarkdown(base64ToUtf8(payload.content), file.name);
    loadedPost = { path: file.path, sha: payload.sha };
    titleInput.value = post.title;
    slugInput.value = post.slug;
    categoryInput.value = post.category;
    dateInput.value = post.date;
    summaryInput.value = post.summary;
    contentInput.value = post.content;
    slugInput.disabled = true;
    dateInput.disabled = true;
    slugWasEdited = true;
    publishResult.hidden = true;
    setPublishingMode(true);
    updatePreview();
    historyStatus.className = "form-status success";
    historyStatus.textContent = `正在修改：${post.title}`;
  } catch (error) {
    historyStatus.className = "form-status error";
    historyStatus.textContent = error.message;
  } finally {
    loadPostButton.disabled = !historySelect.value;
  }
});

newPostButton.addEventListener("click", startNewPost);

async function verifyConnection({ remember = true, restored = false } = {}) {
  connectionButton.disabled = true;
  connectionStatus.className = "form-status loading";
  connectionStatus.textContent = restored ? "正在恢复已保存的连接…" : "正在验证…";
  try {
    const repo = await githubRequest(`https://api.github.com/repos/${REPOSITORY}`);
    const tokenSaved = !remember || saveToken();
    connectionStatus.className = tokenSaved ? "form-status success" : "form-status error";
    connectionStatus.textContent = tokenSaved
      ? `${restored ? "已自动连接" : "验证成功并已记住"}：${repo.full_name}`
      : "连接成功，但浏览器禁止保存令牌，请检查隐私或无痕模式设置";
    forgetTokenButton.disabled = false;
    loadPostList();
    return true;
  } catch (error) {
    if (restored && error.status === 401) clearStoredToken();
    connectionStatus.className = "form-status error";
    connectionStatus.textContent = error.message;
    return false;
  } finally {
    connectionButton.disabled = false;
  }
}

connectionButton.addEventListener("click", () => verifyConnection());

forgetTokenButton.addEventListener("click", () => {
  clearStoredToken();
  forgetTokenButton.disabled = true;
  resetHistoryList();
  historyStatus.className = "form-status";
  historyStatus.textContent = "尚未读取历史文章";
  connectionStatus.className = "form-status";
  connectionStatus.textContent = "已从此浏览器清除令牌";
});

const storedToken = loadStoredToken();
if (storedToken) {
  tokenInput.value = storedToken;
  verifyConnection({ remember: false, restored: true });
} else {
  forgetTokenButton.disabled = true;
}

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editorForm.reportValidity()) return;
  publishButton.disabled = true;
  publishButton.textContent = loadedPost ? "正在更新…" : "正在发布…";
  publishResult.hidden = false;
  publishResult.className = "publish-result loading";
  publishResult.textContent = "正在检查 Markdown 文章…";

  try {
    const slug = slugInput.value.trim();
    const date = dateInput.value;
    const title = titleInput.value.trim();
    const summary = summaryInput.value.trim();
    const category = categoryInput.value;
    const filePath = loadedPost?.path || `_posts/${date}-${slug}.md`;
    const apiUrl = `https://api.github.com/repos/${REPOSITORY}/contents/${filePath}`;
    const currentFile = loadedPost || await githubRequest(`${apiUrl}?ref=${BRANCH}`, {}, true);
    const markdown = createPostMarkdown({
      title,
      date,
      category,
      summary,
      slug,
      content: contentInput.value.trim()
    });

    publishResult.textContent = "正在创建 GitHub 提交…";
    const body = {
      message: `${currentFile ? "update" : "publish"} post: ${title}`,
      content: utf8ToBase64(markdown),
      branch: BRANCH
    };
    if (currentFile) body.sha = currentFile.sha;

    const result = await githubRequest(apiUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const tokenSaved = saveToken();

    if (loadedPost) loadedPost.sha = result.content.sha;
    const publicUrl = `/posts/${encodeURIComponent(slug)}/`;
    publishResult.className = "publish-result success";
    publishResult.innerHTML = `
      <strong>Markdown ${currentFile ? "更新" : "发布"}成功！</strong>
      <span>GitHub 提交 ${window.ChuBlog.escapeHtml(result.commit.sha.slice(0, 7))} 已创建。Jekyll 通常会在 30～90 秒内生成网页。</span>
      <a href="${publicUrl}" target="_blank">查看文章 →</a>`;
    forgetTokenButton.disabled = false;
    connectionStatus.className = tokenSaved ? "form-status success" : "form-status error";
    connectionStatus.textContent = tokenSaved
      ? "发布成功，令牌已保存在此浏览器"
      : "发布成功，但浏览器禁止保存令牌";
    historyStatus.className = "form-status success";
    historyStatus.textContent = currentFile ? `已更新：${title}` : `已发布：${title}`;
    if (!currentFile) {
      await loadPostList();
      if (availablePosts.some((file) => file.path === filePath)) {
        historySelect.value = filePath;
        loadPostButton.disabled = false;
        historyStatus.className = "form-status success";
        historyStatus.textContent = `已发布：${title}`;
      }
    }
  } catch (error) {
    publishResult.className = "publish-result error";
    publishResult.textContent = `发布失败：${error.message}`;
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = loadedPost ? "更新到 GitHub" : "发布到 GitHub";
  }
});
