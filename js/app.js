const priceElement = document.getElementById("price");
const allInPriceElement = document.getElementById("allInPrice");
const updatedElement = document.getElementById("updated");
const statusElement = document.getElementById("status");
const hoursLeftElement = document.getElementById("hoursLeft");
const hoursRightElement = document.getElementById("hoursRight");

const dataSource = CONFIG.useMockData
    ? window.mockSource
    : new LiveDataSource();

let displayedPrice = 0;
let targetPrice = 0;
let displayedAllInPrice = 0;
let targetAllInPrice = 0;

let lastFrame = performance.now();

/**
 * Calculate all-in cost from wholesale spot price
 * Includes: spot + powerhub fee + distribution + transmission + levy + daily fixed
 * 
 * Distribution charge varies by season (Vector's seasonal peak windows):
 * - June–August: 07:00–11:00 peak only
 * - September–May: 17:00–22:00 (5pm–10pm) peak only
 */
function calculateAllInCost(spotPricePerMwh, dateTime) {
    
    // Convert spot price from $/MWh to c/kWh
    const spotPrice = spotPricePerMwh / 10;
    
    // PowerHub fee: 10% of spot price
    const powerhubFee = spotPrice * (CONFIG.tariff.powerhubFee / 100);
    
    // Distribution charge: depends on seasonal peak/off-peak hours
    const hour = dateTime.getHours();
    const month = dateTime.getMonth(); // 0–11 (Jan=0, Dec=11)
    
    let isPeak;
    
    if (CONFIG.tariff.peakHours.winterMonths.includes(month)) {
        // Winter (June–August): 7–11am peak
        isPeak = hour >= CONFIG.tariff.peakHours.winterPeakStart && 
                 hour < CONFIG.tariff.peakHours.winterPeakEnd;
    } else {
        // Other months (Sept–May): 5–10pm peak
        isPeak = hour >= CONFIG.tariff.peakHours.otherPeakStart && 
                 hour < CONFIG.tariff.peakHours.otherPeakEnd;
    }
    
    const distributionCharge = isPeak 
        ? CONFIG.tariff.distribution.peak 
        : CONFIG.tariff.distribution.offpeak;
    
    // Fixed charges (transmission + levy + daily fixed)
    const transmission = CONFIG.tariff.transmission;
    const eaLevy = CONFIG.tariff.eaLevy;
    const dailyFixed = CONFIG.tariff.dailyFixedPerHalfHour;
    
    // All-in cost in c/kWh
    const allInCost = spotPrice + powerhubFee + distributionCharge + transmission + eaLevy + dailyFixed;
    
    return allInCost;
}

/**
 * Enhance data with all-in cost calculation
 */
function enrichDataWithAllInCost(data) {
    return data.map(d => ({
        time: d.time,
        price: d.price,  // Wholesale spot price (c/kWh)
        allInPrice: calculateAllInCost(d.price * 10, d.time)  // Convert back to $/MWh for calculation
    }));
}

function animate(now) {

    const dt = (now - lastFrame) / 1000;
    lastFrame = now;

    // ----- Data -----

    const rawData = dataSource.getData();
    const data = enrichDataWithAllInCost(rawData);
    const currentIndex = dataSource.getCurrentIndex();

    targetPrice = data[currentIndex].price;
    targetAllInPrice = data[currentIndex].allInPrice;

    renderer.draw(data);

    updateStatus();

    // ----- Smooth number animation -----

    displayedPrice += (targetPrice - displayedPrice) * Math.min(dt * 5, 1);
    displayedAllInPrice += (targetAllInPrice - displayedAllInPrice) * Math.min(dt * 5, 1);

    priceElement.textContent = displayedPrice.toFixed(CONFIG.decimals);
    
    if (allInPriceElement) {
        allInPriceElement.textContent = displayedAllInPrice.toFixed(CONFIG.decimals);
    }

    // ----- Time -----

    const t = new Date();

    updatedElement.textContent = t.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    // ----- Night mode -----

    updateNightMode();

    // ----- Animated zoom -----

    STATE.displayedTimelineHours +=
        (STATE.timelineHours - STATE.displayedTimelineHours) *
        Math.min(dt * CONFIG.zoomLerpSpeed, 1);

    const shownHours = Math.round(STATE.displayedTimelineHours);

    hoursLeftElement.textContent = `−${shownHours}h`;
    hoursRightElement.textContent = `+${shownHours}h`;

    requestAnimationFrame(animate);

}

requestAnimationFrame(animate);


//------------------------------------------------------------
// Refresh data on an interval
//------------------------------------------------------------

const refreshSeconds = CONFIG.useMockData
    ? CONFIG.refreshIntervalSeconds
    : CONFIG.dataRefreshSeconds;

setInterval(() => {
    dataSource.refresh();
}, refreshSeconds * 1000);


//------------------------------------------------------------
// Status dot
//------------------------------------------------------------

function updateStatus() {

    if (CONFIG.useMockData) {
        statusElement.classList.remove("stale");
        return;
    }

    statusElement.classList.toggle("stale", !STATE.connected);

}


//------------------------------------------------------------
// Tap to zoom
//------------------------------------------------------------

document.body.addEventListener("click", () => {

    if (!settingsOverlay.classList.contains("hidden"))
        return;

    if (suppressNextClick) {
        suppressNextClick = false;
        return;
    }

    STATE.timelineHours =
        STATE.timelineHours === CONFIG.defaultTimelineHours
            ? CONFIG.zoomedTimelineHours
            : CONFIG.defaultTimelineHours;

});


//------------------------------------------------------------
// Two-finger tap = manual night mode toggle
//------------------------------------------------------------

let touchTimer = null;

document.body.addEventListener("touchstart", (e) => {

    if (e.touches.length !== 2)
        return;

    e.preventDefault();
    clearTimeout(touchTimer);

    touchTimer = setTimeout(() => {

        if (STATE.nightModeOverride === null)
            STATE.nightModeOverride = true;
        else if (STATE.nightModeOverride === true)
            STATE.nightModeOverride = false;
        else
            STATE.nightModeOverride = null;

        applyNightMode();
        showNightModeToast();

    }, 100);

}, { passive:false });

function showNightModeToast() {

    const label =
        STATE.nightModeOverride === true ? "Night mode: On" :
        STATE.nightModeOverride === false ? "Night mode: Off" :
        "Night mode: Auto";

    let toast = document.getElementById("nightToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "nightToast";
        document.body.appendChild(toast);
    }

    toast.textContent = label;
    toast.classList.add("visible");

    clearTimeout(showNightModeToast._timer);
    showNightModeToast._timer = setTimeout(() => {
        toast.classList.remove("visible");
    }, 1600);

}


//------------------------------------------------------------
// Automatic night mode
//------------------------------------------------------------

function updateNightMode() {

    if (STATE.nightModeOverride !== null) {
        applyNightMode();
        return;
    }

    const hour = new Date().getHours();
    const night = hour >= CONFIG.nightStartHour || hour < CONFIG.nightEndHour;
    document.body.classList.toggle("night", night);

}

function applyNightMode() {

    if (STATE.nightModeOverride === null) {
        document.body.classList.remove("night");
        return;
    }

    document.body.classList.toggle("night", STATE.nightModeOverride);

}


//------------------------------------------------------------
// Long-press = open Settings
//------------------------------------------------------------

const settingsOverlay = document.getElementById("settingsOverlay");
const knownNodesEl = document.getElementById("knownNodes");
const customNodeInput = document.getElementById("customNode");

let pressTimer = null;
let suppressNextClick = false;
let pressStart = null;
let activePointerCount = 0;

const LONG_PRESS_MS = 600;
const MOVE_CANCEL_PX = 12;

document.body.addEventListener("pointerdown", (e) => {

    if (e.target.closest("#settingsOverlay"))
        return;

    activePointerCount++;

    if (activePointerCount > 1) {
        clearTimeout(pressTimer);
        pressTimer = null;
        pressStart = null;
        return;
    }

    pressStart = { x: e.clientX, y: e.clientY };

    pressTimer = setTimeout(() => {
        suppressNextClick = true;
        openSettings();
    }, LONG_PRESS_MS);

});

document.body.addEventListener("pointermove", (e) => {

    if (!pressStart)
        return;

    const dx = e.clientX - pressStart.x;
    const dy = e.clientY - pressStart.y;

    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }

});

["pointerup", "pointercancel"].forEach(evt =>
    document.body.addEventListener(evt, () => {
        activePointerCount = Math.max(0, activePointerCount - 1);
        clearTimeout(pressTimer);
        pressTimer = null;
        pressStart = null;
    })
);


function openSettings() {
    renderKnownNodes();
    settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
    settingsOverlay.classList.add("hidden");
}

document.getElementById("closeSettings").addEventListener("click", closeSettings);

settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay)
        closeSettings();
});


function renderKnownNodes() {

    const current = getSelectedNode();
    knownNodesEl.innerHTML = "";

    KNOWN_NODES.forEach(node => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "node-option" + (node.code === current ? " selected" : "");
        btn.textContent = `${node.name} — ${node.code}`;

        btn.addEventListener("click", () => {
            setSelectedNode(node.code);
            renderKnownNodes();
            dataSource.refresh?.();
        });

        knownNodesEl.appendChild(btn);
    });

}

document.getElementById("useMyLocation").addEventListener("click", () => {

    if (!("geolocation" in navigator)) {
        alert("Geolocation isn't available in this browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const nearest = nearestNode(pos.coords.latitude, pos.coords.longitude);

            if (!nearest) {
                alert("No known nodes — enter your GXP code below.");
                return;
            }

            setSelectedNode(nearest.code);
            renderKnownNodes();
            dataSource.refresh?.();
        },
        () => alert("Couldn't get location — enter your GXP code below."),
        { timeout: 10000 }
    );

});

document.getElementById("applyCustomNode").addEventListener("click", () => {

    const code = customNodeInput.value.trim();

    if (!code)
        return;

    setSelectedNode(code);
    customNodeInput.value = "";
    renderKnownNodes();
    dataSource.refresh?.();

});


//------------------------------------------------------------
// Fullscreen on first tap
//------------------------------------------------------------

function requestFullscreen() {

    if (document.fullscreenElement)
        return;

    const el = document.body;
    const request = el.requestFullscreen || el.webkitRequestFullscreen;

    if (request)
        request.call(el)?.catch?.(() => {});

}

document.body.addEventListener("click", requestFullscreen, { once: true });
