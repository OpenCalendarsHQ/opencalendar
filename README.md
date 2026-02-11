# OpenCalendar

Open-source calendar app that syncs Google Calendar, iCloud, Microsoft and CalDAV in one place.

Built with Next.js, Supabase and Drizzle ORM. Desktop app powered by Tauri.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArjandenHartog%2Fopencalendar&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,DATABASE_URL&project-name=opencalendar&repository-name=opencalendar)

## Features

- Multi-calendar sync (Google, iCloud, Microsoft, CalDAV)
- Recurring events with flexible editing
- Day, week, month and year views
- Task management (Notion and GitHub integration)
- Desktop app with offline support
- Internationalization (English / Dutch)

## Getting started

```bash
git clone https://github.com/ArjandenHartog/opencalendar.git
cd opencalendar
npm install
cp .env.example .env.local  # fill in your keys
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth credentials |

## Desktop app

The desktop app lives in `opencalendar-desktop/` and is built with Tauri v2.

```bash
cd opencalendar-desktop
npm install
npm run tauri dev
```

## License

MIT
