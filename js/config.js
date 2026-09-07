// Current v2 - All-In Cost Configuration
// Customized for: ICP 0000205133UN322 (Wairau Road GXP, Vector network, Auckland)
// Last updated: September 2026

const CONFIG = {

    // Timeline
    defaultTimelineHours: 4,
    zoomedTimelineHours: 24,
    zoomLerpSpeed: 4,

    // Refresh
    refreshIntervalSeconds: 60,

    // Night mode
    autoNightMode: true,
    nightStartHour: 22,
    nightEndHour: 6,

    // Animation
    animationFPS: 60,
    transitionDuration: 600,

    // Time division marks
    timeMarks: {
        minorHeight: 8,
        majorHeight: 14,
        minorColour: "rgba(255,255,255,.22)",
        majorColour: "rgba(255,255,255,.45)",
        majorEveryHours: 6
    },

    // Price display - now shows both spot and all-in
    units: "c/kWh",
    decimals: 1,

    // Data source
    useMockData: false,
    workerUrl: "https://current-prices.current-prices.workers.dev",
    gxpNode: "WRD0331", // Wairau Road GXP
    dataRefreshSeconds: 60,

    // Mock / synthetic timeline shape
    historyHours: 24,
    forecastHours: 24,
    intervalMinutes: 30,

    //================================================================
    // TARIFF STRUCTURE - UPDATE QUARTERLY
    //================================================================
    // All per-kWh rates from PowerHub invoice dated 4 Sep 2026
    // Distribution charges are Vector (UNET) network specific
    //================================================================

    tariff: {
        
        // Peak/off-peak split — Vector seasonal rates
        // June–August (winter): Peak 07:00–11:00 only
        // September–May: Peak 17:00–22:00 (5pm–10pm)
        // Off-peak: all other hours
        peakHours: {
            winterMonths: [5, 6, 7],        // June, July, August (0-indexed: 5, 6, 7)
            winterPeakStart: 7,             // 7am
            winterPeakEnd: 11,              // 11am (exclusive, so 7-10:59)
            otherPeakStart: 17,             // 5pm
            otherPeakEnd: 22                // 10pm (exclusive, so 5pm-9:59pm)
        },
        
        // Per-kWh charges (cents)
        distribution: {
            peak: 10.47,      // $0.1047/kWh during peak hours
            offpeak: 0.00     // $0.0000/kWh during off-peak hours
        },
        
        transmission: 3.55,   // $0.0355/kWh (flat)
        eaLevy: 0.29,        // $0.0029/kWh (flat)
        powerhubFee: 10,     // 10% of wholesale spot price (applied as multiplier)
        
        // Daily fixed costs (spread across 48 half-hour periods = ÷ 48 per period)
        // Distribution daily: $59.58 ÷ 31 days ÷ 48 periods = $0.040 per HH
        // Metering daily: $10.55 ÷ 31 days ÷ 48 periods = $0.007 per HH
        // Billing daily: $5.00 ÷ 31 days ÷ 48 periods = $0.003 per HH
        dailyFixedPerHalfHour: (59.58 + 10.55 + 5.00) / 31 / 48  // ~0.050 c/period
    },

    // Colour scale - same as v1, but scaled for higher all-in costs
    // All-in costs will typically be 2-3x spot price
    priceScale: {
        linearMax: 80,      // c/kWh - top of normal range for all-in cost
        spikeMax: 3000,     // c/kWh - peak all-in during scarcity events
        linearFraction: 0.7
    },

    colourStops: [
        { value: 0,    colour: "#156b37" },
        { value: 15,   colour: "#2f9f4b" },
        { value: 30,   colour: "#89c541" },
        { value: 45,   colour: "#d6c73a" },
        { value: 60,   colour: "#d9b530" },
        { value: 90,   colour: "#d77b2a" },
        { value: 135,  colour: "#cf4c2e" },
        { value: 240,  colour: "#7d1f1f" },
        { value: 750,  colour: "#5c1420" },
        { value: 3000, colour: "#200308" }
    ]

};

const STATE = {
    timelineHours: CONFIG.defaultTimelineHours,
    displayedTimelineHours: CONFIG.defaultTimelineHours,
    nightModeOverride: null,
    lastUpdate: null,
    connected: true,
    currentPrice: 0,
    currentAllInPrice: 0,
    currentIndex: 0,
    dataset: []
};
