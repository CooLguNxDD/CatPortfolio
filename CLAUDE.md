# CatPortfolio — Project Index

## Summary

- Personal portfolio site built with React 19, Vite 8, and TypeScript 6
- Currently in early scaffold stage (Vite default template)
- Entry: `src/main.tsx` → `src/App.tsx`

## Dev Rules

1. Update `CLAUDE.md` after every structural change (new routes, components, dependencies).
2. New components → add to Project Structure below.
3. New dependencies → add to Tech Stack below.
4. Use relative imports — no absolute paths.
5. Lint before committing: `npm run lint`

## Project Structure

```
CatPortfolio/
├── src/
│   ├── main.tsx          # React root mount
│   ├── App.tsx           # Root component (single page for now)
│   ├── App.css           # Root styles
│   ├── index.css         # Global styles
│   ├── assets/           # Static images (hero.png, react.svg, vite.svg)
│   ├── lib/
│   │   └── utils.ts      # Tailwind merge/clsx helper
│   └── components/
│       ├── ThemeProvider.tsx # Theme context provider
│       └── ui/
│           ├── button.tsx    # Button component
│           └── card.tsx      # Card component
├── public/               # Static public assets (icons.svg)
├── index.html            # HTML shell
├── vite.config.ts        # Vite config
├── tsconfig.json         # Root TS config
├── tsconfig.app.json     # App TS config
└── tsconfig.node.json    # Node TS config
```

## Essential Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check + production build
npm run lint      # Lint with oxlint
npm run preview   # Preview production build
```

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 |
| Build | Vite 8 |
| Language | TypeScript 6 |
| Linter | oxlint |
