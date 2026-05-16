#!/usr/bin/env node
/* ═══════════════════════════════════════════
   Security Dashboard — Main Application
   ═══════════════════════════════════════════ */

(function() {
    'use strict';

    // ── Configuration ──
    let config = null;
    const defaults = {
        blueiris: { host: '10.10.0.20', port: 81, protocol: 'http' },
        layout: { columns: 4, defaultSize: 'small', gutter: '6px' },
        cameras: [],
        widgets: { clock: true, date: true, weather: null },
        refresh: { mjpgInterval: 5000, weatherInterval: 900000 }
    };

    // ── State ──
    let cameraTimers = [];
    let weatherTimer = null;
    let clockInterval = null;
    let connectionStatus = 'disconnected';

    // ── DOM Elements ──
    const grid = document.getElementById('camera-grid');
    const loadingOverlay = document.getElementById('loading-overlay');
    const timeDisplay = document.getElementById('time-display');
    const dateDisplay = document.getElementById('date-display');
    const weatherIcon = document.getElementById('weather-icon');
    const weatherTemp = document.getElementById('weather-temp');
    const weatherDesc = document.getElementById('weather-desc');
    const weatherContainer = document.getElementById('weather-container');
    const cameraCountEl = document.getElementById('camera-count');
    const connectionStatusEl = document.getElementById('connection-status');
    const lastUpdatedEl = document.getElementById('last-updated');
    const refreshTimerEl = document.getElementById('refresh-timer');

    // ── Initialize ──
    async function init() {
        try {
            // Load config
            config = await loadConfig();
            mergeConfig(defaults);

            // Setup grid layout
            setupGridLayout();

            // Create camera tiles
            createCameraTiles();

            // Setup widgets
            setupClock();
            setupWeather();

            // Update status
            updateCameraCount();
            updateConnectionStatus('connected');
            updateTimestamp();

            // Start MJPEG refresh
            startMJPEGRefresh();

            // Hide loading overlay
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                setTimeout(() => loadingOverlay.style.display = 'none', 300);
            }, 500);

        } catch (error) {
            console.error('Initialization error:', error);
            loadingOverlay.innerHTML = `
                <div class="loader">
                    <div class="spinner"></div>
                    <p>Failed to load config: ${error.message}</p>
                </div>
            `;
        }
    }

    // ── Config Loading ──
    async function loadConfig() {
        try {
            const response = await fetch('cameras.json', { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn('Failed to load cameras.json, using defaults:', error);
            return {};
        }
    }

    function mergeConfig(defaults) {
        if (!config.blueiris) config.blueiris = defaults.blueiris;
        if (!config.layout) config.layout = defaults.layout;
        if (!config.cameras || config.cameras.length === 0) config.cameras = defaults.cameras;
        if (!config.widgets) config.widgets = defaults.widgets;
        if (!config.refresh) config.refresh = defaults.refresh;
    }

    // ── Grid Layout ──
    function setupGridLayout() {
        grid.className = `layout-${config.layout.columns}col`;
        grid.style.gridTemplateColumns = `repeat(${config.layout.columns}, 1fr)`;
    }

    // ── Camera Tile Creation ──
    function createCameraTiles() {
        grid.innerHTML = '';

        config.cameras.forEach((camera, index) => {
            const tile = document.createElement('div');
            tile.className = `tile ${camera.size || config.layout.defaultSize || 'small'}`;
            tile.dataset.cameraIndex = index;

            // Tile header
            const header = document.createElement('div');
            header.className = 'tile-header';

            const title = document.createElement('span');
            title.className = 'tile-title';
            title.textContent = camera.label || camera.name;
            header.appendChild(title);

            const status = document.createElement('div');
            status.className = 'tile-status';
            const dot = document.createElement('span');
            dot.className = 'status-dot';
            dot.id = `status-dot-${index}`;
            status.appendChild(dot);
            const text = document.createElement('span');
            text.id = `status-text-${index}`;
            text.textContent = 'Live';
            status.appendChild(text);
            header.appendChild(status);

            tile.appendChild(header);

            // Tile content (MJPEG stream)
            const content = document.createElement('div');
            content.className = 'tile-content';

            const img = document.createElement('img');
            img.id = `cam-img-${index}`;
            img.alt = camera.label || camera.name;
            img.onerror = () => showTileError(index, camera);
            img.onload = () => updateTileStatus(index, true);
            content.appendChild(img);

            // Error overlay (hidden by default)
            const errorOverlay = document.createElement('div');
            errorOverlay.className = 'error-overlay';
            errorOverlay.id = `error-overlay-${index}`;
            errorOverlay.style.display = 'none';
            errorOverlay.innerHTML = `
                <div class="error-icon">📷</div>
                <div class="error-text">Camera offline<br>${camera.name}</div>
            `;
            content.appendChild(errorOverlay);

            // Timestamp overlay
            const timestamp = document.createElement('div');
            timestamp.className = 'tile-timestamp';
            timestamp.id = `timestamp-${index}`;
            timestamp.textContent = '';
            content.appendChild(timestamp);

            tile.appendChild(content);
            grid.appendChild(tile);

            // Start MJPEG refresh for this camera
            refreshMJPEGStream(index, camera);
        });
    }

    // ── MJPEG Stream Handling ──
    function getStreamURL(camera) {
        const bi = config.blueiris;
        const base = `${bi.protocol}://${bi.host}`;
        const port = bi.port !== 80 && bi.port !== 443 ? `:${bi.port}` : '';

        // Try MJPEG webcam endpoint
        return `${base}${port}/cameras/${camera.name}/mjpg/webcam.cgi`;
    }

    function refreshMJPEGStream(index, camera) {
        const img = document.getElementById(`cam-img-${index}`);
        if (!img) return;

        const url = getStreamURL(camera);
        const timestamp = new Date().toLocaleTimeString();

        // Add cache-busting timestamp
        img.src = `${url}?t=${Date.now()}`;

        // Update tile timestamp
        const tsEl = document.getElementById(`timestamp-${index}`);
        if (tsEl) tsEl.textContent = timestamp;

        // Schedule next refresh
        if (cameraTimers[index]) {
            clearTimeout(cameraTimers[index]);
        }
        cameraTimers[index] = setTimeout(() => {
            refreshMJPEGStream(index, camera);
        }, config.refresh.mjpgInterval);
    }

    function showTileError(index, camera) {
        const errorOverlay = document.getElementById(`error-overlay-${index}`);
        const statusDot = document.getElementById(`status-dot-${index}`);
        const statusText = document.getElementById(`status-text-${index}`);

        if (errorOverlay) errorOverlay.style.display = 'flex';
        if (statusDot) {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';
        }

        // Retry after 5 seconds
        setTimeout(() => {
            refreshMJPEGStream(index, camera);
        }, 5000);
    }

    function updateTileStatus(index, isOnline) {
        const statusDot = document.getElementById(`status-dot-${index}`);
        const statusText = document.getElementById(`status-text-${index}`);
        const errorOverlay = document.getElementById(`error-overlay-${index}`);

        if (!statusDot) return;

        if (isOnline) {
            statusDot.className = 'status-dot';
            statusText.textContent = 'Live';
            if (errorOverlay) errorOverlay.style.display = 'none';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';
        }
    }

    // ── MJPEG Refresh Loop ──
    function startMJPEGRefresh() {
        config.cameras.forEach((camera, index) => {
            refreshMJPEGStream(index, camera);
        });
    }

    // ── Clock ──
    function setupClock() {
        if (!config.widgets.clock && !config.widgets.date) {
            document.getElementById('clock-container').style.display = 'none';
            return;
        }

        updateClock();
        clockInterval = setInterval(updateClock, 1000);
    }

    function updateClock() {
        const now = new Date();
        const options = {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        if (timeDisplay) {
            timeDisplay.textContent = now.toLocaleTimeString('en-US', options);
        }
        if (dateDisplay) {
            dateDisplay.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // ── Weather ──
    function setupWeather() {
        if (!config.widgets.weather || !config.widgets.weather.enabled) {
            weatherContainer.style.display = 'none';
            return;
        }

        fetchWeather();
        weatherTimer = setInterval(fetchWeather, config.refresh.weatherInterval);
    }

    async function fetchWeather() {
        try {
            const location = config.widgets.weather.location;
            const unit = config.widgets.weather.unit === 'imperial' ? 'us' : 'metric';
            const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=en`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const current = data.current_condition[0];

            if (weatherIcon) {
                weatherIcon.textContent = getWeatherEmoji(current.weatherCode);
            }
            if (weatherTemp) {
                const temp = unit === 'us' ? current.temp_F : current.temp_C;
                weatherTemp.textContent = `${temp}°${unit === 'us' ? 'F' : 'C'}`;
            }
            if (weatherDesc) {
                weatherDesc.textContent = current.lang_en ? current.lang_en[0].value : current.weatherDesc[0].value;
            }

        } catch (error) {
            console.warn('Weather fetch failed:', error);
            if (weatherIcon) weatherIcon.textContent = '⚠️';
            if (weatherTemp) weatherTemp.textContent = 'N/A';
            if (weatherDesc) weatherDesc.textContent = 'Weather unavailable';
        }
    }

    function getWeatherEmoji(code) {
        const codeNum = parseInt(code);
        if (codeNum === 113) return '☀️';
        if (codeNum === 116) return '⛅';
        if (codeNum === 119 || codeNum === 122) return '☁️';
        if (codeNum >= 176 && codeNum <= 299) return '🌧️';
        if (codeNum >= 300 && codeNum <= 399) return '🌧️';
        if (codeNum >= 200 && codeNum <= 232) return '⛈️';
        if (codeNum >= 350 && codeNum <= 379) return '🌧️';
        if (codeNum >= 400 && codeNum <= 482) return '🌨️';
        if (codeNum >= 450 && codeNum <= 482) return '🌨️';
        if (codeNum >= 464) return '🌨️';
        if (codeNum >= 500 && codeNum <= 504) return '🌧️';
        if (codeNum >= 511) return '🧊';
        if (codeNum >= 530 && codeNum <= 595) return '🌧️';
        if (codeNum >= 600 && codeNum <= 699) return '❄️';
        if (codeNum >= 700 && codeNum <= 799) return '🌫️';
        if (codeNum >= 800 && codeNum <= 899) return '🌤️';
        if (codeNum >= 900 && codeNum <= 999) return '⚠️';
        return '🌤️';
    }

    // ── Status Updates ──
    function updateCameraCount() {
        if (cameraCountEl) {
            cameraCountEl.textContent = `${config.cameras.length} cameras`;
        }
    }

    function updateConnectionStatus(status) {
        connectionStatus = status;
        if (connectionStatusEl) {
            connectionStatusEl.className = `connection-status ${status}`;
            connectionStatusEl.textContent = status === 'connected' ? '● Online' : '● Offline';
        }
    }

    function updateTimestamp() {
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    // ── Boot ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
