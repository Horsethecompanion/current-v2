# Current v2 — All-In Cost Display

A fork of [Current](https://github.com/Horsethecompanion/current) that shows your **real, all-in electricity cost** instead of wholesale spot price alone.

Live at: https://horsethecompanion.github.io/current-v2/

## What's Different

**Current v1** shows wholesale spot price (what the grid cost the retailer).

**Current v2** shows **your actual all-in cost** including:
- Wholesale spot price
- PowerHub retail fee (10% of spot)
- Distribution network charge (Vector: $0.1047/kWh peak, $0.00 off-peak)
- Transmission charge ($0.0355/kWh flat)
- Electricity Authority levy ($0.0029/kWh)
- Daily fixed costs (~$0.05/half-hour amortized)

## Why It Matters

On a winter evening at 19:30:
- **v1 shows:** 444 c/kWh (spot only)
- **v2 shows:** 503 c/kWh (your actual cost)

That extra ~60 c/kWh is real money—10% retail margin, distribution peak surcharge, and fixed costs.

Over a month, the floor cost is ~4–5 c/kWh (off-peak) vs ~15 c/kWh (peak), even when spot is zero. **This is why load-shifting matters.**

## Seasonal Peak Windows (Vector)

Current v2 automatically detects the season and applies Vector's peak rates:

- **June–August (Winter):** Peak 07:00–11:00 only
- **September–May (Other months):** Peak 17:00–22:00 (5pm–10pm)
- **Off-peak:** All other hours at $0.00/kWh distribution

Watch the heatmap change as the season transitions—morning peaks in winter, evening peaks the rest of the year.

## Display Layout

**Big bold number:** All-in cost (4.5rem, like Current v1)  
**Small label below:** Wholesale spot price for reference

The heatmap uses the same colour scale as v1, so yellow appears around 15–20 c/kWh all-in (when you really want to shift load).

## Updating Rates (Quarterly)

Your PowerHub invoice changes quarterly. To update v2:

1. Open your latest invoice
2. Find these line items and their rates:
   - "Distribution Network Charges — Peak"
   - "Distribution Network Charges — Off-peak"
   - "Transmission (Transpower)"
   - "Electricity Authority Levy"
   - Sum of "Distribution Daily Fixed" + "Metering" + "Billing"

3. Edit `js/config.js`:
   ```javascript
   tariff: {
       distribution: {
           peak: X.XX,        // c/kWh from invoice
           offpeak: 0.00
       },
       transmission: Y.YY,    // c/kWh from invoice
       eaLevy: Z.ZZ,         // c/kWh from invoice
       dailyFixedPerHalfHour: (TOTAL_DAILY_FIXED) / 31 / 48
   }
   ```

4. Commit and push:
   ```bash
   git add js/config.js
   git commit -m "Update tariff rates — new invoice"
   git push origin main
   ```

Pages rebuilds automatically.

## Configuration

All settings in `js/config.js`. Key config:

```javascript
tariff: {
    peakHours: {
        winterMonths: [5, 6, 7],        // June, July, August
        winterPeakStart: 7,             // 7am
        winterPeakEnd: 11,              // 11am
        otherPeakStart: 17,             // 5pm (Sept-May)
        otherPeakEnd: 22                // 10pm
    },
    distribution: { peak: 10.47, offpeak: 0.00 },
    transmission: 3.55,
    eaLevy: 0.29,
    powerhubFee: 10,    // % of spot
    dailyFixedPerHalfHour: 0.050
}
```

## If Your Network Is Different

Peak/off-peak hours, transmission rate, and distribution charges vary by network. To adapt v2 for a different GXP:

1. Update the `tariff` config in `js/config.js` with your network's rates
2. Update `peakHours` with your network's peak/off-peak split
3. Change `gxpNode` in config to your GXP code
4. Verify the calculation by comparing one month of v2 prices to your invoice

## Known Limitations

1. **Rounding:** Your invoice may differ by $0.01–0.02/month due to rounding
2. **Controlled loads:** If you have ripple-controlled circuits on separate tariffs, v2 treats all usage the same
3. **Export (solar):** No support yet; would need to reverse the calculation for export periods
4. **Seasonal split complexity:** Some networks have more than two peak windows (shoulder rates, etc.). Would need additional logic

## Testing

Open in a browser and:
- **Green dot** (bottom right) = connected to WITS data ✓
- **All-in number** = big and bold (4.5rem)
- **Wholesale number** = tiny below (1.2rem)
- **Heatmap** = shows colours matching v1 scale
- **Seasonal transition:** In June/July at 8am, price should spike (winter peak). In December at 8am, should be cheap (off-peak).

## Files

- `js/config.js` — Tariff rates (update quarterly)
- `js/app.js` — All-in cost calculation + animation
- `index.html` — Dual-price layout
- `css/style-v2.css` — Styling for all-in-first display
- `js/livedata.js`, `js/renderer.js`, etc. — Inherited from Current v1 (unchanged)

## Data Source

Fetches live WITS prices from Cloudflare worker (`current-prices.workers.dev`). Same backend as Current v1.

## License

Same as Current v1. See the original [Current repo](https://github.com/Horsethecompanion/current) for licensing.

## Authors

- **Current v1:** Tim Barlow ([@Horsethecompanion](https://github.com/Horsethecompanion))
- **Current v2 (All-In Cost):** Generated with Claude (Anthropic)

---

Questions? Check the implementation guide or file an issue.
