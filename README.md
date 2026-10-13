# 墨韵琉璃 · 个人导航

首页导航站，分类书签、搜索、今日诗词、纪念日倒计时，以及 NASA 每日天文背景。

线上页面：<https://nav.xxznote.eu.org/>

## 每日背景

NASA 已把 Astronomy Picture of the Day 从 `apod.nasa.gov` 迁到 [science.nasa.gov/apod](https://science.nasa.gov/apod/)。旧地址会 301 到新首页的 HTML，不再是 RSS。`api.nasa.gov/planetary/apod` 在不带日期时会返回 500；带上日期时，`url` / `hdurl` 经常是 NASA 站标，不是当天的天文图。

本仓库的 `/api/apod/today` 改为读取新页面主图（要一张约 2048 宽的图），并丢掉站标和缩略图。页面解析失败时，才回退到 API，并向前最多找 6 天。结果缓存 3 小时。`/apod-rss` 仍输出旧前端认得的 RSS（链接形如 `apod.nasa.gov/apod/apYYMMDD.html`，描述里是真实图片）。

可选环境变量 `NASA_API_KEY`。不设置时，API 回退使用 `DEMO_KEY`。

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:47831>。

```bash
npm run test:apod   # 向 NASA 拉一张当天的图，确认不是站标
npm run build && npm start
```

导航数据在 `data/site.json`，与线上 `/api/site` 一致（站点记录更新于 2026-10-12）。

## 和 OCI 上的部署

Oracle Cloud 上的主机名是 `oci`（Ubuntu 20.04，ARM，新加坡）。这次会话没有那台机器的 SSH 凭据，也没法把命令送到已连接的本机 SSH 工作目录，所以没有把服务器上的源码目录原样拷下来。这里提交的是按线上页面、接口和样式还原的首页，并修好了每日背景。把这个服务部署回 `oci` 后，首页会重新显示当天的天文图。
