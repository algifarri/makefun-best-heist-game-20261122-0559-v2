// A tiny deterministic generator (mulberry32) so staged scenes and any
// shuffled detail reproduce exactly from a seed. Gameplay itself uses fixed
// level data; this only feeds cosmetic jitter (sparkles, needle zones).
export function makeRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a generator. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one element from an array with a generator. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
