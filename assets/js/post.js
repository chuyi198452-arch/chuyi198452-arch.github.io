const postContainer = document.querySelector("#dynamicPost");

async function loadPost() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    postContainer.innerHTML = '<div class="empty-state">缺少文章地址。<br><a href="index.html">返回首页</a></div>';
    return;
  }

  try {
    const response = await fetch(`data/posts.json?v=${Date.now()}`);
    if (!response.ok) throw new Error("文章数据读取失败");
    const data = await response.json();
    const post = data.posts.find((item) => item.slug === slug);
    if (!post) {
      postContainer.innerHTML = '<div class="empty-state">没有找到这篇文章。<br><a href="index.html">返回首页</a></div>';
      return;
    }

    document.title = `${post.title} · Chu's Blog`;
    document.querySelector('meta[name="description"]').setAttribute("content", post.summary);
    postContainer.innerHTML = `
      <header class="article-header">
        <a class="back-link" href="index.html#articles">← 返回文章列表</a>
        <div class="post-meta"><span class="tag">${window.ChuBlog.escapeHtml(post.categoryLabel)}</span><time datetime="${window.ChuBlog.escapeHtml(post.date)}">${window.ChuBlog.formatDate(post.date)}</time></div>
        <h1>${window.ChuBlog.escapeHtml(post.title)}</h1>
        <p class="lead">${window.ChuBlog.escapeHtml(post.summary)}</p>
      </header>
      <div class="article-cover art-one"><span>${window.ChuBlog.escapeHtml(post.categoryLabel)}</span></div>
      <div class="prose">${window.ChuBlog.renderMarkdown(post.content)}</div>`;
  } catch (error) {
    postContainer.innerHTML = '<div class="empty-state">文章读取失败，请稍后刷新。</div>';
  }
}

loadPost();
