# Mia Task Capture (Chrome MV3)

Standalone Chrome extension that saves tasks to Firestore as
`source: extension` under `users/{uid}/tasks`.

Works with the companion Flutter app:
[voice-task-app](https://github.com/MaadhiniNarayanaKumar/voice-task-app).
Pasted tasks are classified and saved the same way the app adds a task:
category, priority (today saves as high), and a due time of 11:59 PM.

Sibling of
[mia-calendar-extension](https://github.com/MaadhiniNarayanaKumar/mia-calendar-extension).

## Load in Chrome

1. Copy config and fill Firebase credentials:

```bash
cp config.example.js config.js
```

2. Open `chrome://extensions` → **Developer mode** → **Load unpacked** → select this folder
3. Enable **Anonymous** auth in Firebase (or set email/password in `config.js`)
4. Paste a task → review title, category, due date, priority, and notes → **Send to Mia**

## Paste task

1. Copy a line such as `Buy milk tomorrow` or `Email the professor by Friday, high priority`
2. Open the extension → paste into **Paste task** (it parses as you paste)
3. Check the highlighted fields → **Send to Mia**

You can also highlight text on a page and choose **Send selection to Mia Tasks**.

Guessed fields, matching the app:

- **Category** — loaded from `users/{uid}/categories`. Keywords map the same way as the app (milk → Groceries, homework → Class, email → Job, doctor → Personal). Pick a category, or leave **Auto**.
- **Due** — Today, Tomorrow, Next week, a weekday, or a month and day. Saved at 11:59 PM that day. If none is found, due defaults to tomorrow at 11:59 PM.
- **Priority** — `urgent`, `asap`, `high priority`, or `important` becomes high; `low priority` or `whenever` becomes low. Otherwise medium. A due date today or overdue saves as high, and a due date within 2 days saves at least medium.
- **Notes** — optional, stored on the task text the same way the add-task sheet does.

If `geminiApiKey` is set in `config.js`, Auto classification uses the same Gemini prompt as the app, then falls back to the keyword rules.

## In the app

After **Send to Mia**, the task is on the Mia task list (Home → Mia, or Quick actions → Voice / Add task).

- Open tasks are grouped by due date. There is no “X of Y tasks completed” progress card.
- When nothing is open, the screen says **All done** with a check icon.
- Category chips on that screen still filter the list. Categories are edited from Quick actions → Categories.

## Notes

- Writes go to `users/{uid}/tasks` (default `local-guest`) with `status: enriched`
- `dueDate` and `createdAt` are Firestore timestamps, which is what the app reads
- `config.js` is gitignored — only `config.example.js` is committed
- After changing auth or code, click **Reload** on the extension
