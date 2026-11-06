# StudentOS — Light Theme Dashboard

A standalone, pixel-perfect, responsive Light Theme frontend implementation for the StudentOS Dashboard, built in accordance with the official Figma design reference.

---

## Project Structure

```text
light_theme/
│
├── index.html                  # Complete Dashboard markup & semantic structure
├── style.css                   # Light theme styling, atmospheric glows, card layout, responsive design
├── script.js                   # Client controller (state, priorities checklist, calendar, modals, drawer)
├── LIGHT_THEME_GUIDELINES.md   # Design tokens, color palette, component guidelines
├── README.md                   # Project overview & documentation
│
└── assets/
    ├── light_logo.png          # Main horizontal light brand logo
    ├── StudentOS_symbol.png    # Brand emblem (floating widget & assistant avatar)
    └── StudentOS_symbol_light.png
```

---

## Core Features

1. **Brand Identity & Header**:
   - High-resolution horizontal brand logo (`assets/light_logo.png`) displayed in the sidebar with calibrated sizing matching the Dark Theme prominence.
   - Quick header actions: *Ask StudentOS* and *View Study Plan*.

2. **Quick Action Cards**:
   - 4-card quick access grid (*Ask StudentOS*, *View Study Plan*, *Edit Schedule*, *Resume Study Session*).

3. **Two-Column Dashboard Grid**:
   - **Left Column**:
     - *Focus Study Session Card*: Next session status badge, time countdown, study objectives, Start Session button, and Reschedule button.
     - *Today's Priorities*: Interactive task checklist with persistent local state.
     - *Upcoming Deadlines*: Due dates, problem set information, and warning countdown badges.
   - **Right Column**:
     - *Current Goal Card*: Target completion date, course progress bar, and on-track status indicator.
     - *This Week*: 7-day interactive calendar with completed, missed, and upcoming session indicators.
     - *Needs Your Attention*: Missed session alert with Sunday buffer reschedule action and dismissal.

4. **Interactive Modals & Drawers**:
   - **Reschedule Modal**: Local dialog allowing students to pick an alternative study time slot.
   - **Assistant Drawer**: Slide-in AI chat panel with conversation history, quick prompt chips, and simulated responses.
   - **Theme Selector**: Interactive Dark/Light preview switcher in the sidebar.

---

## Running the Application

Open `index.html` directly in any modern web browser or serve it with any local static HTTP server:

```bash
# Example using Python
python -m http.server 8000

# Example using Node.js npx serve
npx serve .
```
