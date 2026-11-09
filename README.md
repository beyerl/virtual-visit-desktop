# Virtual Visit Desktop

[Virtual Visit](https://github.com/beyerl/virtual-visit) as a desktop app: Chromium with the
[Street View Gamepad](https://github.com/beyerl/street-view-gamepad) extension preinstalled. Both
are git submodules. For now this is Linux x64 only.

## Run it

Needs Node 22+, `unzip` and git.

```sh
git clone --recursive https://github.com/beyerl/virtual-visit-desktop.git
cd virtual-visit-desktop
npm ci
npm run setup   # downloads Chrome for Testing, unpacks the extension, copies the game into app/
npm start       # add -- --windowed for a normal window
```

Exit fullscreen with F11, close with Alt+F4. Extra Chromium flags go after a second `--`:
`npm start -- --windowed -- --enable-logging`.

The first visit to Google Maps may show Google's cookie consent page, once.

## A package to hand around

`npm run package` makes `dist/virtual-visit-desktop-<version>-linux-x64.tar.gz` (about 270 MB) with
its own Chromium and Node. Unpack it anywhere and run `./virtual-visit`.

## How it works

- **Chrome for Testing**, not Chrome: Chrome-branded builds no longer accept `--load-extension`.
  Electron lacks extension APIs that the extension needs (`offscreen`, `declarativeNetRequest`,
  `bookmarks`, `downloads`).
- **A local web server** on `127.0.0.1:47813` serves the game, since ES modules don't load from
  `file://`. The port is fixed because saves and settings belong to the origin. The extension's
  content script already runs on `127.0.0.1`.
- **`--app`** opens a window without tabs or an address bar. The extension's "Virtual Visit" bookmark
  folder still fills up, but this window has no way to open it.
- **`--autoplay-policy=no-user-gesture-required`** lets music, guides and ride videos play for a
  player who only uses the gamepad; browsers don't count a pad press as a user gesture.
- The browser profile is in `$XDG_DATA_HOME/virtual-visit-desktop/profile`
  (`~/.local/share/...` by default).

## Updating

Chrome for Testing doesn't update itself. Run `npm run setup` now and then for its security updates.
To take newer versions of the game and the extension:

```sh
git submodule update --remote && npm run setup
```

The app automates the Google Maps website. That's fine for personal use; review Google's terms
before distributing it publicly.
