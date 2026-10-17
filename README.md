# Broad-link Logistics — company showcase website

Static, dependency-free showcase site for **Broad-Link Logistics Sdn Bhd** (636115-X), Johor Bahru.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to Vercel

The site is ready for Vercel as-is. There is no build step, and `vercel.json` sets clean URLs, asset caching and security headers.

- **From GitHub:** in Vercel choose *Add New → Project*, import this repo, set Framework Preset to **Other**, leave the Build Command and Output Directory empty, then Deploy. Private repos work.
- **CLI:** run `npx vercel --prod` in the repo folder.
- **Without Git:** run `zip -r broad-link-logistics-site.zip index.html vercel.json assets`, unzip it into a folder, and run `npx vercel --prod` inside that folder.

To use the company domain (`broad-link.net`), add it under *Project → Settings → Domains* and follow the DNS instructions there.

## Structure

```
index.html            page markup and content
assets/css/style.css  design system (light-blue tokens, type scale, layout)
assets/js/hero.js     hero canvas animation ("Corridor Drive" highway and route network)
assets/js/main.js     scroll interactions, corridor map, fleet carousel, quote form
assets/img/logo.png    official company logo (used unmodified)
vercel.json           Vercel static hosting config
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

## Minum Air (water habit app)

`minum-air/` is a separate, standalone PWA with its own Vercel project (`minum-air` on Vercel, root directory `minum-air/`), separate from the company site's project. Deploy the `minum-air/` folder on its own: `cd minum-air && npx vercel --prod`. Run it locally with `cd minum-air && python3 -m http.server 8000`. **Bos Meow**, a cool cat in a backwards cap and pixel shades, fills up with water as you drink. It is inspired by the Waterllama flow and given a Malaysian twist (BM/Manglish copy, mamak drinks, local cities, Jalur Gemilang confetti).

- **Onboarding:** splash, welcome, name, gender, weight, activity, city, wake/sleep times, an animated "calculating" step, the goal with its breakdown, and a reminder opt-in. There's also a "Tengok demo dulu" shortcut.
- **Goal:** weight × 33 ml (× 0.92 for women), plus activity (+0/+350/+700 ml), rounded to 50 ml. On hot days it adds +250 ml once the feels-like max reaches 32 °C and another +250 ml for every 2 °C above that (up to +1250 ml). Weather comes from [Open-Meteo](https://open-meteo.com/) (free, no key).
- **Home:** the cat fills to today's percentage, with a one-tap water button and mamak drinks (Teh Tarik, Kopi O, Milo Ais, Sirap Bandung…). Each drink counts at its own hydration rate and you pick a size from 150 ml up to "Jumbo mamak" 600 ml. Also a streak, today's log, a 7-day history and an editable profile.
- **Motion:** all drawn in code. The cat is SVG with CSS keyframes (waves, bubbles, blinking ears, tail, a shades drop and hops), water droplets fly in through the Web Animations API, and confetti runs on a canvas. `prefers-reduced-motion` is respected.
- **Languages:** English (default), Bahasa Melayu and 中文, switchable on the welcome screen or in Profile. Strings live in `i18n.js`.
- **Data:** stays in the browser's `localStorage`. There is no login or server. Reminders work only while the app is open (or in a background tab), so true background reminders need a native wrapper or a push server.

```
minum-air/index.html            page shell
minum-air/styles.css            design tokens, screens and all animations
minum-air/cat.js                Bos Meow SVG mascot (water level + moods)
minum-air/i18n.js               UI strings (en, ms, zh)
minum-air/app.js                onboarding, home, history, profile, effects
minum-air/sw.js                 offline cache service worker
minum-air/manifest.webmanifest  install metadata
minum-air/icon.svg              app icon
minum-air/vercel.json           headers for the standalone deployment
```
