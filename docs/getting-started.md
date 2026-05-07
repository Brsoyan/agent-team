# Getting started

Time to first running agent: **about 5 minutes** if you already have Node and Claude Code.

## Prerequisites

| What | Why |
|---|---|
| **Node 20+** + npm | Both the API server and the board run on Node. |
| **Claude Code CLI** (`npm install -g @anthropic-ai/claude-code`, then `claude login`) | Each agent is a separate Claude Code session reusing your login. |
| **macOS + Xcode 15+** *(only if you want iOS builds)* | `expo run:ios` shells out to `xcodebuild`. |
| **Android Studio + adb** *(only if you want Android builds)* | `expo run:android` needs `adb` on PATH. |

::: tip Don't have a Claude subscription?
Set `ANTHROPIC_API_KEY=sk-ant-...` in the shell that runs `npm run dev`. Claude Code uses the API instead of your login session — you'll be billed per token.
:::

## Install

```bash
git clone https://github.com/brsoyan/agent-team
cd agent-team
npm install
cd board && npm install && cd ..
```

That's two `npm install` runs because the board (React + Vite frontend) is a separate workspace from the backend (Express + orchestrator).

## Run

```bash
npm run dev
```

This starts both pieces side by side:

- **API server** at `127.0.0.1:3333` — only reachable from your own machine.
- **Board** at `http://localhost:7788` — open in any browser.

Leave the terminal running. Agent output streams to it.

## Your first project

1. **Open** http://localhost:7788.
2. Click **+ New Project** in the top right.
3. Give it a **name** (e.g. `coffee-tracker`) and optionally paste a **PRD** — even one paragraph works. ("A simple iOS app that lets me log every coffee I drink, with a daily count.")
4. Click **Create**.
5. From the project page, click **Run Day**. The pipeline starts: PM writes a spec → Critic reviews → Designer picks a palette and screens → Developer scaffolds the Expo app → Quality Gate runs `tsc` → Reviewer reads the code → QA writes E2E tests.

Watch the **Pipeline** view: each agent's panel lights up while it's running, and you can click any task card for the full message log. The **Files** tab shows what the agents have written.

## Run the generated app on a real iPhone

Two paths. The board handles (1); use (2) when signing acts up.

### From the board

1. Open the project → **Settings** tab.
2. Set **Apple Team ID** (10-char string, e.g. `ABCDE12345`) and **Bundle Identifier** (e.g. `com.yourname.coffee`). These are written into `app.json` under `expo.ios.appleTeamId` / `expo.ios.bundleIdentifier`.
3. Plug your iPhone in, unlock it, tap **Trust** on the prompt.
4. Switch to the **App** tab. Your device shows up in the picker. Click **Run iOS (device)**.
5. On the iPhone, the first run prompts you to trust the developer profile: **Settings → General → VPN & Device Management → your Apple ID → Trust**.

Under the hood: `npx expo run:ios --device <udid>` runs `expo prebuild` once (generates `ios/` and `android/` from `app.json`), then invokes `xcodebuild`.

### From Xcode

When code signing gets weird:

```bash
cd workspace/<project-id>/code/<AppName>
npx expo prebuild
open ios/*.xcworkspace
```

In Xcode: **Signing & Capabilities** → tick **Automatically manage signing**, pick your Team → select your device → **Run ▶**.

::: tip Free Apple ID signing
Free Apple IDs work but re-sign every 7 days; the app stops launching after that — rebuild from Xcode to refresh. A paid Developer account ($99/year) gives 1-year profiles.
:::

::: warning Don't hand-edit ios/ or android/
They're regenerated from `app.json` by `expo prebuild`. If you need to tweak native config, edit `app.json` and run `npx expo prebuild --clean`.
:::

## Android

Same idea: `Run Android` from the board's **App** tab, or `npx expo run:android --device` from `workspace/<project-id>/code/<AppName>`.

## What's next

- **Read [How it works](/how-it-works)** to understand the pipeline mental model before you start tweaking.
- **Read [Architecture](/architecture)** before you contribute code.
- **Add your own agent** — see [Extending → New agents](/extending/agents).
