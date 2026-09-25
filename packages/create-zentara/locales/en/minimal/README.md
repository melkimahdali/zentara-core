# Zentara app

Created with `npm create zentara@latest` (**minimal** template).

```bash
npx zentara                                  # chat with Zentara AI + dev server (asks first)
npm run dev                                  # or just the server: http://localhost:3000
npx zentara make:route api/messages --methods GET,POST
npx zentara "build an about page"           # one AI request (set it up first: npx zentara ai:setup)
npm run build && npm start                   # production
```

Need a database and sign-in? Create a new project with the **api** template: `npm create zentara@latest -- --template api --lang en`.

Documentation: https://zentara-core.morixa.id/en/
