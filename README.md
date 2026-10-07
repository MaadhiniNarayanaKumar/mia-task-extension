# Mia Task Capture (Chrome MV3)

Standalone Chrome extension that saves tasks to Firestore as
`source: extension` under `users/{uid}/tasks`.

Works with the companion Flutter app:
[voice-task-app](https://github.com/MaadhiniNarayanaKumar/voice-task-app).
Pasted tasks are saved with `status: pendingEnrichment` so the app
cleans the title and picks a category, the same way voice tasks do.

Sibling of
[mia-calendar-extension](https://github.com/MaadhiniNarayanaKumar/mia-calendar-extension).

## Load in Chrome

1. Copy config and fill Firebase credentials:

```bash
cp config.example.js config.js
```

2. Open `chrome://extensions` → **Developer mode** → **Load unpacked** → select this folder
3. Enable **Anonymous** auth in Firebase (or set email/password in `config.js`)
4. Paste a task → review title, due date, and priority → **Send to Mia**

## Paste task

1. Copy a line such as `Buy milk tomorrow` or `Email the professor by Friday, high priority`
2. Open the extension → paste into **Paste task** (it parses as you paste)
3. Check the highlighted fields → **Send to Mia**

You can also highlight text on a page and choose **Send selection to Mia Tasks**.

Guessed fields:

- **Due** — `today`, `tomorrow`, a weekday, `next week`, or a month and day. If none is found, due defaults to tomorrow.
- **Priority** — `urgent`, `asap`, or `high` becomes high; `low` or `whenever` becomes low. Otherwise medium.
- **Category** is left empty on purpose. The Flutter app classifies it after save.

## Notes

- Writes go to `users/{uid}/tasks` (default `local-guest`) so they match the app
- `dueDate` and `createdAt` are Firestore timestamps, which is what the app reads
- `config.js` is gitignored — only `config.example.js` is committed
- After changing auth or code, click **Reload** on the extension
