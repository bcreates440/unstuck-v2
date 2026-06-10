// Small random/format helpers shared by the activity rule set and the engine.
// Kept deliberately tiny — these produce the "novelty within constraints"
// by varying the specifics (counts, directions, durations) inside a template.
const U = {
  int(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  // pick N distinct items from arr
  sample(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  },
  dir() { return U.pick(['north', 'south', 'east', 'west', 'whatever direction feels right']); },
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};
