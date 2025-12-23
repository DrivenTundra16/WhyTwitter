# Why Twitter?

A Chrome extension that adds psychological friction to Twitter/X by requiring you to state your intention before accessing it.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green) ![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## How It Works

1. Navigate to `twitter.com` or `x.com` → **Blocked**
2. Type why you're opening Twitter (5+ characters)
3. Access granted for **5 minutes** in **that tab only**
4. After 5 minutes → automatically blocked again
5. New tab = new reason required

## Features

- 🚫 Blocks Twitter/X until you state your reason
- ⏱️ 5-minute per-tab access limit (enforced)
- 📝 Logs all your reasons locally
- 🔒 No data collected, no external requests
- 🎨 Matches X's official design language

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the project folder

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | Service worker — intercepts navigation, manages timers |
| `block.html` | Block page UI |
| `block.js` | Input validation and messaging |
| `icon.svg` | Source icon |
| `icon128.png` | Extension icon (128x128) |

## Privacy

- All data stored locally via `chrome.storage.local`
- Reasons never leave your browser
- No analytics, no tracking, no external requests

## License

MIT
