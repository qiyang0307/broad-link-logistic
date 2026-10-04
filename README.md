# Broad-link Logistics — company showcase website

Static, dependency-free showcase site for **Broad-Link Logistics Sdn Bhd** (636115-X), Johor Bahru.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static host works: GitHub Pages, Netlify, Vercel, Cloudflare Pages or cPanel `public_html` (the company's `broad-link.net` domain currently shows a hosting placeholder).

## Structure

```
index.html            page markup and content
assets/css/style.css  design system (light-blue tokens, type scale, layout)
assets/js/hero.js     hero canvas animation ("Corridor Drive" highway and route network)
assets/js/main.js     scroll interactions, corridor map, fleet carousel, quote form
assets/img/favicon.svg
```

## Motion

- **Hero:** a perspective highway on canvas with light trails, moving lane dashes and an animated SIN–JHB–KUL–PEN network. Scrolling speeds up the "drive" and lifts the horizon, and the mouse adds parallax. It has a pause button, stops when off-screen and respects `prefers-reduced-motion`.
- **Company statement:** words light up as you scroll.
- **Network:** the map stays pinned while the route draws from Singapore to Bukit Kayu Hitam, one leg at a time.
- **Fleet:** pinned horizontal scroll on desktop and a swipe carousel on mobile.
- Section reveals, counters, parallax art, filterable showcase and an infinite marquee.

## Content sources

Company details come from public listings: the Facebook pages (broadlinkjb, BroadLinkLogistics), LinkedIn, JobStreet and business directories.

- Incorporated 5 Dec 2003; "total logistics service provider who emphasizes on services & customer satisfaction"
- "One stop road transportation logistics service provider for Import & Export between Singapore" and Malaysia
- Services: freight transport by road, general cargo & bulk, chemical / DG transportation, cross-border transportation, custom forwarding, warehousing, workshop services
- HQ: Lot 1562, No. 7, Jalan Dewani, Off Jalan Tampoi, 81200 Johor Bahru
- Site: Lot 75288, Jalan Harum Utama, Taman Perindustrian Sri Plentong, 81750 Masai
- Tel 07-332 9889, Mon–Fri 8:00–17:00

**Please verify before going live:** the postcodes, the phone number, the leg distances on the map (approximate), and the network legs beyond Singapore ⇄ Johor Bahru. The quote form copies the enquiry and opens Messenger (`m.me/broadlinkjb`). To send it to an email address or WhatsApp number instead, change the submit handler in `assets/js/main.js`.
