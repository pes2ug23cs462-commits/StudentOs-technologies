# StudentOS — Light Theme Design Guidelines

Comprehensive specifications for color palette, atmospheric backgrounds, typography, cards, and asset management in the StudentOS Light Theme.

---

## 1. Color Palette & Atmosphere

### Ambient Background
- **Base Color**: `#f1f4fb`
- **Atmospheric Gradient**: `linear-gradient(135deg, #f0f3fd 0%, #edf1fc 45%, #f6f3fc 100%)`
- **Soft Glow 1 (Top Left)**: `radial-gradient(ellipse at 15% 15%, rgba(220, 228, 255, 0.7) 0%, transparent 55%)`
- **Soft Glow 2 (Bottom Right)**: `radial-gradient(ellipse at 85% 85%, rgba(240, 230, 255, 0.6) 0%, transparent 50%)`

### Typography Hierarchy
- **Navy Primary (`#0f172a`)**: Page titles, card headings, numbers, emphasis.
- **Slate Body (`#334155` / `#1e293b`)**: Main body text, active labels, priorities text.
- **Muted Subtitles (`#64748b`)**: Dates, metadata, secondary instructions, subtitles.
- **Dim / Tags (`#94a3b8`)**: Section labels, borders, subtle icons.

### Accents & Status Indicators
- **Emerald Green (`#16a34a` / `#10b981`)**:
  - Primary action buttons (*Start session*).
  - Status badges (*On track*, *Next session tonight*).
  - Active navigation indicator bar.
  - Checked priority checkboxes.
  - Completed calendar indicators.
  - Background soft: `#e6f9ed`, Border: `#bbf7d0`.
- **Purple & Lavender (`#7c3aed` / `#8b5cf6` / `#ded8fe`)**:
  - Active sidebar navigation background (`#ded8fe`).
  - Active selected calendar day pill (`#e9e5ff`, border: `#8b5cf6`).
  - Quick action icon container backgrounds.
- **Alert Red (`#ef4444`)**:
  - Missed session alert badge & text.
  - Soft background: `#fef2f2`, Border: `#fecaca`.
- **Amber Warning (`#b45309`)**:
  - Deadlines warning badge (*3 days left*).
  - Soft background: `#fef3c7`, Border: `#fde68a`.

---

## 2. Card Design & Elevation

- **Card Background**: `#ffffff` (Pure crisp white).
- **Border**: `1px solid #e4e7ee`.
- **Border Radius**: `14px` (standard card), `12px` (quick card), `8px` (button/input).
- **Elevation Shadow**: `0 4px 20px -2px rgba(100, 116, 139, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)`.
- **Hover Elevation**: `0 8px 24px -2px rgba(100, 116, 139, 0.09)`.

---

## 3. Sidebar Specifications

- **Width**: `236px` fixed desktop width.
- **Background**: `#ffffff`.
- **Border Right**: `1px solid rgba(0, 0, 0, 0.07)`.
- **Branding**:
  - Main Horizontal Logo: `assets/light_logo.png`.
  - CSS display height: `36px` (`width: auto; object-fit: contain; mix-blend-mode: multiply;`).
  - Margins: `margin-bottom: 18px; padding-left: 2px;`.
- **Active Navigation Item**:
  - Background: `#ded8fe`.
  - Color: `#312e81`.
  - Left indicator: `width: 3.5px; height: 20px; background: #10b981; border-radius: 4px;`.
- **Theme Selector**:
  - Pill container (`#f1f4f9`, border `#e2e8f0`).
  - Active Light pill: `#c3ebcf`, text `#065f46`, font-weight `600`.

---

## 4. Asset Management & Path Rules

- All image assets must strictly reside inside the `assets/` subfolder.
- Paths in HTML must use relative paths prefixed with `assets/`:
  - Main Logo: `<img src="assets/light_logo.png" alt="StudentOS" class="brand-logo">`
  - Assistant Emblem: `<img src="assets/StudentOS_symbol.png" alt="StudentOS" class="widget-logo">`
- Dynamic image templates generated via JavaScript must also resolve to `assets/`:
  - `assets/StudentOS_symbol.png`
