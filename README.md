# chu-bolg

这是 Chu 的个人静态博客，使用最基础的 HTML、CSS 和 JavaScript 编写，适合初学者阅读和修改。

## 本地运行

无需安装任何依赖。在项目目录执行：

```bash
python3 -m http.server 8000
```

然后在浏览器访问 `http://localhost:8000`。

## 文件结构

```text
chu-bolg/
├── index.html                         # 首页
├── about.html                         # 关于页面
├── editor.html                        # 在线 Markdown 编辑器
├── post.html                          # 动态文章页面
├── data/posts.json                    # 文章数据（编辑器只更新此文件）
├── posts/
│   └── ai-coding-first-app.html       # 示例文章
└── assets/
    ├── css/style.css                  # 所有页面样式
    └── js/main.js                     # 搜索、筛选和深色模式
```

## 修改成自己的博客

1. 在 `index.html` 中修改姓名、简介和文章卡片。
2. 在 `about.html` 中修改个人介绍和 GitHub 地址。
3. 复制 `posts/ai-coding-first-app.html` 创建新文章。
4. 修改 `assets/css/style.css` 顶部的颜色变量，更换网站配色。
5. 提交并推送到 GitHub，GitHub Pages 会自动更新。

## 使用在线编辑器

访问 `/editor.html`，使用 Markdown 写作并实时预览。发布需要 GitHub Fine-grained personal access token：

1. Repository access 只选择 `chu-bolg`。
2. Repository permissions 中将 `Contents` 设置为 `Read and write`。
3. 建议设置较短的过期时间。
4. 令牌只保存在编辑器当前页面的内存中，发布成功后会立即清空，不会写进网站代码或浏览器存储。

编辑器通过 GitHub Contents API 更新 `data/posts.json`。`main` 分支变化后，GitHub Pages 会自动重新发布。

## 发布地址

项目发布后可通过以下地址访问：

`https://chuyi198452-arch.github.io/chu-bolg/`
