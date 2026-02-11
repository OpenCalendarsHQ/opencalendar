# OAuth Redirect Configuratie (Supabase)

Om Google Sign-In correct te laten werken en **terug te sturen naar de app** (niet naar opencalendars.app), moet je de redirect URLs in Supabase configureren.

## Stappen

1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard) → je project
2. **Authentication** → **URL Configuration**
3. Voeg onder **Redirect URLs** toe:

### Voor Expo Go (development)
```
exp://192.168.2.74:8081/--/auth/callback
```
> Vervang `192.168.2.74` met je eigen IP (zie `ipconfig` op Windows of `ifconfig` op Mac). Het IP moet hetzelfde zijn als waarop Metro draait.

### Voor development/production build
```
opencalendar://auth/callback
opencalendar://**
```

### Site URL (optioneel)
Laat de Site URL staan op `https://opencalendars.app` voor de web app.

## Verificatie

Na het toevoegen van de redirect URLs zou Google Sign-In je terug moeten sturen naar de app na het inloggen, in plaats van naar de website.

**Let op:** Met Expo Go werkt OAuth alleen als de `exp://` redirect URL exact overeenkomt. Bij een nieuw IP moet je de URL in Supabase updaten. Voor een stabiele ervaring: gebruik een [Development Build](https://docs.expo.dev/develop/development-builds/introduction/) met het `opencalendar://` scheme.
