// Which Chromium build setup downloads. Chromium has no release channels of
// its own, only snapshots of single commits, so this takes the snapshot
// closest to the commit current stable Chrome was branched from: the same
// milestone as stable Chrome, rather than whatever landed today.

const STABLE = "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json";
const SNAPSHOTS = "https://www.googleapis.com/storage/v1/b/chromium-browser-snapshots/o";

/** Snapshot folders, by @puppeteer/browsers platform. */
const FOLDER = { linux: "Linux_x64", linux_arm: "Linux_x64", mac: "Mac", mac_arm: "Mac_Arm", win32: "Win", win64: "Win_x64" };

/**
 * The newest snapshot at or before the stable revision.
 * @param {number[]} snapshots @param {number} stable @returns {number | null}
 */
export function nearestSnapshot(snapshots, stable) {
  const before = snapshots.filter((r) => r <= stable);
  return before.length ? Math.max(...before) : null;
}

/** @param {string} url */
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * The snapshot revision to install for a platform, or null if none was found.
 * @param {string} platform @returns {Promise<{ revision: string, milestone: string } | null>}
 */
export async function stableChromiumBuild(platform) {
  const { version, revision } = (await getJson(STABLE)).channels.Stable;
  const stable = Number(revision);
  const folder = FOLDER[/** @type {keyof typeof FOLDER} */ (platform)];
  // Listing by a shared prefix of the revision keeps the answer small; one
  // digit fewer if the closest snapshots fall just before a round number.
  for (const digits of [3, 4]) {
    const prefix = `${folder}/${String(stable).slice(0, -digits)}`;
    const { prefixes = [] } = await getJson(`${SNAPSHOTS}?delimiter=/&fields=prefixes&prefix=${prefix}`);
    const found = nearestSnapshot(
      prefixes.map((/** @type {string} */ p) => Number(p.split("/")[1])),
      stable,
    );
    if (found) return { revision: String(found), milestone: version.split(".")[0] };
  }
  return null;
}
