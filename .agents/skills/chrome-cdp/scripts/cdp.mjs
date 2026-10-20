#!/usr/bin/env node
// cdp - lightweight Chrome DevTools Protocol CLI
// Uses raw CDP over WebSocket, no Puppeteer dependency.
// Requires Node 22+ (built-in WebSocket).
//
// Per-tab persistent daemon: page commands go through a daemon that holds
// the CDP session open. Chrome's "Allow debugging" modal fires once per
// daemon (= once per tab). Daemons auto-exit after 20min idle.

import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, readdirSync, rmSync, lstatSync } from 'fs';
import { homedir } from 'os';
import { basename, resolve } from 'path';
import { spawn } from 'child_process';
import net from 'net';

const TIMEOUT = 15000;
const NAVIGATION_TIMEOUT = 30000;
const IDLE_TIMEOUT = Number.parseInt(process.env.CDP_IDLE_TIMEOUT_MS || '', 10) || 8 * 60 * 60 * 1000;
const DAEMON_CONNECT_RETRIES = 20;
const DAEMON_CONNECT_DELAY = 300;
const MIN_TARGET_PREFIX_LEN = 8;
const IS_WINDOWS = process.platform === 'win32';
if (!IS_WINDOWS) process.umask(0o077);
const CACHE_DIR = process.env.CDP_CACHE_DIR
  ? resolve(process.env.CDP_CACHE_DIR)
  : resolve(homedir(), '.cache', 'cdp');
const RUNTIME_DIR = IS_WINDOWS
  ? resolve(process.env.LOCALAPPDATA || resolve(homedir(), 'AppData', 'Local'), 'cdp')
  : process.env.XDG_RUNTIME_DIR
    ? resolve(process.env.XDG_RUNTIME_DIR, 'cdp')
    : CACHE_DIR;
const PROFILE_NAME = process.env.CDP_PROFILE || '';
if (PROFILE_NAME && !isValidProfileName(PROFILE_NAME)) {
  console.error(`Invalid CDP_PROFILE "${PROFILE_NAME}". Use only letters, numbers, dots, underscores, or hyphens.`);
  process.exit(1);
}
const PROFILE_USER_DATA_DIR = process.env.CDP_USER_DATA_DIR
  ? resolve(process.env.CDP_USER_DATA_DIR)
  : PROFILE_NAME
    ? resolve(CACHE_DIR, 'profiles', PROFILE_NAME)
    : '';
try { mkdirSync(RUNTIME_DIR, { recursive: true, mode: 0o700 }); } catch {}
try { mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 }); } catch {}
const PAGES_CACHE = PROFILE_NAME
  ? resolve(CACHE_DIR, `pages-${PROFILE_NAME}.json`)
  : resolve(RUNTIME_DIR, 'pages.json');

function sockPath(targetId) {
  return IS_WINDOWS
    ? `\\\\.\\pipe\\cdp-${targetId}`
    : resolve(RUNTIME_DIR, `cdp-${targetId}.sock`);
}

async function getWsUrl() {
  const home = homedir();
  // macOS: ~/Library/Application Support/<name>/DevToolsActivePort
  const macBrowsers = [
    'Google/Chrome', 'Google/Chrome Beta', 'Google/Chrome for Testing',
    'Chromium', 'BraveSoftware/Brave-Browser', 'Microsoft Edge',
  ];
  // Linux: ~/.config/<name>/DevToolsActivePort
  const linuxBrowsers = [
    'google-chrome', 'google-chrome-beta', 'chromium',
    'vivaldi', 'vivaldi-snapshot',
    'BraveSoftware/Brave-Browser', 'microsoft-edge',
  ];
  // Linux Flatpak: ~/.var/app/<app-id>/config/<name>/DevToolsActivePort
  const flatpakBrowsers = [
    ['org.chromium.Chromium', 'chromium'],
    ['com.google.Chrome', 'google-chrome'],
    ['com.brave.Browser', 'BraveSoftware/Brave-Browser'],
    ['com.microsoft.Edge', 'microsoft-edge'],
    ['com.vivaldi.Vivaldi', 'vivaldi'],
  ];
  const candidates = PROFILE_USER_DATA_DIR
    ? [
        process.env.CDP_PORT_FILE,
        resolve(PROFILE_USER_DATA_DIR, 'DevToolsActivePort'),
      ].filter(Boolean)
    : [
        process.env.CDP_PORT_FILE,
        resolve(CACHE_DIR, 'chrome-profile', 'DevToolsActivePort'),
        // Clones of real Chrome profiles ("cdp real <name>" launches these)
        ...realClonePortFiles(),
        ...macBrowsers.flatMap(b => [
          resolve(home, 'Library/Application Support', b, 'DevToolsActivePort'),
          resolve(home, 'Library/Application Support', b, 'Default/DevToolsActivePort'),
        ]),
        ...linuxBrowsers.flatMap(b => [
          resolve(home, '.config', b, 'DevToolsActivePort'),
          resolve(home, '.config', b, 'Default/DevToolsActivePort'),
        ]),
        ...flatpakBrowsers.flatMap(([appId, name]) => [
          resolve(home, '.var/app', appId, 'config', name, 'DevToolsActivePort'),
          resolve(home, '.var/app', appId, 'config', name, 'Default/DevToolsActivePort'),
        ]),
        // Windows: %LOCALAPPDATA%/<name>/User Data/DevToolsActivePort
        ...(IS_WINDOWS ? ['Google/Chrome', 'BraveSoftware/Brave-Browser', 'Microsoft/Edge'].flatMap(b => {
          const base = process.env.LOCALAPPDATA || resolve(home, 'AppData/Local');
          return [
            resolve(base, b, 'User Data/DevToolsActivePort'),
            resolve(base, b, 'User Data/Default/DevToolsActivePort'),
          ];
        }) : []),
      ].filter(Boolean);
  const existing = candidates.filter(p => existsSync(p));
  if (existing.length === 0) {
    const hint = PROFILE_NAME
      ? ` Launch it with: ${process.argv[1]} launch-profile ${PROFILE_NAME}`
      : ' Enable remote debugging at chrome://inspect/#remote-debugging or run "cdp launch".';
    throw new Error(`No DevToolsActivePort found.${hint}`);
  }
  const host = process.env.CDP_HOST || '127.0.0.1';
  for (const portFile of existing) {
    const lines = readFileSync(portFile, 'utf8').trim().split('\n');
    const port = Number.parseInt(lines[0], 10);
    if (port && lines[1] && await canConnectPort(port)) {
      return `ws://${host}:${port}${lines[1]}`;
    }
  }
  throw new Error(
    'DevToolsActivePort file(s) found, but nothing is listening on those ports:\n' +
    existing.map(f => `  ${f}`).join('\n') +
    '\nChrome likely closed or restarted without remote debugging. Re-enable it at ' +
    'chrome://inspect/#remote-debugging, or quit Chrome and relaunch with "cdp real <profile>".'
  );
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function isValidProfileName(name) {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

function profileDir(name) {
  return resolve(CACHE_DIR, 'profiles', name);
}

function selectedUserDataDir() {
  return PROFILE_USER_DATA_DIR || resolve(CACHE_DIR, 'chrome-profile');
}

function findChromeExecutable() {
  const candidates = [
    process.env.CDP_CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/brave-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ].filter(Boolean);
  const found = candidates.find(path => existsSync(path));
  if (!found) throw new Error('Chrome executable not found. Set CDP_CHROME_PATH to your browser binary.');
  return found;
}

function devToolsPortFile(userDataDir) {
  return resolve(userDataDir, 'DevToolsActivePort');
}

function readDevToolsPort(userDataDir) {
  const file = devToolsPortFile(userDataDir);
  if (!existsSync(file)) return null;
  const [port] = readFileSync(file, 'utf8').trim().split('\n');
  return Number.parseInt(port, 10) || null;
}

function canConnectPort(port, host = process.env.CDP_HOST || '127.0.0.1', timeoutMs = 400) {
  return new Promise(resolve => {
    const socket = net.connect({ port, host });
    let settled = false;
    const done = result => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => done(true));
    socket.on('timeout', () => done(false));
    socket.on('error', () => done(false));
  });
}

async function isProfileOpen(userDataDir) {
  const port = readDevToolsPort(userDataDir);
  return port ? await canConnectPort(port) : false;
}

// A debug port can be up while Chrome has no window (zombie from a launch
// race) — the real success criterion is a page target.
async function hasPageTargets(userDataDir) {
  try {
    const file = devToolsPortFile(userDataDir);
    if (!existsSync(file)) return false;
    const [port, path] = readFileSync(file, 'utf8').trim().split('\n');
    if (!port || !path) return false;
    const cdp = new CDP();
    await cdp.connect(`ws://127.0.0.1:${port}${path}`);
    const { targetInfos } = await cdp.send('Target.getTargets', {});
    cdp.close();
    return (targetInfos || []).some(t => t.type === 'page');
  } catch { return false; }
}

function splitExtraFlags(value) {
  if (!value) return [];
  return value.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(part =>
    part.replace(/^(['"])(.*)\1$/, '$2')
  ) || [];
}

async function launchProfile(name, url = 'about:blank') {
  if (!isValidProfileName(name)) {
    throw new Error(`Invalid profile name "${name}". Use only letters, numbers, dots, underscores, or hyphens.`);
  }
  return launchWithUserDataDir(profileDir(name), url, name);
}

async function launchWithUserDataDir(userDataDir, url = 'about:blank', label = 'default', profileDirectory = '', deadlineMs = 15000) {
  mkdirSync(userDataDir, { recursive: true, mode: 0o700 });
  if (!(await isProfileOpen(userDataDir))) {
    try { unlinkSync(devToolsPortFile(userDataDir)); } catch {}
  }

  const chrome = findChromeExecutable();
  const flags = [
    `--user-data-dir=${userDataDir}`,
    ...(profileDirectory ? [`--profile-directory=${profileDirectory}`] : []),
    '--remote-debugging-port=0',
    // Stealth automation: automation mode suppresses the "Allow debugging"
    // prompt; AutomationControlled hides navigator.webdriver so login sites
    // see a normal Chrome instead of a flagged one.
    '--enable-automation',
    '--disable-blink-features=AutomationControlled',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-notifications',
    ...(process.env.CDP_FAKE_MEDIA_UI ? ['--use-fake-ui-for-media-stream'] : []),
    ...splitExtraFlags(process.env.CDP_EXTRA_CHROME_FLAGS),
    url,
  ];

  const child = spawn(chrome, flags, { detached: true, stdio: 'ignore' });
  child.unref();

  const deadline = Date.now() + deadlineMs;
  let portWasUp = false;
  while (Date.now() < deadline) {
    if (await isProfileOpen(userDataDir)) {
      portWasUp = true;
      if (await hasPageTargets(userDataDir)) {
        return `${label}\topen\t${userDataDir}`;
      }
    }
    await sleep(250);
  }
  throw new Error(portWasUp
    ? `Launched Chrome, but no browser window appeared for ${userDataDir} (debug port up, zero tabs). Kill the stuck Chrome process and retry.`
    : `Launched Chrome, but DevTools did not become reachable for ${userDataDir}`);
}

async function profileStatusRows() {
  const profilesRoot = resolve(CACHE_DIR, 'profiles');
  mkdirSync(profilesRoot, { recursive: true, mode: 0o700 });
  const standard = ['bfloat', 'personal', 'turing'];
  const discovered = readdirSync(profilesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && isValidProfileName(entry.name))
    .map(entry => entry.name);
  const names = [...standard, ...discovered.filter(name => !standard.includes(name)).sort()];
  const width = Math.max(...names.map(name => name.length), 8);
  const rows = [];
  for (const name of names) {
    const dir = profileDir(name);
    const exists = existsSync(dir);
    const status = exists && await isProfileOpen(dir) ? 'open' : exists ? 'closed' : 'missing';
    rows.push(`${name.padEnd(width)}  ${status.padEnd(7)} ${dir}`);
  }
  return rows.join('\n');
}

// ---------------------------------------------------------------------------
// Real Chrome profiles — the user's normal Chrome (real cookies/logins)
//
// Chrome refuses command-line remote debugging (port AND pipe) when the
// user-data-dir is Chrome's default directory, where real profiles live.
// Workaround: clone the real profile into a non-default dir and launch that.
// The clone keeps cookies/logins/extensions; caches and session files are
// excluded (rebuildable). Sync with "cdp real sync <name>" (requires real
// Chrome closed).
// ---------------------------------------------------------------------------

const REAL_CLONES_DIR = resolve(CACHE_DIR, 'real-clones');

// Rebuildable or lock/state files that must not be copied into a clone.
const CLONE_EXCLUDES = [
  'Cache', 'Code Cache', 'GPUCache', 'DawnWebGPUCache', 'GrShaderCache',
  'Service Worker', 'Shared Dictionary', 'Crashpad', 'component_crx_cache',
  'extensions_crx_cache', 'GPUPersistentCache', 'Sessions', 'BrowserMetrics',
  'SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort',
  'chrome_shutdown_ms.txt', 'First Run', 'System Profile',
];

function realCloneDir(profile) {
  return resolve(REAL_CLONES_DIR, profile.dir);
}

function realClonePortFiles() {
  let entries = [];
  try {
    entries = readdirSync(REAL_CLONES_DIR, { withFileTypes: true });
  } catch { return []; }
  return entries
    .filter(e => e.isDirectory())
    .map(e => resolve(REAL_CLONES_DIR, e.name, 'DevToolsActivePort'));
}

function realCloneSyncedAt(cloneDir) {
  const marker = resolve(cloneDir, '.cdp-synced-at');
  if (!existsSync(marker)) return null;
  const t = new Date(readFileSync(marker, 'utf8').trim());
  return isNaN(t.getTime()) ? null : t;
}

function isRealChromeRunning() {
  const userDataDir = realChromeUserDataDir();
  const lockPath = resolve(userDataDir, IS_WINDOWS ? 'lockfile' : 'SingletonLock');
  let stat;
  try { stat = lstatSync(lockPath); } catch { return false; }
  // macOS/Linux: SingletonLock is a symlink whose NAME carries the PID
  // ("hostname-1234", Chrome 151+); Windows uses a regular lockfile with the
  // PID inside. Stale locks survive crashes; a lock only means Chrome is
  // running when its PID is still alive.
  const name = IS_WINDOWS ? readFileSync(lockPath, 'utf8') : basename(lockPath);
  const m = name.match(/(\d+)\s*$/m);
  if (!m) return true; // lock present but unparsable — assume running
  const pid = Number(m[1]);
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function rsyncRealToClone(src, dst, profile) {
  const excludes = [
    ...CLONE_EXCLUDES,
    // Copy only the target profile, not the other real profiles.
    ...realProfiles().filter(p => p.dir !== profile.dir).map(p => `--exclude=${p.dir}`),
  ];
  // Note: no --delete — macOS's bundled rsync 2.6.9 errors when an excluded
  // file exists in dst but not src (exit 23), which aborts the whole sync.
  return new Promise((resolvePromise, reject) => {
    const child = spawn('rsync', ['-a', ...excludes, `${src}/`, `${dst}/`]);
    let err = '';
    child.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    child.on('error', (e) => reject(new Error(`rsync not available: ${e.message}`)));
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else {
        const tail = err.trim().split('\n').slice(-5).join('\n');
        reject(new Error(`rsync failed (exit ${code}):\n${tail}`));
      }
    });
  });
}

async function syncRealProfile(name) {
  const profile = resolveRealProfile(name);
  const src = realChromeUserDataDir();
  const srcProfileDir = resolve(src, profile.dir);
  if (!existsSync(srcProfileDir)) {
    throw new Error(`Real profile dir not found: ${srcProfileDir}`);
  }
  if (isRealChromeRunning()) {
    throw new Error(`Real Chrome is running (${resolve(src, 'SingletonLock')}). Quit Chrome first, then retry.`);
  }
  const dst = realCloneDir(profile);
  if (!realCloneSyncedAt(dst)) {
    // First creation: wipe any partial copy (e.g. an aborted earlier rsync)
    // so the clone starts from a clean, untorn state.
    try { rmSync(dst, { recursive: true, force: true }); } catch {}
  }
  mkdirSync(dst, { recursive: true, mode: 0o700 });
  console.log(`Syncing ${profile.name} (${profile.dir}) → ${dst} ...`);
  await rsyncRealToClone(src, dst, profile);
  writeFileSync(resolve(dst, '.cdp-synced-at'), new Date().toISOString(), { mode: 0o600 });
  console.log(`Clone synced. Logins/cookies are now up to date.`);
}

function realChromeUserDataDir() {
  const home = homedir();
  if (IS_WINDOWS) {
    const base = process.env.LOCALAPPDATA || resolve(home, 'AppData/Local');
    return resolve(base, 'Google/Chrome/User Data');
  }
  if (process.platform === 'darwin') {
    return resolve(home, 'Library/Application Support/Google/Chrome');
  }
  return resolve(home, '.config', 'google-chrome');
}

function realProfiles() {
  const dir = realChromeUserDataDir();
  if (!existsSync(dir)) return [];
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(resolve(dir, 'Local State'), 'utf8')).profile?.info_cache || {};
  } catch {}
  let dirs = [];
  try {
    dirs = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && (e.name === 'Default' || /^Profile \d+$/.test(e.name)))
      .map(e => e.name);
  } catch {}
  const known = new Set(Object.keys(cache));
  const allDirs = [...dirs.filter(d => !known.has(d)), ...Object.keys(cache)];
  return allDirs.map(d => ({ dir: d, name: cache[d]?.name || (d === 'Default' ? 'Default' : d) }));
}

// Display names: real profiles show as "<name>-cdp" (e.g. "Personal-cdp") so
// they can't be mistaken for the normal Chrome profile picker, while commands
// still address them by their real name ("cdp real Personal").
function realDisplayName(profile) {
  return `${profile.name}-cdp`;
}

function resolveRealProfile(input) {
  const q = String(input).toLowerCase();
  const matches = realProfiles().filter(p =>
    p.name.toLowerCase() === q || p.dir.toLowerCase() === q
  );
  if (matches.length === 0) {
    throw new Error(`No real Chrome profile matching "${input}". Run "cdp real list" to see profiles.`);
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous profile "${input}" — matches ${matches.map(m => `${m.name} (${m.dir})`).join(', ')}. Use the profile dir, e.g. "cdp real ${matches[0].dir}".`);
  }
  return matches[0];
}

// Browser-context tagging: maps CDP browserContextId -> real profile name,
// persisted so "cdp list" can label each tab with its Chrome profile.
function contextTagsPath() { return resolve(CACHE_DIR, 'contexts.json'); }

function loadContextTags() {
  try { return JSON.parse(readFileSync(contextTagsPath(), 'utf8')); } catch { return {}; }
}

function saveContextTag(contextId, name) {
  const map = loadContextTags();
  map[contextId] = name;
  writeFileSync(contextTagsPath(), JSON.stringify(map, null, 2), { mode: 0o600 });
}

async function launchRealProfile(name, url = 'about:blank') {
  const profile = resolveRealProfile(name);
  const src = realChromeUserDataDir();
  const srcProfileDir = resolve(src, profile.dir);
  if (!existsSync(srcProfileDir)) {
    throw new Error(`Real profile dir not found: ${srcProfileDir}`);
  }

  const cloneDir = realCloneDir(profile);
  const display = realDisplayName(profile);

  // Already open? Attach instead of spawning a second instance — a second
  // launch against the same user-data-dir races the singleton lock and can
  // strand a windowless browser (debug port up, zero tabs).
  if (await isProfileOpen(cloneDir)) {
    try {
      const [port, path] = readFileSync(devToolsPortFile(cloneDir), 'utf8').trim().split('\n');
      const cdp = new CDP();
      await cdp.connect(`ws://127.0.0.1:${port}${path}`);
      const { targetInfos } = await cdp.send('Target.getTargets', {});
      const pages = (targetInfos || []).filter(t => t.type === 'page');
      if (pages.length === 0) {
        // Zombie: debug port up but no window. Kill it and relaunch fresh.
        cdp.close();
        const pid = readFileSync(resolve(cloneDir, 'SingletonLock'), 'utf8').match(/(\d+)\s*$/m)?.[1];
        if (pid) { try { process.kill(Number(pid), 'SIGTERM'); } catch {} }
        console.log(`Stale ${display} clone has no window — killed it, relaunching...`);
        await sleep(2500);
      } else {
        if (url !== 'about:blank') {
          await cdp.send('Target.createTarget', { url });
          console.log(`Clone of ${display} already open — opened ${url} in it.`);
        } else {
          console.log(`Clone of ${display} already open (${pages.length} tabs) — "cdp list" shows them.`);
        }
        cdp.close();
        return;
      }
    } catch {}
  }

  // Clone exists? Otherwise create it (requires real Chrome closed so the
  // copy isn't torn by a live profile being written underneath).
  const syncedAt = realCloneSyncedAt(cloneDir);
  if (!syncedAt) {
    if (isRealChromeRunning()) {
      throw new Error(
        `Real Chrome is running, so the clone for ${profile.name} can't be created now. ` +
        'Quit Chrome (or close it) and retry; afterwards "cdp real ' + name + '" works with Chrome open.'
      );
    }
    await syncRealProfile(name);
  } else {
    const ageMin = Math.round((Date.now() - syncedAt.getTime()) / 60000);
    console.log(`Using clone synced ${ageMin < 60 ? ageMin + 'm' : Math.round(ageMin / 60) + 'h'} ago. ` +
      (isRealChromeRunning() ? 'Real Chrome is open — for fresh logins run "cdp real sync ' + name + '" with Chrome closed.'
        : 'Run "cdp real sync ' + name + '" anytime to refresh logins/cookies.'));
  }

  // Launch the CLONE (non-default dir → the debugging guard passes) with the
  // stealth flags: automation mode suppresses the "Allow debugging" prompt,
  // AutomationControlled hides navigator.webdriver from login sites.
  await launchWithUserDataDir(cloneDir, url, `real:${profile.name}`, profile.dir, 60000);
  // Tag the launched profile's browser context so "cdp list" shows [name].
  try {
    const cdp = new CDP();
    await cdp.connect(await getWsUrl());
    for (let i = 0; i < 10; i++) {
      const { targetInfos } = await cdp.send('Target.getTargets');
      const pages = targetInfos.filter(t => t.type === 'page');
      const wanted = url !== 'about:blank'
        ? pages.find(p => p.url.startsWith(url))
        : pages[0];
      if (wanted?.browserContextId) {
        saveContextTag(wanted.browserContextId, realDisplayName(profile));
        console.log(`Tagged context ${wanted.browserContextId.slice(0, 8)} as [${realDisplayName(profile)}]`);
        // Pre-warm the daemon so the first cdp command is instant. Close the
        // probe connection — an open socket keeps this CLI process alive.
        try {
          const probe = await getOrStartTabDaemon(wanted.targetId);
          probe.destroy();
        } catch {}
        break;
      }
      await sleep(250);
    }
    cdp.close();
  } catch {}
  console.log(`Launched real Chrome profile [${realDisplayName(profile)}] (clone of ${profile.dir})${url !== 'about:blank' ? ` at ${url}` : ''}`);
}

async function realProfileRows() {
  const dir = realChromeUserDataDir();
  if (!existsSync(dir)) throw new Error(`Real Chrome profile dir not found: ${dir}`);
  const profiles = realProfiles();
  const width = Math.max(...profiles.map(p => realDisplayName(p).length), 8);
  return profiles.map(p => {
    const cloneDir = realCloneDir(p);
    let state = 'no clone';
    const syncedAt = realCloneSyncedAt(cloneDir);
    if (syncedAt) {
      const ageMin = Math.round((Date.now() - syncedAt.getTime()) / 60000);
      state = `clone synced ${ageMin < 60 ? ageMin + 'm' : Math.round(ageMin / 60) + 'h'} ago`;
    } else if (existsSync(cloneDir)) {
      state = 'clone (not synced)';
    }
    return `${realDisplayName(p).padEnd(width)}  ${p.dir.padEnd(12)} ${state}`;
  }).join('\n');
}

const PERMISSION_ALIASES = new Map([
  ['geolocation', ['geolocation']],
  ['notifications', ['notifications']],
  ['notification', ['notifications']],
  ['camera', ['videoCapture']],
  ['video', ['videoCapture']],
  ['videoCapture', ['videoCapture']],
  ['microphone', ['audioCapture']],
  ['mic', ['audioCapture']],
  ['audio', ['audioCapture']],
  ['audioCapture', ['audioCapture']],
  ['clipboard', ['clipboardReadWrite', 'clipboardSanitizedWrite']],
  ['clipboardReadWrite', ['clipboardReadWrite']],
  ['clipboardSanitizedWrite', ['clipboardSanitizedWrite']],
]);

function resolvePermissions(value) {
  const requested = value
    ? value.split(',').map(item => item.trim()).filter(Boolean)
    : ['geolocation', 'notifications', 'clipboard', 'microphone', 'camera'];
  const permissions = [];
  for (const item of requested) {
    const mapped = PERMISSION_ALIASES.get(item);
    if (!mapped) throw new Error(`Unknown permission "${item}"`);
    for (const permission of mapped) {
      if (!permissions.includes(permission)) permissions.push(permission);
    }
  }
  return permissions;
}

async function grantPermissions(originArg, permissionsArg) {
  if (!originArg) throw new Error('Origin required, e.g. https://example.com');
  let origin;
  try {
    const parsed = new URL(originArg);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
    origin = parsed.origin;
  } catch {
    throw new Error(`Invalid origin: ${originArg}`);
  }

  const cdp = new CDP();
  await cdp.connect(await getWsUrl());
  const permissions = resolvePermissions(permissionsArg);
  await cdp.send('Browser.grantPermissions', { origin, permissions });
  cdp.close();
  return `Granted ${permissions.join(',')} to ${origin}`;
}

function resolvePrefix(prefix, candidates, noun = 'target', missingHint = '') {
  const upper = prefix.toUpperCase();
  const matches = candidates.filter(candidate => candidate.toUpperCase().startsWith(upper));
  if (matches.length === 0) {
    const hint = missingHint ? ` ${missingHint}` : '';
    throw new Error(`No ${noun} matching prefix "${prefix}".${hint}`);
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous prefix "${prefix}" — matches ${matches.length} ${noun}s. Use more characters.`);
  }
  return matches[0];
}

function getDisplayPrefixLength(targetIds) {
  if (targetIds.length === 0) return MIN_TARGET_PREFIX_LEN;
  const maxLen = Math.max(...targetIds.map(id => id.length));
  for (let len = MIN_TARGET_PREFIX_LEN; len <= maxLen; len++) {
    const prefixes = new Set(targetIds.map(id => id.slice(0, len).toUpperCase()));
    if (prefixes.size === targetIds.length) return len;
  }
  return maxLen;
}

// ---------------------------------------------------------------------------
// CDP WebSocket client
// ---------------------------------------------------------------------------

class CDP {
  #ws; #id = 0; #pending = new Map(); #eventHandlers = new Map(); #closeHandlers = [];

  async connect(wsUrl) {
    return new Promise((res, rej) => {
      this.#ws = new WebSocket(wsUrl);
      this.#ws.onopen = () => res();
      this.#ws.onerror = (e) => rej(new Error('WebSocket error: ' + (e.message || e.type)));
      this.#ws.onclose = () => this.#closeHandlers.forEach(h => h());
      this.#ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.#pending.has(msg.id)) {
          const { resolve, reject } = this.#pending.get(msg.id);
          this.#pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        } else if (msg.method && this.#eventHandlers.has(msg.method)) {
          for (const handler of [...this.#eventHandlers.get(msg.method)]) {
            handler(msg.params || {}, msg);
          }
        }
      };
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.#id;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.#ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (this.#pending.has(id)) {
          this.#pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, TIMEOUT);
    });
  }

  onEvent(method, handler) {
    if (!this.#eventHandlers.has(method)) this.#eventHandlers.set(method, new Set());
    const handlers = this.#eventHandlers.get(method);
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) this.#eventHandlers.delete(method);
    };
  }

  waitForEvent(method, timeout = TIMEOUT) {
    let settled = false;
    let off;
    let timer;
    const promise = new Promise((resolve, reject) => {
      off = this.onEvent(method, (params) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off();
        resolve(params);
      });
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        off();
        reject(new Error(`Timeout waiting for event: ${method}`));
      }, timeout);
    });
    return {
      promise,
      cancel() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        off?.();
      },
    };
  }

  onClose(handler) { this.#closeHandlers.push(handler); }
  close() { this.#ws.close(); }
}

// ---------------------------------------------------------------------------
// Command implementations — return strings, take (cdp, sessionId)
// ---------------------------------------------------------------------------

async function getPages(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  return targetInfos.filter(t => t.type === 'page' && !t.url.startsWith('chrome://'));
}

function formatPageList(pages, contextTags = {}) {
  const prefixLen = getDisplayPrefixLength(pages.map(p => p.targetId));
  const labels = pages.map(p => (p.browserContextId && contextTags[p.browserContextId]) || '');
  const hasLabels = labels.some(Boolean);
  const labelWidth = hasLabels ? Math.max(...labels.map(l => l.length), 0) : 0;
  return pages.map((p, i) => {
    const id = p.targetId.slice(0, prefixLen).padEnd(prefixLen);
    const label = hasLabels ? `[${labels[i].padEnd(labelWidth)}] ` : '';
    const title = p.title.substring(0, 54).padEnd(54);
    return `${id}  ${label}${title}  ${p.url}`;
  }).join('\n');
}

function shouldShowAxNode(node, compact = false) {
  const role = node.role?.value || '';
  const name = node.name?.value ?? '';
  const value = node.value?.value;
  if (compact && role === 'InlineTextBox') return false;
  return role !== 'none' && role !== 'generic' && !(name === '' && (value === '' || value == null));
}

function formatAxNode(node, depth) {
  const role = node.role?.value || '';
  const name = node.name?.value ?? '';
  const value = node.value?.value;
  const indent = '  '.repeat(Math.min(depth, 10));
  let line = `${indent}[${role}]`;
  if (name !== '') line += ` ${name}`;
  if (!(value === '' || value == null)) line += ` = ${JSON.stringify(value)}`;
  return line;
}

function orderedAxChildren(node, nodesById, childrenByParent) {
  const children = [];
  const seen = new Set();
  for (const childId of node.childIds || []) {
    const child = nodesById.get(childId);
    if (child && !seen.has(child.nodeId)) {
      seen.add(child.nodeId);
      children.push(child);
    }
  }
  for (const child of childrenByParent.get(node.nodeId) || []) {
    if (!seen.has(child.nodeId)) {
      seen.add(child.nodeId);
      children.push(child);
    }
  }
  return children;
}

async function snapshotStr(cdp, sid, compact = false) {
  const { nodes } = await cdp.send('Accessibility.getFullAXTree', {}, sid);
  const nodesById = new Map(nodes.map(node => [node.nodeId, node]));
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (!node.parentId) continue;
    if (!childrenByParent.has(node.parentId)) childrenByParent.set(node.parentId, []);
    childrenByParent.get(node.parentId).push(node);
  }

  const lines = [];
  const visited = new Set();
  function visit(node, depth) {
    if (!node || visited.has(node.nodeId)) return;
    visited.add(node.nodeId);
    if (shouldShowAxNode(node, compact)) lines.push(formatAxNode(node, depth));
    for (const child of orderedAxChildren(node, nodesById, childrenByParent)) {
      visit(child, depth + 1);
    }
  }

  const roots = nodes.filter(node => !node.parentId || !nodesById.has(node.parentId));
  for (const root of roots) visit(root, 0);
  for (const node of nodes) visit(node, 0);

  return lines.join('\n');
}

async function evalStr(cdp, sid, expression) {
  await cdp.send('Runtime.enable', {}, sid);
  const result = await cdp.send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  }, sid);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description);
  }
  const val = result.result.value;
  return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '');
}

async function shotStr(cdp, sid, filePath, targetId) {
  // Get device scale factor so we can report coordinate mapping
  let dpr = 1;
  try {
    const metrics = await cdp.send('Page.getLayoutMetrics', {}, sid);
    dpr = metrics.visualViewport?.clientWidth
      ? metrics.cssVisualViewport?.clientWidth
        ? Math.round((metrics.visualViewport.clientWidth / metrics.cssVisualViewport.clientWidth) * 100) / 100
        : 1
      : 1;
    // Simpler: deviceScaleFactor is on the root Page metrics
    const { deviceScaleFactor } = await cdp.send('Emulation.getDeviceMetricsOverride', {}, sid).catch(() => ({}));
    if (deviceScaleFactor) dpr = deviceScaleFactor;
  } catch {}
  // Fallback: try to get DPR from JS
  if (dpr === 1) {
    try {
      const raw = await evalStr(cdp, sid, 'window.devicePixelRatio');
      const parsed = parseFloat(raw);
      if (parsed > 0) dpr = parsed;
    } catch {}
  }

  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sid);
  const out = filePath || resolve(RUNTIME_DIR, `screenshot-${(targetId || 'unknown').slice(0, 8)}.png`);
  writeFileSync(out, Buffer.from(data, 'base64'));

  const lines = [out];
  lines.push(`Screenshot saved. Device pixel ratio (DPR): ${dpr}`);
  lines.push(`Coordinate mapping:`);
  lines.push(`  Screenshot pixels → CSS pixels (for CDP Input events): divide by ${dpr}`);
  lines.push(`  e.g. screenshot point (${Math.round(100 * dpr)}, ${Math.round(200 * dpr)}) → CSS (100, 200) → use clickxy <target> 100 200`);
  if (dpr !== 1) {
    lines.push(`  On this ${dpr}x display: CSS px = screenshot px / ${dpr} ≈ screenshot px × ${Math.round(100/dpr)/100}`);
  }
  return lines.join('\n');
}

async function htmlStr(cdp, sid, selector) {
  const expr = selector
    ? `document.querySelector(${JSON.stringify(selector)})?.outerHTML || 'Element not found'`
    : `document.documentElement.outerHTML`;
  return evalStr(cdp, sid, expr);
}

async function waitForDocumentReady(cdp, sid, timeoutMs = NAVIGATION_TIMEOUT) {
  const deadline = Date.now() + timeoutMs;
  let lastState = '';
  let lastError;
  while (Date.now() < deadline) {
    try {
      const state = await evalStr(cdp, sid, 'document.readyState');
      lastState = state;
      if (state === 'complete') return;
    } catch (e) {
      lastError = e;
    }
    await sleep(200);
  }

  if (lastState) {
    throw new Error(`Timed out waiting for navigation to finish (last readyState: ${lastState})`);
  }
  if (lastError) {
    throw new Error(`Timed out waiting for navigation to finish (${lastError.message})`);
  }
  throw new Error('Timed out waiting for navigation to finish');
}

async function navStr(cdp, sid, url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      throw new Error(`Only http/https URLs allowed, got: ${url}`);
  } catch (e) {
    if (e.message.startsWith('Only')) throw e;
    throw new Error(`Invalid URL: ${url}`);
  }
  await cdp.send('Page.enable', {}, sid);
  const loadEvent = cdp.waitForEvent('Page.loadEventFired', NAVIGATION_TIMEOUT);
  const result = await cdp.send('Page.navigate', { url }, sid);
  if (result.errorText) {
    loadEvent.cancel();
    throw new Error(result.errorText);
  }
  if (result.loaderId) {
    await loadEvent.promise;
  } else {
    loadEvent.cancel();
  }
  await waitForDocumentReady(cdp, sid, 5000);
  return `Navigated to ${url}`;
}

async function netStr(cdp, sid) {
  const raw = await evalStr(cdp, sid, `JSON.stringify(performance.getEntriesByType('resource').map(e => ({
    name: e.name.substring(0, 120), type: e.initiatorType,
    duration: Math.round(e.duration), size: e.transferSize
  })))`);
  return JSON.parse(raw).map(e =>
    `${String(e.duration).padStart(5)}ms  ${String(e.size || '?').padStart(8)}B  ${e.type.padEnd(8)}  ${e.name}`
  ).join('\n');
}

// Click element by CSS selector
async function clickStr(cdp, sid, selector) {
  if (!selector) throw new Error('CSS selector required');
  const expr = `
    (function() {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: 'Element not found: ' + ${JSON.stringify(selector)} };
      el.scrollIntoView({ block: 'center' });
      el.click();
      return { ok: true, tag: el.tagName, text: el.textContent.trim().substring(0, 80) };
    })()
  `;
  const result = await evalStr(cdp, sid, expr);
  const r = JSON.parse(result);
  if (!r.ok) throw new Error(r.error);
  return `Clicked <${r.tag}> "${r.text}"`;
}

// Click at CSS pixel coordinates using Input.dispatchMouseEvent
async function clickXyStr(cdp, sid, x, y) {
  const cx = parseFloat(x);
  const cy = parseFloat(y);
  if (isNaN(cx) || isNaN(cy)) throw new Error('x and y must be numbers (CSS pixels)');
  const base = { x: cx, y: cy, button: 'left', clickCount: 1, modifiers: 0 };
  await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved' }, sid);
  await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed' }, sid);
  await sleep(50);
  await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased' }, sid);
  return `Clicked at CSS (${cx}, ${cy})`;
}

// Type text using Input.insertText (works in cross-origin iframes, unlike eval)
async function typeStr(cdp, sid, text) {
  if (text == null || text === '') throw new Error('text required');
  await cdp.send('Input.insertText', { text }, sid);
  return `Typed ${text.length} characters`;
}

// Load-more: repeatedly click a button/selector until it disappears
async function loadAllStr(cdp, sid, selector, intervalMs = 1500) {
  if (!selector) throw new Error('CSS selector required');
  let clicks = 0;
  const deadline = Date.now() + 5 * 60 * 1000; // 5-minute hard cap
  while (Date.now() < deadline) {
    const exists = await evalStr(cdp, sid,
      `!!document.querySelector(${JSON.stringify(selector)})`
    );
    if (exists !== 'true') break;
    const clickExpr = `
      (function() {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      })()
    `;
    const clicked = await evalStr(cdp, sid, clickExpr);
    if (clicked !== 'true') break;
    clicks++;
    await sleep(intervalMs);
  }
  return `Clicked "${selector}" ${clicks} time(s) until it disappeared`;
}

// Send a raw CDP command and return the result as JSON
async function evalRawStr(cdp, sid, method, paramsJson) {
  if (!method) throw new Error('CDP method required (e.g. "DOM.getDocument")');
  let params = {};
  if (paramsJson) {
    try { params = JSON.parse(paramsJson); }
    catch { throw new Error(`Invalid JSON params: ${paramsJson}`); }
  }
  const result = await cdp.send(method, params, sid);
  return JSON.stringify(result, null, 2);
}

// ---------------------------------------------------------------------------
// Per-tab daemon
// ---------------------------------------------------------------------------

async function runDaemon(targetId) {
  const sp = sockPath(targetId);

  const cdp = new CDP();
  try {
    await cdp.connect(await getWsUrl());
  } catch (e) {
    process.stderr.write(`Daemon: cannot connect to Chrome: ${e.message}\n`);
    process.exit(1);
  }

  let sessionId;
  try {
    const res = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    sessionId = res.sessionId;
  } catch (e) {
    process.stderr.write(`Daemon: attach failed: ${e.message}\n`);
    cdp.close();
    process.exit(1);
  }

  // Shutdown helpers
  let alive = true;
  function shutdown() {
    if (!alive) return;
    alive = false;
    server.close();
    if (!IS_WINDOWS) try { unlinkSync(sp); } catch {}
    cdp.close();
    process.exit(0);
  }

  // Exit if target goes away or Chrome disconnects
  cdp.onEvent('Target.targetDestroyed', (params) => {
    if (params.targetId === targetId) shutdown();
  });
  cdp.onEvent('Target.detachedFromTarget', (params) => {
    if (params.sessionId === sessionId) shutdown();
  });
  cdp.onClose(() => shutdown());
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Idle timer
  let idleTimer = setTimeout(shutdown, IDLE_TIMEOUT);
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(shutdown, IDLE_TIMEOUT);
  }

  // Handle a command
  async function handleCommand({ cmd, args }) {
    resetIdle();
    try {
      let result;
      switch (cmd) {
        case 'list': {
          const pages = await getPages(cdp);
          result = formatPageList(pages, loadContextTags());
          break;
        }
        case 'list_raw': {
          const pages = await getPages(cdp);
          result = JSON.stringify(pages);
          break;
        }
        case 'snap': case 'snapshot': result = await snapshotStr(cdp, sessionId, true); break;
        case 'eval': result = await evalStr(cdp, sessionId, args[0]); break;
        case 'shot': case 'screenshot': result = await shotStr(cdp, sessionId, args[0], targetId); break;
        case 'html': result = await htmlStr(cdp, sessionId, args[0]); break;
        case 'nav': case 'navigate': result = await navStr(cdp, sessionId, args[0]); break;
        case 'net': case 'network': result = await netStr(cdp, sessionId); break;
        case 'click': result = await clickStr(cdp, sessionId, args[0]); break;
        case 'clickxy': result = await clickXyStr(cdp, sessionId, args[0], args[1]); break;
        case 'type': result = await typeStr(cdp, sessionId, args[0]); break;
        case 'loadall': result = await loadAllStr(cdp, sessionId, args[0], args[1] ? parseInt(args[1]) : 1500); break;
        case 'evalraw': result = await evalRawStr(cdp, sessionId, args[0], args[1]); break;
        case 'stop': return { ok: true, result: '', stopAfter: true };
        default: return { ok: false, error: `Unknown command: ${cmd}` };
      }
      return { ok: true, result: result ?? '' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Unix socket server — NDJSON protocol
  // Wire format: each message is one JSON object followed by \n (newline-delimited JSON).
  // Request:  { "id": <number>, "cmd": "<command>", "args": ["arg1", "arg2", ...] }
  // Response: { "id": <number>, "ok": <boolean>, "result": "<string>" }
  //           or { "id": <number>, "ok": false, "error": "<message>" }
  const server = net.createServer((conn) => {
    let buf = '';
    conn.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop(); // keep incomplete last line
      for (const line of lines) {
        if (!line.trim()) continue;
        let req;
        try {
          req = JSON.parse(line);
        } catch {
          conn.write(JSON.stringify({ ok: false, error: 'Invalid JSON request', id: null }) + '\n');
          continue;
        }
        handleCommand(req).then((res) => {
          const payload = JSON.stringify({ ...res, id: req.id }) + '\n';
          if (res.stopAfter) conn.end(payload, shutdown);
          else conn.write(payload);
        });
      }
    });
  });

  server.on('error', (e) => {
    process.stderr.write(`Daemon server listen failed: ${e.message}\n`);
    process.exit(1);
  });

  if (!IS_WINDOWS) try { unlinkSync(sp); } catch {}
  server.listen(sp);
}

// ---------------------------------------------------------------------------
// CLI ↔ daemon communication
// ---------------------------------------------------------------------------

function connectToSocket(sp) {
  return new Promise((resolve, reject) => {
    const conn = net.connect(sp);
    conn.on('connect', () => resolve(conn));
    conn.on('error', reject);
  });
}

async function getOrStartTabDaemon(targetId) {
  const sp = sockPath(targetId);
  // Try existing daemon
  try { return await connectToSocket(sp); } catch {}

  // Clean stale socket
  if (!IS_WINDOWS) try { unlinkSync(sp); } catch {}

  // Spawn daemon
  const child = spawn(process.execPath, [process.argv[1], '_daemon', targetId], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  // Wait for socket (includes time for user to click Allow)
  for (let i = 0; i < DAEMON_CONNECT_RETRIES; i++) {
    await sleep(DAEMON_CONNECT_DELAY);
    try { return await connectToSocket(sp); } catch {}
  }
  throw new Error('Daemon failed to start — did you click Allow in Chrome?');
}

function sendCommand(conn, req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    let settled = false;

    const cleanup = () => {
      conn.off('data', onData);
      conn.off('error', onError);
      conn.off('end', onEnd);
      conn.off('close', onClose);
    };

    const onData = (chunk) => {
      buf += chunk.toString();
      const idx = buf.indexOf('\n');
      if (idx === -1) return;
      settled = true;
      cleanup();
      resolve(JSON.parse(buf.slice(0, idx)));
      conn.end();
    };

    const onError = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onEnd = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Connection closed before response'));
    };

    const onClose = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Connection closed before response'));
    };

    conn.on('data', onData);
    conn.on('error', onError);
    conn.on('end', onEnd);
    conn.on('close', onClose);
    req.id = 1;
    conn.write(JSON.stringify(req) + '\n');
  });
}

// ---------------------------------------------------------------------------
// Stop daemons
// ---------------------------------------------------------------------------

async function stopDaemons(targetPrefix) {
  if (!existsSync(PAGES_CACHE)) return;
  const pages = JSON.parse(readFileSync(PAGES_CACHE, 'utf8'));
  const targets = targetPrefix
    ? [resolvePrefix(targetPrefix, pages.map(p => p.targetId), 'target')]
    : pages.map(p => p.targetId);

  for (const targetId of targets) {
    const sp = sockPath(targetId);
    try {
      const conn = await connectToSocket(sp);
      await sendCommand(conn, { cmd: 'stop' });
    } catch {
      if (!IS_WINDOWS) try { unlinkSync(sp); } catch {}
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const USAGE = `cdp - lightweight Chrome DevTools Protocol CLI (no Puppeteer)

Usage: cdp <command> [args]

  list                              List open pages (shows unique target prefixes)
  snap  <target>                    Accessibility tree snapshot
  eval  <target> <expr>             Evaluate JS expression
  shot  <target> [file]             Screenshot (default: screenshot-<target>.png in runtime dir); prints coordinate mapping
  html  <target> [selector]         Get HTML (full page or CSS selector)
  nav   <target> <url>              Navigate to URL and wait for load completion
  net   <target>                    Network performance entries
  click   <target> <selector>       Click an element by CSS selector
  clickxy <target> <x> <y>          Click at CSS pixel coordinates (see coordinate note below)
  type    <target> <text>           Type text at current focus via Input.insertText
                                    Works in cross-origin iframes unlike eval-based approaches
  loadall <target> <selector> [ms]  Repeatedly click a "load more" button until it disappears
                                    Optional interval in ms between clicks (default 1500)
  evalraw <target> <method> [json]  Send a raw CDP command; returns JSON result
                                    e.g. evalraw <t> "DOM.getDocument" '{}'
  launch [url]                      Launch the default persistent CDP profile
  launch-profile <name> [url]       Launch a named persistent profile
  profiles                          Show standard named profile status
  real list                         List your real Chrome profiles and clone status
  real <profile> [url]              Launch a CLONE of your real Chrome profile with that
                                    profile's cookies/logins/extensions, stealth-launched:
                                    no "Allow debugging" prompts, navigator.webdriver hidden,
                                    sites see a normal trusted Chrome. First run creates the
                                    clone (quit Chrome once); later runs use it as-is.
                                    Tabs are labeled [profile] in list output via context tags
  real sync <profile>               Refresh the clone with current cookies/logins
                                    (quit real Chrome first)
  grant <origin> [permissions]      Grant page permissions for an origin
  open  [url]                       Open a new tab (default: about:blank)
                                    Note: each new tab triggers a fresh "Allow debugging?" prompt
  stop  [target]                    Stop daemon(s)

<target> is a unique targetId prefix from "cdp list". If a prefix is ambiguous,
use more characters.

COORDINATE SYSTEM
  shot captures the viewport at the device's native resolution.
  The screenshot image size = CSS pixels × DPR (device pixel ratio).
  For CDP Input events (clickxy, etc.) you need CSS pixels, not image pixels.

    CSS pixels = screenshot image pixels / DPR

  shot prints the DPR and an example conversion for the current page.
  Typical Retina (DPR=2): CSS px ≈ screenshot px × 0.5
  If your viewer rescales the image further, account for that scaling too.

EVAL SAFETY NOTE
  Avoid index-based DOM selection (querySelectorAll(...)[i]) across multiple
  eval calls when the list can change between calls (e.g. after clicking
  "Ignore" buttons on a feed — indices shift). Prefer stable selectors or
  collect all data in a single eval.

DAEMON IPC (for advanced use / scripting)
  Each tab runs a persistent daemon at Unix socket in the runtime dir (see below).
  Protocol: newline-delimited JSON (one JSON object per line, UTF-8).
    Request:  {"id":<number>, "cmd":"<command>", "args":["arg1","arg2",...]}
    Response: {"id":<number>, "ok":true,  "result":"<string>"}
           or {"id":<number>, "ok":false, "error":"<message>"}
  Commands mirror the CLI: snap, eval, shot, html, nav, net, click, clickxy,
  type, loadall, evalraw, stop. Use evalraw to send arbitrary CDP methods.
  The socket disappears after 8 hours of inactivity or when the tab closes.
  Override with CDP_IDLE_TIMEOUT_MS.
`;

const NEEDS_TARGET = new Set([
  'snap','snapshot','eval','shot','screenshot','html','nav','navigate',
  'net','network','click','clickxy','type','loadall','evalraw',
]);

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  // Daemon mode (internal)
  if (cmd === '_daemon') { await runDaemon(args[0]); return; }

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(USAGE); process.exit(0);
  }

  if (cmd === 'list' || cmd === 'ls') {
    const cdp = new CDP();
    await cdp.connect(await getWsUrl());
    const pages = await getPages(cdp);
    cdp.close();
    writeFileSync(PAGES_CACHE, JSON.stringify(pages), { mode: 0o600 });
    console.log(formatPageList(pages, loadContextTags()));
    setTimeout(() => process.exit(0), 100);
    return;
  }

  if (cmd === 'launch') {
    console.log(await launchWithUserDataDir(selectedUserDataDir(), args[0] || 'about:blank', PROFILE_NAME || 'default'));
    return;
  }

  if (cmd === 'launch-profile') {
    const name = args[0];
    if (!name) {
      console.error('Error: profile name required');
      process.exit(1);
    }
    console.log(await launchProfile(name, args[1] || 'about:blank'));
    return;
  }

  if (cmd === 'profiles') {
    console.log(await profileStatusRows());
    return;
  }

  // Real Chrome profiles (clone-based)
  if (cmd === 'real') {
    if (!args[0] || args[0] === 'list' || args[0] === 'ls') {
      console.log(await realProfileRows());
      return;
    }
    if (args[0] === 'sync') {
      if (!args[1]) {
        console.error('Error: profile name required (cdp real sync <profile>)');
        process.exit(1);
      }
      await syncRealProfile(args[1]);
      return;
    }
    await launchRealProfile(args[0], args[1] || 'about:blank');
    return;
  }

  if (cmd === 'grant') {
    console.log(await grantPermissions(args[0], args[1]));
    return;
  }

  // Open new tab
  if (cmd === 'open') {
    const url = args[0] || 'about:blank';
    const cdp = new CDP();
    await cdp.connect(await getWsUrl());
    const { targetId } = await cdp.send('Target.createTarget', { url });
    // Refresh cache; new tab may not appear in getTargets immediately, so add it manually
    const pages = await getPages(cdp);
    if (!pages.some(p => p.targetId === targetId)) {
      pages.push({ targetId, title: url, url });
    }
    cdp.close();
    writeFileSync(PAGES_CACHE, JSON.stringify(pages), { mode: 0o600 });
    console.log(`Opened new tab: ${targetId.slice(0, 8)}  ${url}`);
    console.log('Note: this tab will need "Allow debugging?" approval on first access.');
    return;
  }

  // Stop
  if (cmd === 'stop') {
    await stopDaemons(args[0]);
    return;
  }

  // Page commands — need target prefix
  if (!NEEDS_TARGET.has(cmd)) {
    console.error(`Unknown command: ${cmd}\n`);
    console.log(USAGE);
    process.exit(1);
  }

  const targetPrefix = args[0];
  if (!targetPrefix) {
    console.error('Error: target ID required. Run "cdp list" first.');
    process.exit(1);
  }

  // Resolve prefix → full targetId from pages cache
  if (!existsSync(PAGES_CACHE)) {
    console.error('No page list cached. Run "cdp list" first.');
    process.exit(1);
  }
  const pages = JSON.parse(readFileSync(PAGES_CACHE, 'utf8'));
  const targetId = resolvePrefix(targetPrefix, pages.map(p => p.targetId), 'target', 'Run "cdp list".');

  const conn = await getOrStartTabDaemon(targetId);

  const cmdArgs = args.slice(1);

  if (cmd === 'eval') {
    const expr = cmdArgs.join(' ');
    if (!expr) { console.error('Error: expression required'); process.exit(1); }
    cmdArgs[0] = expr;
  } else if (cmd === 'type') {
    // Join all remaining args as text (allows spaces)
    const text = cmdArgs.join(' ');
    if (!text) { console.error('Error: text required'); process.exit(1); }
    cmdArgs[0] = text;
  } else if (cmd === 'evalraw') {
    // args: [method, ...jsonParts] — join json parts in case of spaces
    if (!cmdArgs[0]) { console.error('Error: CDP method required'); process.exit(1); }
    if (cmdArgs.length > 2) cmdArgs[1] = cmdArgs.slice(1).join(' ');
  }

  if ((cmd === 'nav' || cmd === 'navigate') && !cmdArgs[0]) {
    console.error('Error: URL required');
    process.exit(1);
  }

  const response = await sendCommand(conn, { cmd, args: cmdArgs });

  if (response.ok) {
    if (response.result) console.log(response.result);
  } else {
    console.error('Error:', response.error);
    process.exitCode = 1;
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
