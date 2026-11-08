# StudentOS — web app (frontend)

Next.js 15 (App Router) + React 19 + Tailwind CSS v4, built from the StudentOS Figma screens.
Everything runs in the browser with sample data for now. The backend comes next.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  → redirects to /signup
npm run build      # production build (also type-checks)
```

## Screens and routes

| Route | Figma screens |
|---|---|
| `/signup` | Sign up, field errors, loading, “email already in use” |
| `/login` | Log in, wrong password, social sign-in notice |
| `/forgot-password` | Reset link, check your email, couldn’t send |
| `/onboarding` | Welcome → About you → Goal → Course & date → Your week → Summary / missing details → Building → Planner timed out |
| `/plan/review` | Review suggested plan, Plan accepted |
| `/plan/review?mode=edit` | Edit schedule (drag sessions, edit panel) |
| `/plan/preferences` | Edit plan preferences → Regenerate plan |
| `/dashboard` | Overview, Setup in progress (empty), Missed session moved, Reschedule flow (drawer) |
| `/session/[id]` | Session ready → in progress → paused → completed |
| `/schedule` | Week view, Day view (`?view=day`), Add session drawer |
| `/study-plan` | Study Plan |
| `/assistant` | AI Assistant home + chat |
| `/goals` | Courses & Goals, Add goal, Edit goal, Review goal, Update target date |
| `/settings/[tab]` | `profile`, `study`, `notifications`, `assistant`, `account` |

## Backend: Firebase (free Spark plan)

- **Login:** Firebase Authentication — email/password and Google. GitHub and LinkedIn show “coming soon”.
- **Data:** each student’s whole app state is one Firestore document, `users/{uid}`. Changes save about a second after they happen.
- **Rules:** `firestore.rules` lets each student read and write only their own document. Paste it into Firebase console → Firestore → Rules → Publish.
- **Config:** `.env.local` holds the web app config (copy from `.env.local.example` on a new machine).
- The planner and assistant replies are still a mock (`lib/assistant.ts`, `plan/suggest` in `lib/store.tsx`): every plan is a CS50P-style plan starting this week.

## Project layout

```
app/
  (auth)/          signup, login, forgot-password
  (app)/           every logged-in page; layout.tsx adds the sidebar + mini chat
components/
  ui/              buttons, chips, switches, drawer, date picker, stepper, icons
  shell/           sidebar, app shell, floating “Ask StudentOS” widget
  auth/            hero panel, auth layout, password + social buttons
  onboarding/      step forms, details panel, build progress
  calendar/        week calendar (drag & drop), add-session drawer
  reschedule/      reschedule drawer (choose → custom time → review)
  goals/           add / edit / review / target-date drawers
  plan/            plan stats, week nav, session rows
  chat/            chat bubbles, composer
lib/
  types.ts         data shapes shared by UI and backend
  mock-data.ts     sample user, goals, 76 sessions, milestones
  store.tsx        app state; loads and saves users/{uid} in Firestore
  selectors.ts     next session, clashes, free slots, week stats
  firebase.ts      Firebase app, auth and Firestore
  auth.ts          sign up, log in, Google, reset, log out, delete account
  assistant.ts     MOCK assistant/planner API ← replace with your AI backend
  utils.ts         dates, formatting, demo clock
```

## Next steps

1. Real AI planner and assistant (`lib/assistant.ts`).
2. YouTube resources inside study sessions.
3. StudentOS completion certificates with a verify page.

## Notes

- Only the dark theme is designed; the Light toggle shows a “coming soon” toast.
- The logo is `public/studentos-mark.png`.
