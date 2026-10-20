---
name: chrome-cdp
description: Interact with local Chrome browser session (only on explicit user approval after being asked to inspect, debug, or interact with a page open in Chrome)
---

# Chrome CDP

Lightweight Chrome DevTools Protocol CLI. Connects directly via WebSocket — no Puppeteer, works with 100+ tabs, instant connection.

## Prerequisites

- Recommended: launch the dedicated CDP browser profile with `scripts/cdp.mjs launch [url]`
- Alternative: Chrome (or Chromium, Brave, Edge, Vivaldi) with remote debugging enabled: open `chrome://inspect/#remote-debugging` and toggle the switch
- Node.js 22+ (uses built-in WebSocket)
- If your browser's `DevToolsActivePort` is in a non-standard location, set `CDP_PORT_FILE` to its full path

### Persistent Automation Profiles

Prefer the launcher when repeated Chrome permission prompts are getting in the way:

```bash
scripts/cdp.mjs launch https://example.com
scripts/cdp.mjs list
```

For test work that may need existing logins, use the standard named profiles:

```bash
scripts/cdp.mjs launch-profile bfloat http://localhost:5173
scripts/cdp.mjs launch-profile personal http://localhost:5173
scripts/cdp.mjs launch-profile turing http://localhost:5173
scripts/cdp.mjs profiles
```

To create another persistent profile, choose a stable name using only letters, numbers, dots, underscores, or hyphens:

```bash
scripts/cdp.mjs launch-profile extra-test http://localhost:5173
```

That creates and opens `~/.cache/cdp/profiles/extra-test`. After you log in manually, agents can reuse it with:

```bash
CDP_PROFILE=extra-test scripts/cdp.mjs list
CDP_PROFILE=extra-test scripts/cdp.mjs snap <target>
```

After logging in manually once, agents can reuse those sessions:

```bash
CDP_PROFILE=bfloat scripts/cdp.mjs list
CDP_PROFILE=bfloat scripts/cdp.mjs snap <target>
CDP_PROFILE=personal scripts/cdp.mjs list
CDP_PROFILE=turing scripts/cdp.mjs list
```

This starts Chrome with:

- a persistent profile at `~/.cache/cdp/chrome-profile` by default
- named profiles under `~/.cache/cdp/profiles/<name>` when using `launch-profile` or `CDP_PROFILE`
- remote debugging enabled
- first-run/default-browser prompts disabled
- notifications disabled

Overrides:

```bash
CDP_PROFILE=bfloat scripts/cdp.mjs list
CDP_USER_DATA_DIR=/path/to/profile scripts/cdp.mjs launch
CDP_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" scripts/cdp.mjs launch
CDP_FAKE_MEDIA_UI=1 scripts/cdp.mjs launch
CDP_EXTRA_CHROME_FLAGS="--deny-permission-prompts" scripts/cdp.mjs launch
```

The persistent profile stores ordinary site permission decisions between runs.

### Real Chrome Profiles (clones)

Chrome 151+ refuses remote debugging (port AND pipe) on the default user-data
dir by design, and the live "Allow debugging" toggle is per-connection — so the
real profiles can't be driven directly without popup babysitting. `cdp real`
solves this by cloning a real profile (rsync, excluding rebuildable caches)
to `~/.cache/cdp/real-clones/<profile>/` and stealth-launching the clone:

```bash
scripts/cdp.mjs real list                # profiles + clone status
scripts/cdp.mjs real Personal            # launch clone of Profile 3 (zero prompts)
scripts/cdp.mjs real Personal https://x  # ...with a URL
scripts/cdp.mjs real sync Personal       # refresh logins/cookies from the real profile
```

The clone inherits the real profile's cookies, logins, and extensions, starts
with `--enable-automation --disable-blink-features=AutomationControlled`
(`navigator.webdriver === false`, sites see a normal trusted Chrome), and
attaches without any "Allow debugging" prompt. Clones do **not** restore the
real session's tabs (Sessions is excluded).

`sync` requires the real Chrome to be closed, and the clone is used in place —
changes made inside the clone (new logins, etc.) are lost on the next sync,
which restores the real profile's state.

Real profiles display with a `-cdp` suffix (`Personal-cdp`, `Work-cdp`, ...)
so they can't be mistaken for the normal Chrome profile picker — commands
still use the real name (`cdp real Personal`). Clone tabs are labeled
`[Personal-cdp]` in `list` output.

If the clone is already open, `cdp real <profile>` attaches to it (opening
the URL in a new tab) instead of spawning a second instance — a second launch
against the same user-data-dir races the singleton lock and can strand a
windowless browser. A stale windowless clone is detected and relaunched
automatically. Launch success requires a real window: a debug port with zero
tabs is treated as a failure, not a launch.

## Commands

All commands use `scripts/cdp.mjs`. The `<target>` is a **unique** targetId prefix from `list`; copy the full prefix shown in the `list` output (for example `6BE827FA`). The CLI rejects ambiguous prefixes.

### List open pages

```bash
scripts/cdp.mjs list
```

### Take a screenshot

```bash
scripts/cdp.mjs shot <target> [file]    # default: screenshot-<target>.png in runtime dir
```

Captures the **viewport only**. Scroll first with `eval` if you need content below the fold. Output includes the page's DPR and coordinate conversion hint (see **Coordinates** below).

### Accessibility tree snapshot

```bash
scripts/cdp.mjs snap <target>
```

### Evaluate JavaScript

```bash
scripts/cdp.mjs eval <target> <expr>
```

> **Watch out:** avoid index-based selection (`querySelectorAll(...)[i]`) across multiple `eval` calls when the DOM can change between them (e.g. after clicking Ignore, card indices shift). Collect all data in one `eval` or use stable selectors.

### Other commands

```bash
scripts/cdp.mjs html    <target> [selector]   # full page or element HTML
scripts/cdp.mjs nav     <target> <url>         # navigate and wait for load
scripts/cdp.mjs net     <target>               # resource timing entries
scripts/cdp.mjs click   <target> <selector>    # click element by CSS selector
scripts/cdp.mjs clickxy <target> <x> <y>       # click at CSS pixel coords
scripts/cdp.mjs type    <target> <text>         # Input.insertText at current focus; works in cross-origin iframes unlike eval
scripts/cdp.mjs loadall <target> <selector> [ms]  # click "load more" until gone (default 1500ms between clicks)
scripts/cdp.mjs evalraw <target> <method> [json]  # raw CDP command passthrough
scripts/cdp.mjs open    [url]                  # open new tab (each triggers Allow prompt)
scripts/cdp.mjs profiles                        # show standard named profile status
scripts/cdp.mjs launch-profile <name> [url]     # open a named persistent profile
scripts/cdp.mjs grant   <origin> [permissions] # pre-grant web permissions for an origin
scripts/cdp.mjs stop    [target]               # stop daemon(s)
```

### Permission Grants

Use `grant` before navigating to pages that request browser permissions:

```bash
scripts/cdp.mjs grant https://example.com
scripts/cdp.mjs grant https://example.com geolocation,notifications,camera,microphone,clipboard
```

The CLI maps common aliases (`camera`, `microphone`, `clipboard`) to CDP permission names. The default grant set is geolocation, notifications, clipboard read/write, clipboard sanitized write, audio capture, and video capture.

For navigation/open flows, set auto-grant once in the shell:

```bash
export CDP_AUTO_GRANT_PERMISSIONS=1
export CDP_DEFAULT_PERMISSIONS=geolocation,notifications,camera,microphone,clipboard
```

`Browser.grantPermissions` only controls page-level web permissions. It does not suppress Chrome's own "Allow debugging?" attach prompt.

## Coordinates

`shot` saves an image at native resolution: image pixels = CSS pixels × DPR. CDP Input events (`clickxy` etc.) take **CSS pixels**.

```
CSS px = screenshot image px / DPR
```

`shot` prints the DPR for the current page. Typical Retina (DPR=2): divide screenshot coords by 2.

## Tips

- Prefer `snap --compact` over `html` for page structure.
- Use `type` (not eval) to enter text in cross-origin iframes — `click`/`clickxy` to focus first, then `type`.
- Chrome may show an "Allow debugging" modal once per tab on first access when attaching to an existing manual browser session. A background daemon keeps the session alive so subsequent commands need no further approval. Daemons auto-exit after 8 hours of inactivity by default; override with `CDP_IDLE_TIMEOUT_MS`.
- To avoid most repeated prompts, use `scripts/cdp.mjs launch-profile bfloat`, `scripts/cdp.mjs launch-profile personal`, or `scripts/cdp.mjs launch-profile turing` and keep working in those dedicated profiles instead of opening fresh tabs in a manual Chrome session.
- When both named profiles are open, always set `CDP_PROFILE` on commands so the CLI connects to the intended logged-in session.
