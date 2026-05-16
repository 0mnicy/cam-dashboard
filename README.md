# Camera Dashboard

Lightweight, self-hosted security camera dashboard with individual camera tiles, clock, weather, and stock widgets. Designed for always-on 4K display.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Display PC (10.10.0.241)                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Firefox Browser                      │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Header: Dashboard Title | Clock | Weather      │  │  │
│  │  ├─────────────────────────────────────────────────┤  │  │
│  │  │  ┌──────────┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐             │  │  │
│  │  │  │  Large   │ │  │ │  │ │  │ │  │  ...         │  │  │
│  │  │  │ Camera   │ │  │ │  │ │  │ │  │              │  │  │
│  │  │  │ Tile     │ └──┘ └──┘ └──┘ └──┘             │  │  │
│  │  │  └──────────┘                                  │  │  │
│  │  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐                         │  │  │
│  │  │  │  │ │  │ │  │ │  │                         │  │  │
│  │  │  └──┘ └──┘ └──┘ └──┘                         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  Footer: Camera Count | Connection Status | Last Upd  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Python HTTP Server (port 8888)                            │
│  └── public/                                                │
│      ├── index.html                                          │
│      ├── style.css                                           │
│      ├── dashboard.js                                        │
│      └── cameras.json                                        │
└─────────────────────────────────────────────────────────────┘
                          │ MJPEG streams
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BlueIris PC (10.10.0.20:81)                   │
│                                                             │
│  http://10.10.0.20:81/cameras/<name>/mjpg/webcam.cgi      │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Update Camera Config

Edit `config/cameras.json` with your actual BlueIris camera names:

```json
{
    "blueiris": {
        "host": "10.10.0.20",
        "port": 81
    },
    "layout": {
        "columns": 4,
        "defaultSize": "small"
    },
    "cameras": [
        { "name": "FrontDoor", "label": "Front Door", "size": "large" },
        { "name": "Backyard", "label": "Backyard", "size": "small" },
        { "name": "Garage", "label": "Garage", "size": "small" }
    ]
}
```

**To find your camera names**, open BlueIris UI3 (`http://10.10.0.20:81/ui3.htm`), click on each camera to see its name in the URL or properties.

### 2. Deploy

**Option A: Python HTTP Server** (recommended)
```bash
./deploy.sh --target python
```

**Option B: Manual Deploy**
```bash
# Copy files to display PC
scp -r public/ cameras.json omnicy@10.10.0.241:~/cam-dashboard/

# Start server on display PC
ssh omnicy@10.10.0.241 'cd ~/cam-dashboard && python3 -m http.server 8888 &'

# Open in Firefox
firefox http://localhost:8888/
```

### 3. Set Up Kiosk Mode (Optional)

For always-on display:

```bash
# Add to crontab (crontab -e)
@reboot sleep 15 && firefox --kiosk http://localhost:8888/
```

## Configuration

### `config/cameras.json` Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `blueiris.host` | string | "10.10.0.20" | BlueIris server IP |
| `blueiris.port` | number | 81 | BlueIris server port |
| `blueiris.protocol` | string | "http" | http or https |
| `layout.columns` | number | 4 | Grid columns |
| `layout.defaultSize` | string | "small" | Default tile size |
| `cameras[].name` | string | **required** | Camera name (from BlueIris) |
| `cameras[].label` | string | name | Display label |
| `cameras[].size` | string | "small" | "small" or "large" (2×2) |
| `widgets.clock` | boolean | true | Show clock |
| `widgets.date` | boolean | true | Show date |
| `widgets.weather.enabled` | boolean | true | Show weather |
| `widgets.weather.location` | string | "Charlotte" | City name for wttr.in |
| `refresh.mjpgInterval` | number | 5000 | MJPEG refresh ms |
| `refresh.weatherInterval` | number | 900000 | Weather refresh ms |

### Tile Sizes

- `small`: 1×1 grid cell
- `large`: 2×2 grid cell (spans 2 columns × 2 rows)

## Deployment Options

### Deploy to Display PC

```bash
# Deploy and start Python server
./deploy.sh

# Deploy with custom target
./deploy.sh --host 10.10.0.241 --user omnicy --target python
```

### Serve with Nginx

```nginx
server {
    listen 80;
    server_name dashboard.local;
    root /home/omnicy/cam-dashboard;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable caching for static assets
    location ~* \.(css|js)$ {
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Serve with Apache

```apache
<VirtualHost *:80>
    ServerName dashboard.local
    DocumentRoot /home/omnicy/cam-dashboard

    <Directory /home/omnicy/cam-dashboard>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

## Features

- ✅ **Individual camera tiles** — each camera as its own tile
- ✅ **Configurable grid** — 2-6 column layouts
- ✅ **Mixed tile sizes** — large (2×2) and small (1×1) tiles
- ✅ **Real-time MJPEG streams** — 5-second refresh interval
- ✅ **Connection status indicators** — green/red status dots
- ✅ **Live timestamps** — per-camera and global
- ✅ **Clock and date** — configurable format
- ✅ **Weather widget** — using wttr.in (no API key needed)
- ✅ **Dark theme** — optimized for always-on displays
- ✅ **4K ready** — scales to 3840×2160
- ✅ **Zero dependencies** — just HTML/CSS/JS
- ✅ **Easy to customize** — edit JSON config to change layout

## Troubleshooting

### Cameras not loading

1. Verify camera names match BlueIris config
2. Test MJPEG URL directly: `http://10.10.0.20:81/cameras/CAM1/mjpg/webcam.cgi`
3. Check BlueIris is running and cameras are active
4. Check browser console for errors (F12)

### Weather not showing

1. Check network connectivity to wttr.in
2. Verify location is valid (e.g., "Charlotte", "London", "Tokyo")
3. Check browser console for CORS errors

### Layout looks wrong

1. Check `layout.columns` matches your monitor size
2. For 4K (3840×2160): use 4 or 6 columns
3. For 1080p (1920×1080): use 2 or 3 columns
4. Adjust `gutter` in `style.css` if needed

## File Structure

```
cam-dashboard/
├── ARCHITECTURE.md      # Full system architecture
├── README.md            # This file
├── deploy.sh            # Deployment script
├── config/
│   └── cameras.json     # Camera list and layout config
├── public/
│   ├── index.html       # Main dashboard page
│   ├── style.css        # Dark theme styles
│   └── dashboard.js     # Application logic
└── .env.example         # Weather API keys
```

## License

MIT
