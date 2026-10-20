# Apex Holdings Limited: official website

Static website built with plain **HTML, CSS and JavaScript**. A small, dependency-free
Node script assembles the source files into a fully rendered `dist/` folder that can be
uploaded to any static host. All page content is in the HTML the server sends, so search
engines index it without running JavaScript.

## Requirements

- Node.js 18 or newer (only for building; the live site needs nothing but a web server)
- No `npm install` needed: there are no dependencies

## Commands

| Command          | What it does                                                       |
| ---------------- | ------------------------------------------------------------------ |
| `npm run dev`    | Build, serve on http://localhost:8080, rebuild + reload on changes |
| `npm run build`  | Produce the production site in `dist/`                             |

The dev server prints a **Local** and a **Network** address (e.g. `http://192.168.1.25:8080`).
Open the Network address on a phone or another computer on the same Wi-Fi/LAN to test.

- Different port: `npm run dev -- --port 3000`
- This computer only: `npm run dev -- --host 127.0.0.1`
- If other devices can't connect, allow Node.js through Windows Defender Firewall (private networks).

The dev server is for development only. On the live server, upload `dist/` (see Deployment).

## Project structure

```
apex-holdings-website/
├── site.config.json            Site-wide SEO settings: domain, name, social image
├── package.json
├── scripts/
│   ├── build.mjs               Static build (data, includes, SEO files, cache-busting, link check)
│   ├── dev.mjs                 Local dev server with live reload
│   └── lib/template.mjs        Template engine: values, loops, conditions, filters
├── src/
│   ├── data/                   ALL site content: lists, cards, links, copy (see below)
│   │   ├── companies.json        The 12 group companies (single source of name, URL, abbreviation)
│   │   ├── hero.json             Hero slides + disabled marquee
│   │   ├── navigation.json       Logo + menu links (header and footer)
│   │   ├── strengths.json        KPI strip numbers
│   │   ├── about.json            About copy + journey milestones
│   │   ├── businesses.json       Divisions, company cards, portfolio mix
│   │   ├── sustainability.json   Pillars (flip cards) + efficiency benefits
│   │   ├── certifications.json   Certification logos and links
│   │   └── contact.json          Email, phone, address, footer text
│   ├── pages/                  One file per page (URL = file path)
│   │   ├── index.html          Home page: <head> + section includes
│   │   ├── businesses/index.html     Our Businesses page → /businesses/
│   │   ├── sustainability/index.html Sustainability page → /sustainability/
│   │   └── 404.html            Not-found page
│   ├── partials/
│   │   ├── head/
│   │   │   ├── meta.html             Title, description, canonical, Open Graph, Twitter, icons
│   │   │   ├── assets.html           Preload, fonts, stylesheet
│   │   │   └── structured-data.html  JSON-LD (Organization + WebSite + group companies)
│   │   ├── components/
│   │   │   ├── site-nav.html     Header navigation (home and inner pages)
│   │   │   ├── nav-link.html     One menu link, marks the current page
│   │   │   └── page-cta.html     Call-to-action band used on inner pages
│   │   ├── icons/              SVG icons used with the `icon` filter
│   │   └── sections/           Home page section templates, in page order
│   │       ├── hero.html             Navigation + company slider
│   │       ├── strengths.html        KPI strip
│   │       ├── about.html            About us + journey timeline
│   │       ├── businesses.html       Division tabs + portfolio
│   │       ├── sustainability.html
│   │       ├── certifications.html
│   │       └── footer.html           Contact + footer
│   ├── assets/
│   │   ├── css/modules/        Stylesheet split by area; joined in filename order
│   │   │   ├── 00-base.css           → dist/assets/css/style.css
│   │   │   ├── 01-hero-slider.css
│   │   │   ├── ...
│   │   │   ├── 10-error-page.css
│   │   │   ├── 11-pages-common.css       Shared inner-page styles ("pg-" classes)
│   │   │   ├── 12-businesses-page.css    Our Businesses ("bz-" classes)
│   │   │   ├── 13-sustainability-page.css Sustainability ("su-" classes)
│   │   │   └── 14-home-sections.css       Home About + Divisions redesign ("hm-" classes)
│   │   ├── js/main.js          Hero slider, nav drawer, business tabs, count-up
│   │   ├── js/pages.js         Scroll reveal, counters, parallax, group map, donut, tabs, loop,
│   │   │                       plus the home division explorer and journey timeline
│   │   └── images/             bg/, certs/, photos/, logos
│   └── public/                 Copied as-is to the site root
│       ├── .htaccess           Apache/cPanel: 404 page, caching, compression, security headers
│       └── _headers            Netlify / Cloudflare Pages: caching + security headers
└── dist/                       Build output (git-ignored). Upload this folder.
```

## Editing content (data files)

All lists and repeated content live in `src/data/*.json`. Templates in
`src/partials/sections/` only hold markup and loop over that data, and the build writes
the result into plain HTML, so search engines see all content without JavaScript.

| To change…                                   | Edit                                         |
| -------------------------------------------- | -------------------------------------------- |
| A company's name, short name, URL, abbreviation | `companies.json` (updates slider, cards, portfolio chips, JSON-LD) |
| Hero slides (text, stats, highlights, order) | `hero.json` → `slides`                       |
| Menu links (header + footer)                 | `navigation.json` (`"hideInFooter": true` hides a link in the footer) |
| KPI strip                                    | `strengths.json`                             |
| About text, key facts, visual badges, journey milestones | `about.json` (home About section)  |
| Home division explorer, portfolio mix        | `businesses.json` (`intro`, `explorer`, `divisions`) |
| Sustainability pillars and benefits          | `sustainability.json`                        |
| Certification logos                          | `certifications.json`                        |
| Contact details, footer text                 | `contact.json` (also used in JSON-LD)        |
| Home video gallery                           | `gallery.json` → `videos` (YouTube ID, title, category, colour, description) |
| Company photo, "since" year, highlights, key figures | `companies.json` (used on the home slider and the Our Businesses page) |
| Division intro, tagline, colour, photo       | `businesses.json` → `divisions`              |
| Our Businesses page copy                     | `businessesPage.json`                        |
| Sustainability page content                  | `sustainabilityPage.json`                    |

Order in the JSON = order on the page. Numbers such as "01 / 13", card numbers,
division counts ("Textile · 5"), the portfolio total and left/right timeline sides are
calculated from the lists, so adding or removing an item keeps them correct.

**Reusing company details.** Entries in `hero.json` and `businesses.json` start with
`"extends": "@companies.afl"`. The build copies that company's fields into the entry, and
fields written in the entry itself take priority (e.g. ABBL's card keeps the shorter
"…Ltd" title).

**Style keys.** Some entries carry class modifiers that pick existing CSS variants, e.g.
`"theme": "agro"` → `strength-card--agro`, or in hero slides
`"style": { "badge": "agro", "image": "agriscience", "icon": "#4CC38A" }`. Leave a key
out to use the default class. Only use values that already exist in the CSS.

**Menu links.** `navigation.json` links with `"page": "businesses"` point to an inner page and
are highlighted when that page is open. Links such as `#about` point to the home page and are
prefixed automatically on inner pages (`../#about`); `"local": true` keeps a link on the current
page (used for Contact, since every page has the contact footer).

**Add a company:** add it to `companies.json`, add an entry under its division in
`businesses.json`, and (optionally) a slide in `hero.json`. A slide needs a background
image class in the CSS: reuse an existing one or ask a developer to add one.

The build stops with a clear message if a JSON file is invalid, a template uses a value
that does not exist, or a company is filed under the wrong division.

## How pages work

Every page in `src/pages/` starts with a JSON block that sets its SEO data:

```html
<!--@page
{
  "title": "Page title | Apex Holdings Limited",
  "description": "150–160 character summary shown in search results.",
  "path": "/about/",
  "changefreq": "monthly",
  "priority": "0.8"
}
-->
```

Optional keys: `robots` (default `index, follow`), `ogImage` (path, defaults to
`site.config.json` → `ogImage`), `preloadImage`, `sitemap: false` to leave a page out
of the sitemap, `lastmod` (YYYY-MM-DD).

- `<!-- @include sections/hero.html -->` (on its own line) inserts a file from `src/partials/`.
- `{{site.name}}`, `{{page.title}}`, `{{data.about.title}}` insert a value (HTML-escaped).
- `{{#each data.about.journey.milestones as item}} … {{/each}}` repeats markup for each item.
  Inside a loop: `@index` (0-based), `@number` (1-based), `@total`, `@first`, `@last`, `@even`, `@odd`.
- `{{#if value}} … {{else}} … {{/if}}` and `{{#unless value}} … {{/unless}}` show markup conditionally.
- Filters: `pad2` (7 → 07), `number` (22000 → 22,000), `mod` ("agro" → `--agro`, empty → nothing),
  `count`, `reverse`, `repeat:2`, `lines` (array → lines joined with `<br />`), `icon` (inline SVG
  from `partials/icons/`), `default:"text"`, `json`, `raw`.
- `{{page.root}}` gives the relative path back to the site root, for pages in subfolders.

**Add a page:** create `src/pages/about/index.html` → served at `/about/`. It is added to
`sitemap.xml` automatically.

## What the build does

1. Loads `src/data/*.json`, resolves `extends` references and calculates counts
2. Resolves includes, loops and values for every page
3. Joins `css/modules/*.css` into one `style.css`
4. Adds `?v=<hash>` to `style.css` and `main.js` so browsers fetch new versions after each release
5. Generates `sitemap.xml`, `robots.txt` and `site.webmanifest` from `site.config.json`
6. Fails if any local `src`, `href` or CSS `url()` points to a file that does not exist

## SEO checklist

Built in:

- Pre-rendered HTML (no client-side section loading)
- Unique title + meta description per page, canonical URL, robots meta
- Open Graph + Twitter card tags for link previews
- JSON-LD structured data: Organization (address, contact, the 12 group companies) and WebSite
- `sitemap.xml`, `robots.txt`, web manifest, theme color, touch icon
- LCP hero image preloaded with `fetchpriority="high"`
- Long-term caching for CSS/JS, compression and security headers (`.htaccess` / `_headers`)

Before go-live:

- [ ] Set the final domain in `site.config.json` → `url` (used for canonical, sitemap, OG tags)
- [ ] Enable the HTTPS and www/non-www redirect lines in `src/public/.htaccess` (Apache hosts)
- [ ] Submit `https://<domain>/sitemap.xml` in Google Search Console and Bing Webmaster Tools
- [ ] Create a 1200×630 social sharing image and point `ogImage` to it
- [ ] Compress large photos (see below); this is the biggest page-speed gain available

## Deployment

Run `npm run build`, then publish the `dist/` folder.

- **cPanel / Apache:** upload the *contents* of `dist/` (including the hidden `.htaccess`) to `public_html/`.
- **Netlify:** build command `npm run build`, publish directory `dist`.
- **Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **Vercel:** framework "Other", build command `npm run build`, output directory `dist`.
- **GitHub Pages:** publish `dist/` (e.g. with the `actions/upload-pages-artifact` action).

## Known follow-ups (not changed yet, by design)

- The home About and Divisions sections were redesigned with new `hm-` styles. The old rules for
  those sections (`about-*`, `tl-*` / `journey-*`, `division-tabs`, `business-*`, `mix-*` in
  modules 02, 03, 04, 07 and 09) are no longer used and can be removed in a clean-up pass.

- The inner pages use the company photos already in `src/assets/images/photos/`. The original
  images on apexholdings.com could not be downloaded from the build environment. To use them, save
  them into `src/assets/images/` and point the `image` fields in `companies.json`,
  `businesses.json` (divisions) and the page JSON files at them. Useful originals:
  `img/companies/*.jpg` (one per company), `img/banner/sustainability_collage.jpg`,
  `img/csr/*_big.jpg`, `img/slider/*_collage.jpg`.
- With inner pages, links use clean URLs (`businesses/`), so preview with `npm run dev` or a web
  server; opening `dist/index.html` directly from disk will not follow those links.

- Several photos are very large and slow the page down: `images/bg/ahl.jpg` (17 MB),
  `photos/aydl.jpg` (16 MB), `photos/abbl.jpg` (8 MB), `photos/aal.jpg` (2.8 MB),
  `photos/acfl.jpg` (2.1 MB). Resize to ≤2400 px wide and export as WebP/AVIF at ~200–400 KB.
- The hidden `<h1>` says "ten sister concerns" while the page states 12 group companies
  (`hero.json` → `srTitle`).
