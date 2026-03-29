# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TimeManager is a time tracking app built with Expo SDK 55 (React Native) and TypeScript. Targets iOS, Android, and web. Uses Supabase for auth, database, and realtime. Light/neutral design theme (Indigo accent).

## Commands

- `npm start` / `expo start` — Start Expo dev server
- `npm run ios` / `npm run android` / `npm run web` — Platform-specific start

## Tech Stack

- **Runtime:** React Native 0.83 via Expo ~55, TypeScript 5.9 (strict)
- **Routing:** expo-router (file-based, `app/` directory)
- **Backend:** Supabase (auth, postgres, realtime subscriptions)
- **Auth Storage:** expo-secure-store (native), localStorage (web)
- **Charts:** react-native-chart-kit + react-native-svg

## Architecture

### Data Model (Supabase)
- `projects` — id, user_id, name, color
- `tasks` — id, user_id, project_id, name (belongs to a project)
- `time_entries` — id, user_id, project_id, task_id, start_time, end_time, paused_duration, description

### Routing Structure
- `app/_layout.tsx` — Root: AuthProvider + ProjectsProvider + RouteGuard
- `app/(tabs)/_layout.tsx` — Top tab bar (Timer, Projekte, Reports) + ProfileMenu
- `app/(tabs)/index.tsx` — Timer screen (main dashboard)
- `app/(tabs)/projects.tsx` — CRUD for projects
- `app/(tabs)/reports.tsx` — Weekly bar chart + daily breakdown
- `app/auth/login.tsx` / `register.tsx` — Email/password auth

### Key Patterns
- **Contexts:** `AuthContext` (session), `ProjectsContext` (shared project CRUD)
- **Hooks:** `useTimer` (start/pause/resume/stop with task_id), `useTasks` (CRUD per project), `useTodayEntries` (entries + totalTodayMs + taskTotals), `useWeeklyReport`
- **Theme:** `lib/theme.ts` exports `t` object — light neutral palette, all styles use StyleSheet.create()
- **Alerts:** `lib/alert.ts` — `showAlert()` wraps Alert.alert (native) / window.alert (web)
- **Timer screen:** Projects → Tasks hierarchy with collapsible ProjectCards, TaskRows with inline play/pause/stop, keyboard shortcuts (Space/Esc) on web
