# chuyi198452-arch.github.io

这是 Chu 的个人博客。GitHub Pages 使用 Jekyll 将 Markdown 文章渲染为静态 HTML，网站界面仍由 HTML、CSS 和 JavaScript 构成。

## 本地运行

准确预览 Jekyll 页面需要 Ruby 3.0 或更高版本，然后执行：

```bash
bundle install
bundle exec jekyll serve
```

然后在浏览器访问 `http://localhost:8000`。

## 文件结构

```text
chuyi198452-arch.github.io/
├── _config.yml                       # Jekyll 配置
├── _layouts/post.html                # 文章 HTML 模板
├── _posts/                           # Markdown 文章
│   └── 2026-06-18-ai-coding-first-app.md
├── index.html                         # 首页
├── about.html                         # 关于页面
├── editor.html                        # 在线 Markdown 编辑器
├── page-editor.html                   # 首页可视化设计器
├── _data/home.json                    # 首页文字、颜色和布局配置
└── assets/
    ├── css/style.css                  # 所有页面样式
    ├── js/main.js                     # 搜索、筛选和深色模式
    └── js/page-editor.js              # 页面设计器预览和保存逻辑
```

## 修改成自己的博客

1. 在 `index.html` 中修改姓名和首页简介；文章卡片由 Jekyll 自动生成。
2. 在 `about.html` 中修改个人介绍和 GitHub 地址。
3. 在 `_posts` 中创建 `YYYY-MM-DD-name.md` 格式的新文章。
4. 修改 `assets/css/style.css` 顶部的颜色变量，更换网站配色。
5. 提交并推送到 GitHub，GitHub Pages 会自动更新。

## 使用在线编辑器

访问 `/editor.html`，使用 Markdown 写作并实时预览。发布需要 GitHub Fine-grained personal access token：

1. Repository access 只选择 `chuyi198452-arch.github.io`。
2. Repository permissions 中将 `Contents` 设置为 `Read and write`。
3. 建议设置较短的过期时间。
4. 第一次点击“验证并记住”后，令牌会保存在当前浏览器的本地存储中，以后打开编辑器会自动连接。
5. 不要在公用电脑上保存令牌；可随时点击“忘记令牌”从浏览器中清除。

连接成功后，“修改历史文章”区域会列出 `_posts` 中的文章。选择并载入文章即可修改原 Markdown；历史文章的发布日期和文章地址会保持不变。

编辑器通过 GitHub Contents API 创建或更新 `_posts/YYYY-MM-DD-name.md`。`main` 分支变化后，Jekyll 会生成 HTML，GitHub Pages 会自动重新发布。

## 使用页面设计器

访问 `/page-editor.html` 可以界面化修改首页：

1. 修改网站名称、首屏标题、介绍和按钮文字。
2. 选择主题色、首屏左右布局和文章卡片列数。
3. 保留代码卡片，或上传一张 JPG、PNG、WebP、GIF 图片作为首页展示图。
4. 在右侧实时预览，确认后保存到 GitHub。

页面设计器与文章编辑器共用浏览器中保存的 GitHub 令牌，只更新 `_data/home.json` 和新上传的首页图片，不直接改写整份 HTML。

## 发布地址

项目发布后可通过以下地址访问：

`https://chuyi198452-arch.github.io/`
