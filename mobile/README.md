# OpenCalendar Mobile App

Een prachtige mobiele app voor OpenCalendar gebouwd met Expo en React Native, geïnspireerd door Apple Calendar met glassmorphism effects.

## Features

- 🎨 **Apple Calendar Design** - Beautiful glassmorphism UI met blur effects
- 🔐 **Supabase OAuth** - Veilige authenticatie via browser
- 📅 **Calendar Management** - Volledige kalender CRUD operaties
- 🔄 **Recurring Events** - Support voor herhalende events met rrule
- ✅ **Task Management** - Takenlijst met prioriteiten
- 🌓 **Dark Theme** - Prachtig donker thema met gradients
- 📱 **Cross-platform** - iOS en Android support

## Tech Stack

- **Framework**: Expo SDK 54
- **Navigatie**: Expo Router
- **Authenticatie**: Supabase Auth
- **UI**: React Native + Expo Blur
- **Animaties**: React Native Reanimated
- **State**: React Context API
- **API**: RESTful met JWT tokens

## Getting Started

### Vereisten

- Node.js 18+
- npm of yarn
- Expo Go app op je telefoon (voor development)

### Installatie

```bash
# Installeer dependencies
npm install

# Start development server
npm start
```

### Configuratie

De Supabase credentials zijn al geconfigureerd in `lib/contexts/auth-context.tsx`:
- **URL**: `https://xzpkqmyimynzufndsgrw.supabase.co`
- **Anon Key**: Al ingesteld

### API Configuratie

De API URL is geconfigureerd in `lib/api/client.ts`:
- **Development**: `http://localhost:3000` (pas aan naar je lokale IP voor fysieke devices)
- **Production**: `https://opencalendars.app`

**Voor testen op fysiek device**: Update de API_URL in `lib/api/client.ts`:
```typescript
const API_URL = __DEV__
  ? 'http://192.168.x.x:3000'  // Vervang met je lokale IP
  : 'https://opencalendars.app';
```

## Development

### Starten

```bash
# Start Expo development server
npm start

# Scan QR code met Expo Go (Android) of Camera app (iOS)
```

### Beschikbare Scripts

- `npm start` - Start Expo development server
- `npm run android` - Open Android emulator
- `npm run ios` - Open iOS simulator (alleen macOS)
- `npm run web` - Open in web browser

## Project Structuur

```
mobile/
├── app/                    # Expo Router routes
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Calendar view
│   │   ├── tasks.tsx      # Tasks screen
│   │   └── settings.tsx   # Settings screen
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Login screen
├── lib/
│   ├── api/
│   │   └── client.ts      # API client
│   ├── contexts/
│   │   └── auth-context.tsx  # Auth provider
│   └── hooks/
│       ├── useCalendars.ts   # Calendars hook
│       └── useEvents.ts      # Events hook
├── components/            # Reusable components
├── constants/
│   └── theme.ts          # Theme constants
└── assets/               # Images, fonts, etc.
```

## Authenticatie Flow

1. User klikt op "Sign in with Google"
2. App opent browser met Supabase OAuth
3. User logt in bij Google
4. Browser redirect naar `opencalendar://auth/callback`
5. App slaat JWT token op in SecureStore
6. Token wordt gebruikt voor API calls

## Deep Linking Setup (Production)

Voor production moet je de deep link configureren in Supabase:

1. Ga naar Supabase Dashboard → Authentication → URL Configuration
2. Voeg toe aan **Redirect URLs**:
   - `opencalendar://auth/callback`
   - Voor development: `exp://localhost:8081/auth/callback`

## UI Components

### CalendarView
- Maandweergave met interactieve grid
- Glassmorphism cards met blur effects
- Event dots op dagen met events
- Pull-to-refresh

### EventCard
- Glassmorphism design
- Color-coded per calendar
- Time en location display
- Swipe gestures (planned)

### TaskCard
- Checkbox toggle
- Priority badges
- Strikethrough voor completed tasks

## API Integratie

Alle API calls gebruiken JWT Bearer tokens:

```typescript
const response = await apiClient.getEvents({
  start: '2026-01-01',
  end: '2026-12-31'
});
```

Beschikbare endpoints:
- `GET /api/calendars` - Haal kalenders op
- `POST /api/calendars` - Maak kalender
- `GET /api/events` - Haal events op
- `POST /api/events` - Maak event
- `PUT /api/events` - Update event
- `DELETE /api/events` - Verwijder event
- `GET /api/tasks` - Haal taken op
- `POST /api/tasks` - Maak taak

## Troubleshooting

### "Cannot connect to API"
- Check of de Next.js server draait op `localhost:3000`
- Voor fysieke devices: gebruik je lokale IP adres

### "Supabase auth failed"
- Controleer of redirect URLs correct zijn ingesteld
- Check Supabase credentials in `auth-context.tsx`

### "Metro bundler errors"
- Run `npm install --legacy-peer-deps`
- Clear cache: `npx expo start -c`

## Roadmap

- [ ] Event create/edit bottom sheet
- [ ] Task create/edit dialog
- [ ] Week en day views
- [ ] Local notifications
- [ ] Offline support
- [ ] Calendar sync (Google, iCloud)
- [ ] Widget support
- [ ] Apple Watch app

## License

MIT
