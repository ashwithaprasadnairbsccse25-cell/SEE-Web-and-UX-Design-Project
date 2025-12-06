/* =====================================================
   CLARITYWEATHER — FIXED & UPDATED FULL JS
   - Theme toggle (light/dark)
   - Weather search + Geolocation
   - 5-Day Forecast (API 2.5 — NO OneCall API required)
   - Floating bubbles animation
===================================================== */

/* -------- CONFIG -------- */
const OPENWEATHER_API_KEY = "4387cd299e61fce8135e55f19d859f5f";

/* Utility */
const $ = (id) => document.getElementById(id);
const sanitize = (s) => String(s || "").trim();

/* =====================================================
   THEME TOGGLE + SAVE
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const toggle = $("themeToggle");
    const saved = localStorage.getItem("cw-theme") || "light";

    document.documentElement.setAttribute("data-theme", saved);
    if (toggle) toggle.textContent = saved === "dark" ? "☀️" : "🌙";

    if (toggle) {
        toggle.addEventListener("click", () => {
            const cur = document.documentElement.getAttribute("data-theme");
            const next = cur === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem("cw-theme", next);
            toggle.textContent = next === "dark" ? "☀️" : "🌙";
        });
    }

    /* Initialize bubbles animation */
    initBubblesCanvas();
});

/* =====================================================
   BUBBLES ANIMATION
===================================================== */
function initBubblesCanvas() {
    const canvas = $("bubblesCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let DPR = window.devicePixelRatio || 1;

    function resize() {
        canvas.width = innerWidth * DPR;
        canvas.height = innerHeight * DPR;
        canvas.style.width = innerWidth + "px";
        canvas.style.height = innerHeight + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    const bubbleCount = Math.round(innerWidth / 20);
    const bubbles = [];

    for (let i = 0; i < bubbleCount; i++) {
        bubbles.push({
            x: Math.random() * innerWidth,
            y: innerHeight + Math.random() * innerHeight * 0.5,
            r: Math.random() * 6 + 3,
            vx: (Math.random() - 0.5) * 0.2,
            vy: -(0.2 + Math.random() * 0.4)
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let b of bubbles) {
            b.x += b.vx;
            b.y += b.vy;

            if (b.y + b.r < -20) {
                b.x = Math.random() * innerWidth;
                b.y = innerHeight + 30;
            }

            ctx.beginPath();
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }
    draw();
}

/* =====================================================
   WEATHER SEARCH
===================================================== */
async function fetchWeatherByInput() {
    const city = sanitize($("cityInput").value);
    const out = $("weatherResult");

    if (!city) return (out.innerHTML = "<p>Please enter a city name.</p>");
    await getWeather(city, out);
}

async function getWeather(city, out) {
    try {
        out.innerHTML = "<p>Loading…</p>";

        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) return (out.innerHTML = `<p>City not found.</p>`);

        renderWeather(data, out);
    } catch (err) {
        out.innerHTML = "<p>Error loading weather.</p>";
    }
}

/* =====================================================
   WEATHER BY GEOLOCATION
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const loc = $("locBtn");
    if (!loc) return;

    loc.addEventListener("click", () => {
        const out = $("weatherResult");

        if (!navigator.geolocation)
            return (out.innerHTML = "<p>GPS not supported.</p>");

        out.innerHTML = "<p>Getting your location…</p>";

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude, out);
            },
            (err) => (out.innerHTML = `<p>${err.message}</p>`)
        );
    });
});

async function getWeatherByCoords(lat, lon, out) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const res = await fetch(url);
        const data = await res.json();
        renderWeather(data, out);
    } catch {
        out.innerHTML = "<p>Error fetching your location weather.</p>";
    }
}

/* =====================================================
   RENDER WEATHER CARD
===================================================== */
function renderWeather(data, container) {
    const temp = Math.round(data.main.temp);
    const feels = Math.round(data.main.feels_like);
    const desc = data.weather[0].description;
    const icon = data.weather[0].icon;
    const iconURL = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    container.innerHTML = `
      <h3>${data.name}, ${data.sys.country}</h3>
      <div style="display:flex;align-items:center;gap:15px;margin-top:10px;">
        <img src="${iconURL}" width="80">
        <div>
          <div style="font-size:30px;font-weight:800;">${temp}°C</div>
          <div>${desc}</div>
          <div style="opacity:0.7;font-size:14px;margin-top:5px;">
            Feels like: ${feels}°C<br>
            Humidity: ${data.main.humidity}%<br>
            Wind: ${data.wind.speed} m/s
          </div>
        </div>
      </div>

      <button class="btn" style="margin-top:15px" onclick="goToForecast('${data.name}')">
        View 5-Day Forecast
      </button>
    `;
}

/* =====================================================
   FORECAST PAGE LOADER
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    if (!location.pathname.endsWith("forecast.html")) return;

    const params = new URLSearchParams(location.search);
    const city = params.get("city");

    if (city) {
        $("forecastCity").value = city;
        fetchForecastByInput();
    }
});

/* =====================================================
   FORECAST SEARCH (5-DAY)
===================================================== */
async function fetchForecastByInput() {
    const city = sanitize($("forecastCity").value);
    const out = $("forecastResult");

    if (!city) return (out.innerHTML = "<p>Please enter a city name.</p>");

    out.innerHTML = "<p>Loading…</p>";

    await getFiveDayForecast(city, out);
}

/* =====================================================
   5-DAY FORECAST USING API 2.5
===================================================== */
async function getFiveDayForecast(city, out) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) return (out.innerHTML = "<p>City not found.</p>");

        renderFiveDay(data, city, out);
    } catch {
        out.innerHTML = "<p>Error loading forecast.</p>";
    }
}

/* =====================================================
   RENDER 5-DAY FORECAST
===================================================== */
function renderFiveDay(data, city, container) {
    let html = `<h3>${city} — 5-Day Forecast</h3><div class="forecast-grid">`;

    // API gives 40 entries → 8 per day → pick 1 every 8
    for (let i = 0; i < data.list.length; i += 8) {
        const d = data.list[i];
        const date = d.dt_txt.split(" ")[0];
        const icon = d.weather[0].icon;

        html += `
        <div class="forecast-card">
            <strong>${date}</strong>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" width="60">
            <div>${d.weather[0].description}</div>
            <div style="margin-top:8px;font-weight:700;">
                ${Math.round(d.main.temp_max)}° / ${Math.round(d.main.temp_min)}°
            </div>
        </div>`;
    }

    html += "</div>";
    container.innerHTML = html;
}

/* =====================================================
   CONTACT FORM REMOVED
===================================================== */
// All contact form functions, EmailJS config, and DOM references removed.
