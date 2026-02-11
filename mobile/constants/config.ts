// API Configuration
// Update this with your local IP address when testing on physical devices
// Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)

export const Config = {
  // API URL - change based on environment
  API_URL: __DEV__
    ? 'http://localhost:3000'  // For emulator/simulator
    // ? 'http://192.168.2.74:3000'  // For physical device - update with your IP
    : 'https://opencalendars.app',

  // Supabase
  SUPABASE_URL: 'https://xzpkqmyimynzufndsgrw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cGtxbXlpbXluenVmbmRzZ3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDg5ODMsImV4cCI6MjA4NjIyNDk4M30.qQZrQvHcVm2Y_CXHif0uAepI_qod7x_Oe8Vdr250VLM',

  // OAuth redirect
  OAUTH_REDIRECT_SCHEME: 'opencalendar',
};
