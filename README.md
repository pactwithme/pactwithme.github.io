# Pact website

Landing page for **Pact**: pick one spending habit to break, do it with friends, and whoever misses a day takes the dare the crew picks.

**Live site:** https://pactwithme.github.io/

It's a plain static site (HTML, CSS and JavaScript). There's no build step: every push to `main` goes live on GitHub Pages within a minute or two.

## What's in the repo

```
index.html                  Home page: receipt hero, product demo video, dare wall,
                            drag-to-compare privacy view, savings goals, sign-up
prototype.html              "Try it" page; embeds the clickable demo in prototype/app/
survey.html                 "Get early access" sign-up page
assets/style.css            Shared styles and color/type tokens for all pages
assets/site.js              Nav shadow on scroll, footer year
assets/home.js              Home page motion (demo video player, word reveal, compare handle, goal bars)
assets/video/               Demo video (1080p and 720p for phones) and its poster frame
assets/config.js            URL of the Google Apps Script that stores sign-ups
assets/signup.js            Early-access form logic used on every page
prototype/app/              Compiled demo app (React bundle; edit the original source, not this)
google-apps-script/Code.gs  Sign-up endpoint that writes to the Google Sheet
```

## Early-access sign-ups

Every sign-up form posts to a Google Apps Script web app, which adds one row to the **Signups** tab of the team's Google Sheet ("Pact sign-ups"):

| Time | Email | Source | Page |
|---|---|---|---|

- The same email is only stored once.
- Basic filtering runs before anything is stored:
  - a hidden honeypot field, and a minimum of 1.5 s on the page before submitting
  - stricter address checks, with a "did you mean …@gmail.com?" reply for common typos
  - throwaway/disposable domains are refused, and the domain must accept mail (MX lookup via Google Public DNS)
  - a site-wide cap of 8 sign-ups per minute and 30 per 10 minutes
- Refused attempts are not stored; see them under **Apps Script → Executions** (logged as "Rejected sign-up").
- To tune it, edit the constants and lists at the top of `google-apps-script/Code.gs`, then redeploy (below).
- Add `?src=<channel>` to any link you share (for example `?src=instagram`) and it shows up in the **Source** column.

The endpoint URL lives in `assets/config.js`. If it's left empty, the forms show "Sign-ups aren't switched on yet" instead of failing silently.

### Changing the sign-up script

1. Open the sheet, then **Extensions → Apps Script**.
2. Edit the code (keep `google-apps-script/Code.gs` in this repo in sync).
3. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.**
   Editing the existing deployment keeps the same URL. Choosing **New deployment** creates a new URL, which then has to go into `assets/config.js`.

### Setting it up from scratch

1. Create a Google Sheet, then **Extensions → Apps Script**, and paste in `google-apps-script/Code.gs`.
2. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*.
3. Approve the permissions prompt. Google shows "unverified app" for your own scripts; choose **Advanced → Go to … (unsafe)**.
4. Copy the URL ending in `/exec` into `assets/config.js`.
5. Opening that URL in a browser should show `{"ok":true,"service":"pact-signup"}`.

## Making changes

- **Preview locally:** run `python3 -m http.server 8000` in this folder and open http://localhost:8000.
- **Cache busting:** browsers cache CSS and JS for about 10 minutes. When you change a file in `assets/`, bump the `?v=` number where it's linked in the HTML pages so visitors get the new version straight away.
- **Motion:** visitors who turn on "reduce motion" in their system settings get a static version: the demo video waits for a click instead of autoplaying.
- **Demo video:** to replace it, export a new MP4 and overwrite `assets/video/pact-demo.mp4` (1080p) and `pact-demo-720.mp4` (phones). Chapter times are the `data-t` values in `index.html`.

## Custom domain

The site is served by GitHub Pages from the `main` branch. To use your own domain, add a `CNAME` file containing the domain, point DNS at GitHub Pages, then turn on **Enforce HTTPS** under **Settings → Pages**.
