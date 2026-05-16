# Camera Dashboard — Architecture Document

## Overview

A lightweight, self-hosted dashboard for displaying BlueIris camera feeds as
individual camera tiles on a display PC, plus weather and other widgets.
Replaces the current Homarr iframe approach.

---

## Infrastructure

| Host | IP | Role |
|------|-----|------|
| **Display PC** | 10.10.0.241 | Runs browser/dashboard — x86_64, Ubuntu 24.04, Firefox with Homarr |
| **Homarr** | 10.10.0.200:7575 | Dashboard server (Next.js) — embeds BlueIris as iframe |
| **BlueIris PC** | 10.10.0.20:81 | NVR — captures all camera feeds |
| **Grafana** | 10.10.0.20:3000 | Dashboards (also on BlueIris PC) |
| **Other on 10.10.0.200** | 7878, 8989, 3001, 32400, 6789 | Radarr, Sonarr, Dash. (monitoring), Plex, and one more |

---

## Current State

- **Dashboard**: Homarr at `http://10.10.0.200:7575/` — board named "Cameras"
- **Video Source**: BlueIris running on 10.10.0.20:81 (BlueServer/5.9.9.98)
- **Current approach**: Homarr embeds the **entire BlueIris UI** (`http://10.10.0.20:81/ui3.htm`) as a **single iframe**
  - The BlueIris UI3 is a third-party UI from GitHub: bp2008/ui3
  - All cameras shown together in BlueIris's built-in grid layout
- **Pain point**: Can't break out individual cameras; stuck with BlueIris's layout
- **Display PC**: Firefox at `http://10.10.0.200:7575/` — user accesses Homarr via browser

---

## Display PC System Profile (10.10.0.241)

| Property | Value |
|----------|-------|
| **Architecture** | x86_64 (Intel Coffee Lake-S) |
| **OS** | Ubuntu 24.04.4 LTS (Noble Numbat), kernel 6.14.0 |
| **CPU** | 6 cores |
| **RAM** | 7.5 GB total, 4.2 GB available |
| **GPU** | Intel UHD Graphics 630 (i915 driver) |
| **Display** | 4K resolution (3840×2160) |
| **Disk** | 233 GB, 148 GB free (34% used) |
| **Browser** | Firefox (snap package, been running since Feb 14) |
| **RDP** | gnome-remote-desktop on port 3389 |
| **User** | omnicy (in sudo group) |
| **Docker** | Not installed |
| **Node/npm** | Not installed |

**Key Advantages**:
- ✅ **Plenty of disk space** (148 GB free)
- ✅ **x86_64** — any Docker image works
- ✅ **Decent RAM** (4.2 GB available)
- ✅ **sudo access** (omnicy in sudo group)
- ✅ **Firefox already running** — can be pointed to new dashboard
- ✅ **Direct network access** to BlueIris at 10.10.0.20:81

---

## BlueIris Camera Stream URLs

BlueIris exposes individual camera streams via these endpoints:

| Feed Type | URL Pattern | Notes |
|-----------|-------------|-------|
| **MJPEG (live)** | `http://10.10.0.20:81/cameras/<cam_name>/mjpg/webcam.cgi` | Real-time MJPEG stream |
| **Snapshot** | `http://10.10.0.20:81/preview/<cam_name>` | Single JPEG image |
| **Snapshot (alt)** | `http://10.10.0.20:81/snap/<cam_name>/jpg/image.jpg` | Another snapshot endpoint |

`<cam_name>` is the camera name as configured in BlueIris (e.g., `cam1`, `FrontDoor`, etc.).

**Note**: The BlueIris UI3 (bp2008/ui3) is a single-page app. Camera names are loaded dynamically via JavaScript and are **not exposed in the HTML source**. You must obtain camera names from the BlueIris configuration interface.

---

## Homarr Current Configuration

The Homarr board "Cameras" currently has these widgets:

| Widget | Config |
|--------|--------|
| **Iframe** | `http://10.10.0.20:81/ui3.htm` (full BlueIris UI) |
| **Clock** | 12-hour format, custom timezone (America/New_York) |
| **Weather** | Imperial (°F), location lat 35.29 / lon -80.94 (Charlotte NC area) |
| **Stock Price** × 3 | BBAI (3mo/1h), BULL (3mo/1h), SPY (1mo/1d) |
| **System Resources** | CPU, memory, network charts |

Homarr is a Next.js app (v0.16.x) running on 10.10.0.200:7575.

---

## Solution Comparison

### Option 1: Custom Static HTML Dashboard (RECOMMENDED)

**What it is**: Hand-crafted HTML/CSS/JS page with individual camera tiles.

**Pros**:
- ✅ Lightweight — just a few KB of files
- ✅ Config-driven — edit JSON to add/remove cameras
- ✅ Individual camera tiles (not a single iframe)
- ✅ Dark theme, grid layout, clock/date/weather widgets
- ✅ Can deploy as static files or run Python HTTP server
- ✅ Works on x86_64 with Firefox
- ✅ Easy to iterate and customize
- ✅ No new services required

**Cons**:
- Manual work to add/remove cameras (but config is simple JSON)
- No auto-discovery of cameras from BlueIris

**Setup**: Deploy files to display PC, point Firefox at the dashboard.

---

### Option 2: Dashman

Docker container purpose-built for BlueIris camera displays.

**Pros**: BlueIris-specific, auto-discovers cameras, status indicators

**Cons**: Requires Docker (not installed), BlueIris-specific only

**Verdict**: Skip — would need to install Docker first.

---

### Option 3: gethomepage

Modern self-hosted application dashboard with camera support.

**Pros**: Excellent camera card support, huge ecosystem, active development

**Cons**: Requires Docker or Node.js, heavier than static HTML

**Verdict**: Possible but adds complexity. Static HTML is simpler.

---

### Option 4: Frigate

Full NVR with AI object detection.

**Pros**: Incredible dashboard, AI detection

**Cons**: Overkill, duplicates BlueIris, requires GPU + complex setup

**Verdict**: Skip — you already have BlueIris.

---

## Recommendation

**Custom Static HTML Dashboard** — the simplest, most flexible solution.

### Proposed Tech Stack

```
cam-dashboard/
├── ARCHITECTURE.md          # This file
├── README.md                # Setup and usage
├── config/
│   └── cameras.json         # Camera list + layout config
├── public/
│   ├── index.html           # Main dashboard page
│   ├── style.css            # Dark theme, grid layout
│   └── dashboard.js         # App logic (cameras, clock, weather)
├── deploy.sh                # One-command deploy script
└── .env.example             # Weather API keys
```

### Camera Config (`config/cameras.json`)

```json
{
  "blueiris": {
    "host": "10.10.0.20",
    "port": 81
  },
  "layout": {
    "columns": 4,
    "large": "2x2",
    "small": "1x1",
    "gutter": "4px"
  },
  "cameras": [
    { "name": "CAM1", "label": "Front Door", "size": "large" },
    { "name": "CAM2", "label": "Backyard", "size": "small" }
  ],
  "widgets": [
    { "type": "clock", "format": "12h" },
    { "type": "date" },
    { "type": "weather", "location": "Charlotte", "api_key": "" }
  ]
}
```

### Stream URLs (auto-generated)

Each camera tile uses BlueIris MJPEG:
```
http://10.10.0.20:81/cameras/CAM1/mjpg/webcam.cgi
```

---

## Next Steps

1. **Get BlueIris camera names** — Need to know the actual camera names from BlueIris config
2. **Deploy to display PC** — Upload files and point Firefox at the dashboard
3. **Set browser to fullscreen** — Optionally configure kiosk mode for always-on display
4. **Iterate** — Tweak layout, add more widgets based on feedback

---

## Notes

- **BlueIris auth**: MJPEG streams may need authentication. If so, we'll configure credentials.
- **Network**: All devices on 10.10.0.0/24 — direct access between hosts.
- **Display**: 4K resolution (3840×2160) on Intel UHD 630.
- **Browser**: Firefox (already running on display PC).
- **Kiosk mode**: Can set up Firefox in kiosk mode for always-on display.
- **Homarr can stay** — The new dashboard can run alongside Homarr if desired.
- **Camera names needed** — The BlueIris UI3 loads camera names dynamically.
  Please provide the camera names from the BlueIris configuration interface.
