const REPOSITORY = "chuyi198452-arch/chu-bolg";
const DATA_PATH = "data/posts.json";
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

function base64ToUtf8(value) {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, "")), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function githubRequest(url, options = {}) {
  if (!tokenInput.value.trim()) throw new Error("请先输入 GitHub 令牌");
  const response = await fetch(url, {
    ...options,
    headers: { ...apiHeaders(), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const hint = response.status === 401 ? "令牌无效或已过期" : response.status === 403 ? "令牌缺少 Contents 写入权限" : payload.message;
    throw new Error(hint || `GitHub 请求失败（${response.status}）`);
  }
  return payload;
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
  publishResult.textContent = "正在读取文章列表…";

  try {
    const apiUrl = `https://api.github.com/repos/${REPOSITORY}/contents/${DATA_PATH}?ref=${BRANCH}`;
    const currentFile = await githubRequest(apiUrl);
    const data = JSON.parse(base64ToUtf8(currentFile.content));
    const slug = slugInput.value.trim();
    const post = {
      slug,
      title: titleInput.value.trim(),
      category: categoryInput.value,
      categoryLabel: CATEGORY_LABELS[categoryInput.value],
      date: dateInput.value,
      summary: summaryInput.value.trim(),
      content: contentInput.value.trim(),
      updatedAt: new Date().toISOString()
    };
    const existingIndex = data.posts.findIndex((item) => item.slug === slug);
    if (existingIndex >= 0) data.posts[existingIndex] = post;
    else data.posts.unshift(post);

    publishResult.textContent = "正在创建 GitHub 提交…";
    const result = await githubRequest(`https://api.github.com/repos/${REPOSITORY}/contents/${DATA_PATH}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${existingIndex >= 0 ? "update" : "publish"} post: ${post.title}`,
        content: utf8ToBase64(`${JSON.stringify(data, null, 2)}\n`),
        sha: currentFile.sha,
        branch: BRANCH
      })
    });

    const publicUrl = `post.html?slug=${encodeURIComponent(slug)}`;
    publishResult.className = "publish-result success";
    publishResult.innerHTML = `
      <strong>发布成功！</strong>
      <span>GitHub 提交 ${window.ChuBlog.escapeHtml(result.commit.sha.slice(0, 7))} 已创建。域名通常会在 30～90 秒内更新。</span>
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
