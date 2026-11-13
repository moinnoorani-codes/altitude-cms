# Altitude CMS — admin UI prototype

Clickable prototype of an airline-focused content management system. It accompanies the
product requirements document (PRD): https://claude.ai/artifact/Pq9UNwu67rRt1Lt2ZYsUcx

The admin UI talks to the server in [`server/`](server/README.md). Content, the entry editor,
translations, the workflow board, travel alerts and the audit log are live. Routes and fares, assets,
content model, markets, users and settings still show sample data and say so on screen.

Sign-in is not built yet: the "Acting as" switcher in the top bar changes between the server's demo users,
which is how you try the approval rules (for example, an author cannot approve their own promotion).

## Run

```bash
npm install
npm run dev
```

The UI needs the server. Start it in a second terminal first:

```bash
cd server && npm install && npm run dev
```

## Screens

| Screen | File | PRD reference |
| --- | --- | --- |
| Home dashboard | `src/screens/Dashboard.jsx` | S-01 |
| Content list, bulk actions, new entry | `src/screens/Content.jsx` | S-02 |
| Entry editor with live preview, locales, workflow, AI assist | `src/screens/Editor.jsx` | S-03, S-04 |
| Content model with airline field types | `src/screens/Model.jsx` | S-05 |
| Assets with rights tracking | `src/screens/Assets.jsx` | S-06 |
| Translation control tower | `src/screens/Translations.jsx` | S-07 |
| Workflow board and releases | `src/screens/Releases.jsx` | S-08 |
| Disruption centre | `src/screens/Disruption.jsx` | S-09 |
| Routes and fares | `src/screens/Fares.jsx` | S-10 |
| Markets and locales | `src/screens/Markets.jsx` | S-11 |
| Users, roles and audit log | `src/screens/Access.jsx` | S-16 |
| Settings (organisation, tokens, security, AI, plan) | `src/screens/Settings.jsx` | S-17 |

Shared pieces: `src/App.jsx` (shell, navigation, command palette on Ctrl/Cmd+K, theme),
`src/ui.jsx` (primitives), `src/data.js` (mock data), `src/styles.css` (design tokens, light and dark).

Not yet prototyped: compliance (S-12), personalization (S-13), integrations (S-14), insights (S-15).
