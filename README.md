# 墨韵琉璃 · 个人导航

首页导航站，分类书签、搜索、今日诗词、纪念日倒计时，以及 NASA 每日天文背景。

线上页面：<https://nav.xxznote.eu.org/>

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FIVMYM%2Fnasa-nav&project-name=nasa-nav&env=NASA_API_KEY&envDescription=NASA%20APOD%20API%20%E5%AF%86%E9%92%A5%EF%BC%88%E5%8F%AF%E9%80%89%EF%BC%8C%E4%B8%8D%E5%A1%AB%E5%88%99%E4%BD%BF%E7%94%A8%20DEMO_KEY%EF%BC%89)

导入仓库后 Vercel 会执行 `npm run build` 并把 `dist` 作为静态资源；`/api/*` 与 `/apod-rss` 走 Serverless 函数。

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
