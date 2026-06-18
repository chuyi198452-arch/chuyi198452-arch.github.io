const REPOSITORY = "chuyi198452-arch/chuyi198452-arch.github.io";
const BRANCH = "main";
const API_VERSION = "2026-03-10";
const CATEGORY_LABELS = {
  "ai-coding": "AI Coding",
  web: "Web 开发",
  thinking: "成长思考"
};

const tokenInput = document.querySelector("#githubToken");
const connectionButton = document.querySelector("#testConnection");
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
let slugWasEdited = false;

dateInput.value = new Date().toISOString().slice(0, 10);

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

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
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
    throw new Error(hint || `GitHub 请求失败（${response.status}）`);
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

connectionButton.addEventListener("click", async () => {
  connectionButton.disabled = true;
  connectionStatus.className = "form-status loading";
  connectionStatus.textContent = "正在验证…";
  try {
    const repo = await githubRequest(`https://api.github.com/repos/${REPOSITORY}`);
    connectionStatus.className = "form-status success";
    connectionStatus.textContent = `连接成功：${repo.full_name}`;
  } catch (error) {
    connectionStatus.className = "form-status error";
    connectionStatus.textContent = error.message;
  } finally {
    connectionButton.disabled = false;
  }
});

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!editorForm.reportValidity()) return;
  publishButton.disabled = true;
  publishButton.textContent = "正在发布…";
  publishResult.hidden = false;
  publishResult.className = "publish-result loading";
  publishResult.textContent = "正在检查 Markdown 文章…";

  try {
    const slug = slugInput.value.trim();
    const date = dateInput.value;
    const title = titleInput.value.trim();
    const summary = summaryInput.value.trim();
    const category = categoryInput.value;
    const filePath = `_posts/${date}-${slug}.md`;
    const apiUrl = `https://api.github.com/repos/${REPOSITORY}/contents/${filePath}`;
    const currentFile = await githubRequest(`${apiUrl}?ref=${BRANCH}`, {}, true);
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

    const publicUrl = `/posts/${encodeURIComponent(slug)}/`;
    publishResult.className = "publish-result success";
    publishResult.innerHTML = `
      <strong>Markdown 发布成功！</strong>
      <span>GitHub 提交 ${window.ChuBlog.escapeHtml(result.commit.sha.slice(0, 7))} 已创建。Jekyll 通常会在 30～90 秒内生成网页。</span>
      <a href="${publicUrl}" target="_blank">查看文章 →</a>`;
    tokenInput.value = "";
    connectionStatus.textContent = "已发布并清除页面中的令牌";
  } catch (error) {
    publishResult.className = "publish-result error";
    publishResult.textContent = `发布失败：${error.message}`;
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = "发布到 GitHub";
  }
});
