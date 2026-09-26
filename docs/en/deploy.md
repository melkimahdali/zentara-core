---
title: Build & deploy
order: 3
group: Reference
description: Running a Zentara app in production.
---

# Build & deploy

```bash
npm run build     # zentara build: TypeScript -> dist/
npm start         # zentara start: run dist/app with NODE_ENV=production
```

What the server needs:

- **Node.js 22+**.
- **A production `.env`**: `NODE_ENV=production`, `PORT`, `SESSION_SECRET` (at least 32 characters), `DATABASE_URL`, and `SEED_ADMIN_PASSWORD` if you use `db:seed`.
- **Database migrations**: run `npx zentara db:migrate` before starting the app.
- **Email**: set `MAIL_URL` and `MAIL_FROM` if the app sends email. Without `MAIL_URL`, `sendMail()` throws in production.
- **Jobs**: the queue is stored in `data/jobs.db`, so the `data/` folder must be writable and kept between deploys. With several processes, share the same queue file or turn the worker off in some of them with `ZENTARA_JOBS=off`.
- **Error pages**: in production visitors only see a simple status page. Make sure `ZENTARA_DEBUG` is not enabled.

Example with PM2:

```bash
npm ci && npm run build
npx zentara db:migrate
pm2 start npm --name my-app -- start
```

Deploy adapters (Docker, Vercel, Cloudflare, and more) are planned in stage 17 of the [roadmap](peta-jalan.html).
