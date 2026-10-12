// ====== Sabitler ======
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

// ====== DOM ======
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const locationBtn = document.getElementById("locationBtn");
const errorMsg = document.getElementById("errorMsg");
const currentCard = document.getElementById("currentWeather");
const forecastSec = document.getElementById("forecast");
const forecastList = document.getElementById("forecastList");
const cityNameEl = document.getElementById("cityName");
const currentTempEl = document.getElementById("currentTemp");
const currentIconEl = document.getElementById("currentIcon");
const weatherDescEl = document.getElementById("weatherDesc");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const lastUpdatedEl = document.getElementById("lastUpdated");
const offlineBanner = document.getElementById("offlineBanner");
const themeBtn = document.getElementById("themeBtn");

// ====== Tema ======
const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") document.body.classList.add("dark");
themeBtn.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  themeBtn.textContent = isDark ? "☀️" : "🌙";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// ====== Çevrimiçi / Çevrimdışı ======
function updateOnlineStatus() {
  if (navigator.onLine) {
    offlineBanner.classList.add("hidden");
  } else {
    offlineBanner.classList.remove("hidden");
  }
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ====== Yardımcı: Hata göster ======
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  currentCard.classList.add("hidden");
  forecastSec.classList.add("hidden");
}
function clearError() {
  errorMsg.classList.add("hidden");
  errorMsg.textContent = "";
}

// ====== Hava durumu kodu -> ikon & açıklama ======
const weatherCodes = {
  0:  ["☀️", "Açık"],
  1:  ["🌤️", "Az bulutlu"],
  2:  ["⛅", "Parçalı bulutlu"],
  3:  ["☁️", "Kapalı"],
  45: ["🌫️", "Sisli"],
  48: ["🌫️", "Kırağılı sis"],
  51: ["🌦️", "Hafif çisenti"],
  53: ["🌦️", "Çisenti"],
  55: ["🌧️", "Yoğun çisenti"],
  61: ["🌧️", "Hafif yağmur"],
  63: ["🌧️", "Yağmurlu"],
  65: ["🌧️", "Şiddetli yağmur"],
  71: ["🌨️", "Hafif kar"],
  73: ["🌨️", "Kar"],
  75: ["❄️", "Yoğun kar"],
  80: ["🌦️", "Sağanak"],
  81: ["🌧️", "Şiddetli sağanak"],
  82: ["⛈️", "Çok şiddetli sağanak"],
  95: ["⛈️", "Gök gürültülü fırtına"],
  96: ["⛈️", "Dolulu fırtına"],
  99: ["⛈️", "Şiddetli dolulu fırtına"],
};

function getWeatherInfo(code) {
  return weatherCodes[code] || ["❓", "Bilinmiyor"];
}

// ====== Rüzgar yönü (derece -> yön) ======
function windDirection(deg) {
  const dirs = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
  return dirs[Math.round(deg / 45) % 8];
}

// ====== Şehir ara ======
async function searchCity(city) {
  clearError();
  if (!navigator.onLine) {
    showError("İnternet bağlantısı yok.");
    return;
  }
  try {
    const res = await fetch(
      `${GEO_API}?name=${encodeURIComponent(city)}&count=1&language=tr&format=json`
    );
    if (!res.ok) throw new Error("Geocoding isteği başarısız oldu.");
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      showError(`"${city}" şehri bulunamadı. Lütfen geçerli bir şehir adı girin.`);
      return;
    }
    const loc = data.results[0];
    await getWeather(loc.latitude, loc.longitude, loc.name, loc.country);
  } catch (e) {
    showError("Şehir aranırken bir hata oluştu: " + e.message);
  }
}

// ====== Konuma göre ======
function useLocation() {
  clearError();
  if (!navigator.geolocation) {
    showError("Tarayıcınız konum özelliğini desteklemiyor.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      await getWeather(latitude, longitude, "Konumum", "");
    },
    (err) => {
      showError("Konum alınamadı: " + err.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ====== Hava durumu al ======
async function getWeather(lat, lon, name, country) {
  clearError();
  if (!navigator.onLine) {
    showError("İnternet bağlantısı yok. Hava durumu güncellenemiyor.");
    return;
  }
  try {
    const url =
      `${WEATHER_API}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=5&temperature_unit=celsius&wind_speed_unit=kmh`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Hava durumu isteği başarısız oldu.");
    const data = await res.json();
    renderWeather(data, name, country);
  } catch (e) {
    showError("Hava durumu alınamadı: " + e.message);
  }
}

// ====== Arayüze yazdır ======
function renderWeather(data, name, country) {
  const cur = data.current;
  const daily = data.daily;

  // Şehir adı
  cityNameEl.textContent = country ? `${name}, ${country}` : name;

  // Anlık
  currentTempEl.textContent = `${Math.round(cur.temperature_2m)}°C`;
  const [icon, desc] = getWeatherInfo(cur.weather_code);
  currentIconEl.textContent = icon;
  weatherDescEl.textContent = desc;
  humidityEl.textContent = `${cur.relative_humidity_2m}%`;
  windEl.textContent = `${Math.round(cur.wind_speed_10m)} km/s ${windDirection(cur.wind_direction_10m)}`;

  // Güncelleme zamanı
  const now = new Date();
  lastUpdatedEl.textContent =
    "Son güncelleme: " +
    now.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // 5 günlük tahmin
  forecastList.innerHTML = "";
  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    const [dIcon, dDesc] = getWeatherInfo(daily.weather_code[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);

    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <span class="day">${dayName}<br><small>${dDesc}</small></span>
      <span class="icon">${dIcon}</span>
      <span class="temps">
        <span class="temp-max">${max}°C</span>
        <span class="temp-min">${min}°C</span>
      </span>
    `;
    forecastList.appendChild(item);
  }

  currentCard.classList.remove("hidden");
  forecastSec.classList.remove("hidden");
}

// ====== Olaylar ======
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  searchCity(city);
});

locationBtn.addEventListener("click", useLocation);

// ====== Service Worker ======
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => console.log("SW kayıtlı:", reg.scope))
      .catch((err) => console.warn("SW kayıt hatası:", err));
  });
}