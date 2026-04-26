# ⏸ Inbox Pause — Setup Guide

A true server-side Gmail inbox pause. Pause/unpause from **iOS Safari**, **any desktop browser**, or directly from **Gmail's UI** via a userscript.

---

## How it works

When paused, a Gmail-side filter is created that catches all incoming mail, removes it from your Inbox, and applies an "Inbox Pause" label. Your emails sit safely in All Mail — no notifications fire anywhere, on any device. When you unpause, the filter is deleted and all held emails are moved back to your inbox in one batch.

**Single source of truth:** both the web app and the userscript read/write the same Gmail filter. They can never disagree.

---

## Part 1 — GitHub Pages (web app, works on iOS + any browser)

### 1. Create the repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `inbox-pause` (must match exactly)
3. Set to **Public**
4. Click **Create repository**

### 2. Upload the files

In your new repo, upload these two files (drag & drop on the repo page):
- `index.html`
- `InboxPause.user.js`

### 3. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**

After ~2 minutes, your app is live at:
```
https://barnabarna.github.io/inbox-pause/
```

### 4. Sign in

Open the URL above on any device. Click **Continue with Google** and authorize the app. That's it — you can now pause and unpause from anywhere.

---

## Part 2 — Userscript (pause/unpause from inside Gmail on desktop)

### Install Tampermonkey

| Browser | Link |
|---------|------|
| Chrome  | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Safari  | [App Store (~$2)](https://apps.apple.com/app/tampermonkey/id1482490089) or free [Userscripts app](https://apps.apple.com/app/userscripts/id1463298887) |

### Install the userscript

Two options:

**Option A (easiest):** Once your GitHub Pages site is live, navigate to:
```
https://barnabarna.github.io/inbox-pause/InboxPause.user.js
```
Tampermonkey will detect it and offer to install automatically.

**Option B:** Open Tampermonkey Dashboard → New Script → paste the contents of `InboxPause.user.js` → Save.

### First use

1. Open [mail.google.com](https://mail.google.com)
2. You'll see a **"Pause Inbox"** button in the Gmail toolbar
3. Click it — a sign-in popup will appear
4. Sign in with the same Google account
5. Done. The button now controls your inbox in real time.

---

## Usage

| Action | Web App | Gmail Userscript |
|--------|---------|-----------------|
| Pause | Click **⏸ Pause Inbox** | Click **Pause Inbox** in toolbar |
| Unpause | Click **▶ Unpause & Deliver** | Click **Paused** button or banner |
| Settings | Exceptions & Schedule tabs | Click ⚙ gear → opens web app |
| Keyboard | — | `Ctrl+Shift+P` toggle, `Ctrl+Shift+I` open app |

---

## Exceptions

Add exception rules in the web app under **Settings → Exceptions**:

- **Allowed Senders** — specific email addresses that always bypass the pause
- **Allowed Domains** — entire domains (e.g. `company.com`)
- **Subject Keywords** — emails with these words in the subject bypass the pause
- **Starred emails** — toggle to allow starred mail through

After configuring exceptions, click **"Apply exception filters to Gmail"** — this creates Gmail-side filters so exceptions work even when neither the app nor the userscript is open.

---

## Schedule Rules

In **Settings → Schedule**, add rules to auto-pause on a recurring basis. Example:
- Name: `Deep work`
- Days: Mon–Fri
- 09:00 → 17:00

**Note:** Schedule rules require the web app tab to be open (no server involved). For always-on scheduling, open the web app in a pinned tab, or consider adding a GitHub Actions workflow (contact for instructions).

---

## Troubleshooting

**Button doesn't appear in Gmail**
Gmail occasionally updates its UI. Try reloading Gmail. If it persists, open the userscript and look for the toolbar selector list — you may need to add the new class.

**"Auth cancelled" or popup blocked**
Allow popups from `mail.google.com` in your browser settings.

**Emails not being delivered after unpause**
Check that the "Inbox Pause" label exists in Gmail (left sidebar). If the label is there but empty, emails may have already been delivered. If not, go to Gmail → All Mail → filter by label "Inbox Pause" and manually move them.

**Token expired**
Tokens last ~1 hour. The app refreshes automatically on next load. If the userscript shows an error, reload Gmail.

---

## Privacy

- No servers, no database, no analytics
- Your Gmail credentials never leave Google's OAuth flow
- The access token is stored locally (localStorage / Tampermonkey storage) only
- The Gmail API `modify` scope is the minimum needed to create/delete filters and move messages
