# Grocery POS

React Native app built with Expo, styled with NativeWind, and talking to the Django API through Axios.

## Run the app

```bash
npm install
cp .env.example .env
npm start
```

`EXPO_PUBLIC_API_URL` points at the Django server:

- iOS simulator and Expo web: `http://127.0.0.1:8000`
- Android emulator: `http://10.0.2.2:8000`
- A phone on the same Wi-Fi: `http://<your-computer-lan-ip>:8000`

Start the API from the backend repo first. The home screen calls `GET /api/health/`.

## Stack

- Expo SDK 58
- NativeWind 4 with Tailwind CSS 3
- Axios (`src/api/client.ts`)
