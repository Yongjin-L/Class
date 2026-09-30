# Class Support

A lightweight web app for running class activities. No build step or server needed — open `index.html` in a browser (or host the folder on GitHub Pages).

## Features

- **Roster** – paste student names once (one per line or comma-separated); every tool uses the same list. Saved in your browser.
- **Random group maker** – split students by *members per group* or *number of groups*. Groups are balanced so sizes differ by at most one. Copy results to the clipboard.
- **Spin the wheel** – a colorful name wheel that spins to pick a student. Optionally removes picked students until everyone has had a turn, with a pick history.
- **Home** – quick overview of students, groups made, and today's picks.

- **Full page** – expand any feature to fill the page; use Exit full page or Escape to return.
- **Animated groups** – watch names shuffle before teams appear. Reduced-motion preferences skip the animation.

## Files

- `index.html` – page structure
- `styles.css` – admin-style layout (dark top bar, sidebar, cards), with dark mode and mobile support
- `app.js` – app logic
- `favicon.svg`, `favicon.png`, `apple-touch-icon.png` – app icon

## Developer

Developed by [Yongjin Lee](https://yongjin.info).
