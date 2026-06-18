const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("chu-blog-theme");
const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
  root.dataset.theme = "dark";
}

function updateThemeLabel() {
  if (!themeButton) return;
  const isDark = root.dataset.theme === "dark";
  themeButton.setAttribute("aria-label", isDark ? "切换浅色模式" : "切换深色模式");
  themeButton.setAttribute("title", isDark ? "切换浅色模式" : "切换深色模式");
}

themeButton?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  localStorage.setItem("chu-blog-theme", nextTheme);
  updateThemeLabel();
});

updateThemeLabel();

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(markdown = "") {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html = [];
  let inCode = false;
  let codeLines = [];
  let listType = null;

  const closeList = () => {
    if (listType) html.push(`</${listType}>`);
    listType = null;
  };

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      closeList();
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
      }
      inCode = !inCode;
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    const unordered = line.match(/^[-*]\s+(.+)/);
    const ordered = line.match(/^\d+\.\s+(.+)/);
    if (unordered || ordered) {
      const wantedType = unordered ? "ul" : "ol";
      if (listType !== wantedType) {
        closeList();
        listType = wantedType;
        html.push(`<${wantedType}>`);
      }
      html.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      return;
    }

    closeList();
    if (!line.trim()) return;
    if (line.startsWith("### ")) html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) html.push(`<h2>${inlineMarkdown(line.slice(2))}</h2>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else html.push(`<p>${inlineMarkdown(line)}</p>`);
  });

  closeList();
  if (inCode && codeLines.length) html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  return html.join("\n");
}

window.ChuBlog = { escapeHtml, renderMarkdown };

const searchInput = document.querySelector("#articleSearch");
const filterButtons = [...document.querySelectorAll(".filter-chip")];
const postCards = [...document.querySelectorAll(".post-card")];
const emptyState = document.querySelector("#emptyState");
let activeFilter = "all";

function filterArticles() {
  const query = searchInput?.value.trim().toLowerCase() ?? "";
  let visibleCount = 0;

  postCards.forEach((card) => {
    const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
    const matchesQuery = !query || card.dataset.search.includes(query);
    const shouldShow = matchesCategory && matchesQuery;
    card.hidden = !shouldShow;
    if (shouldShow) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

searchInput?.addEventListener("input", filterArticles);
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    filterArticles();
  });
});
