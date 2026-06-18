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
    const matchesQuery = !query || card.dataset.search.toLowerCase().includes(query) || card.textContent.toLowerCase().includes(query);
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
