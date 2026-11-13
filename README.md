# Altitude CMS — admin UI prototype

Clickable prototype of an airline-focused content management system. It accompanies the
product requirements document (PRD): https://claude.ai/artifact/Pq9UNwu67rRt1Lt2ZYsUcx

Everything runs in the browser on mock data for a fictional airline ("Meridian Air").
There is no backend yet; state resets on reload.

## Run

```bash
npm install
npm run dev
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
