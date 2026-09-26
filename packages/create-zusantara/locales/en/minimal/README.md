# Zusantara app

Created with `npm create zusantara@latest` (**minimal** template).

```bash
npx zusantara                                  # chat with Zusantara AI + dev server (asks first)
npm run dev                                  # or just the server: http://localhost:3000
npx zusantara make:route api/messages --methods GET,POST
npx zusantara "build an about page"           # one AI request (set it up first: npx zusantara ai:setup)
npm run build && npm start                   # production
```

Need a database and sign-in? Create a new project with the **api** template: `npm create zusantara@latest -- --template api --lang en`.

Documentation: https://zusantara.morixa.id/en/
