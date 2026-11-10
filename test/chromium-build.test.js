import { test } from "node:test";
import assert from "node:assert/strict";
import { nearestSnapshot } from "../scripts/chromium-build.js";

test("the Chromium snapshot is the newest one at or before stable's revision", () => {
  assert.equal(nearestSnapshot([1717300, 1717344, 1717358], 1717349), 1717344);
  assert.equal(nearestSnapshot([1717344, 1717300], 1717344), 1717344, "an exact match, in any order");
  assert.equal(nearestSnapshot([1717358], 1717349), null, "only newer ones: none");
  assert.equal(nearestSnapshot([], 1717349), null);
});
