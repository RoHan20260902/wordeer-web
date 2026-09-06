# Wordeer 网页测试版

可交互的英语收词应用，独立于 TANGO。此包包含目前网页版的 HTML、CSS、JavaScript 源码和词典，可直接作为静态网站发布，无需安装依赖或编译。

## 发布到 GitHub Pages

1. 新建 GitHub 仓库（例如 `wordeer`）。
2. 解压 ZIP，将里面的文件上传到仓库根目录，不要只上传 ZIP 或外层文件夹。
3. 在仓库 Settings → Pages 中，Source 选择 Deploy from a branch。
4. 选择 `main` 分支和 `/ (root)`，保存。
5. 等待 Pages 发布完成，使用该页面显示的网址访问。

页面资源使用相对路径，支持 GitHub Pages 的仓库子路径。

## 本地运行

在解压目录执行：

```sh
python3 -m http.server 8080
```

浏览器打开 http://localhost:8080 。请通过 HTTP 服务器运行，不要双击 index.html；词典使用 fetch 加载。

## 文件

- `index.html`：页面入口
- `style.css`：手机自适应界面
- `app.js`：收词、词库、收藏、复习和备份交互
- `model.js`：查词、词形还原、备份校验与复习时间计算
- `wordeer-tools.js`：可选 WebMCP 只读词库接口；不支持的浏览器会跳过
- `assets/dictionary-web.json`：英文词典及词形映射

## 功能与边界

支持单条/批量文字收词、自动词性分类、搜索、收藏、闪卡、四选一复习，以及 JSON 备份导入导出。

当前数据仅保存在浏览器 localStorage，不跨设备同步。不同域名使用不同词库；从原预览地址迁移时，请先导出备份，再在新地址导入。清除网站数据前请先备份。

尚未接入原生录音、Action Button、登录、云同步或 DeepSeek API。未命中的输入进入待处理。本包不包含 API 密钥、账号配置、私人词库、Sites 配置或 Git 历史。GitHub Pages 发布后的访问范围取决于仓库和 Pages 设置。

## 第三方许可

ECDICT 词典许可见 `assets/ECDICT-LICENSE.txt`；保留该署名与许可文件。
`assets/NotoSansSC-OFL.txt` 为保留的字体许可，当前网页使用系统字体。

应用自身未在此包中授予开源许可；是否开源及采用何种许可由项目所有者决定。

## 单词卡更新
单条输入先展示单词卡，确认后收录。优先显示本地已有释义和例句，缺失的语感与关联词解说不会虚构。批量收词仍直接收录。
