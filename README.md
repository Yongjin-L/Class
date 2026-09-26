# Class Support

A lightweight web app for running class activities. No build step or server needed — open `index.html` in a browser (or host the folder on GitHub Pages).

## Features

- **Roster** – paste student names once (one per line or comma-separated); every tool uses the same list. Saved in your browser.
- **Random group maker** – split students by *members per group* or *number of groups*. Groups are balanced so sizes differ by at most one. Copy results to the clipboard.
- **Random picker** – spin to call on a random student, with an optional "don't repeat until everyone is picked" mode and a pick history.
- **Home** – quick overview of students, groups made, and today's picks.

## Files

- `index.html` – page structure
- `styles.css` – admin-style layout (dark top bar, sidebar, cards), with dark mode and mobile support
- `app.js` – app logic
