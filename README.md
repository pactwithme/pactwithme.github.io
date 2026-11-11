# Pact 网站：上线步骤

纯静态网站（HTML/CSS/JS），不需要构建。早期报名的邮箱会写进团队共享的 Google Sheet。

```
index.html            首页（已重新设计）
prototype.html        "Try it" 演示页（里面嵌入 prototype/app/）
survey.html           "Get early access" 报名页
assets/style.css      三个页面共用的样式
assets/config.js      ← 在这里填 Google Apps Script 的网址
assets/signup.js      报名表单逻辑
google-apps-script/Code.gs   粘贴到 Google Sheet 的 Apps Script 里
```

## 1. 连接 Google Sheet（约 5 分钟）

1. 新建一个 Google Sheet，比如命名为 "Pact sign-ups"，然后共享给队友。
2. 在表格菜单中打开 **扩展程序 → Apps Script**。
3. 删掉编辑器里原有的内容，把 `google-apps-script/Code.gs` 的全部内容粘贴进去，然后保存。
4. 点击 **部署 → 新建部署**，类型选 **Web 应用**：
   - 执行身份：**我**
   - 谁可以访问：**任何人**
5. 点击部署，按提示授权，然后复制以 `/exec` 结尾的网址。
6. 打开 `assets/config.js`，把网址填进去：
   ```js
   window.PACT_SIGNUP_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
7. 用浏览器打开这个 `/exec` 网址。如果看到 `{"ok":true,"service":"pact-signup"}`，说明部署成功。

第一次有人报名时，表格里会自动生成 **Signups** 标签页，列为：Time | Email | Source | Page。同一个邮箱不会重复记录。

> 以后修改了 Code.gs，要在 **部署 → 管理部署** 里编辑现有部署并选择"新版本"，这样网址不会变。如果选"新建部署"，会生成一个新网址。

## 2. 发布网站（任选一种）

**Netlify Drop（最快）**：登录 https://app.netlify.com/drop ，把整个 `pact` 文件夹拖进去，就会得到一个 `*.netlify.app` 链接。之后可以在站点设置里修改子域名。

**GitHub Pages**：新建一个仓库，上传文件夹里的全部文件，然后在 Settings → Pages 中选择 `main` 分支的根目录。

**Replit**：Remix 原项目，或者新建一个 Static 项目，用这些文件替换原有文件，再点 Deploy。

## 3. 上线后测试

在首页提交一个测试邮箱，检查它是否出现在 Sheet 里，然后把这一行删掉。

可以在链接后面加 `?src=xxx` 来追踪报名来源，比如 `?src=instagram`，这个值会写进 Source 列。
