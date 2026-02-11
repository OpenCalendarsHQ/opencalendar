# 🚀 Quick Start Guide

## Start de App

```bash
cd mobile
npm start
```

Scan de QR code met **Expo Go** app op je telefoon!

## 📱 Voor Fysiek Device

Als je op een fysiek device test (niet emulator), update je lokale IP in `constants/config.ts`:

```typescript
API_URL: __DEV__
  ? 'http://192.168.2.74:3000'  // Vervang met jouw IP
  : 'https://opencalendars.app',
```

**Je lokale IP vinden:**
- Windows: `ipconfig` (zoek naar IPv4 Address)
- Mac/Linux: `ifconfig` (zoek naar inet)

## ✅ Checklist

Voordat je de app start:
- [ ] Next.js server draait op `localhost:3000`
- [ ] Dependencies geïnstalleerd (`npm install`)
- [ ] Voor fysiek device: IP adres aangepast in config

## 🎯 Features

### Ingelogd
- ✅ Google OAuth login (via browser)
- ✅ Calendar maandweergave
- ✅ Event details per dag
- ✅ Tasks management
- ✅ Settings & calendar visibility

### Nog Te Bouwen (Future)
- Event create/edit dialog
- Week/day views
- Drag & drop events
- Push notifications
- Offline mode

## 🐛 Troubleshooting

### "Cannot connect to API"
1. Check of Next.js draait: `http://localhost:3000`
2. Voor fysiek device: gebruik je lokale IP adres in config

### "Metro bundler failed"
```bash
# Clear cache en rebuild
npx expo start --clear
```

### "Supabase auth error"
- Check of redirect URL correct is in Supabase dashboard
- Moet zijn: `opencalendar://auth/callback`

## 🎨 UI Stack

- **Design**: Apple Calendar-inspired glassmorphism
- **Theme**: Dark mode met gradients
- **Blur**: Expo Blur voor frosted glass effect
- **Navigation**: Expo Router met tabs
- **Animations**: React Native Reanimated

Veel plezier met bouwen! 🎉
