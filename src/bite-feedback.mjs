const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A quick opening followed by a softer close, driven only by confirmed bites.
export function biteAmount(bites, fishId, time) {
  let amount = 0;
  for (const bite of bites) {
    if (bite.fish !== fishId) continue;
    const age = time - bite.time;
    if (age < 0 || age >= .45) continue;
    amount = Math.max(amount, smooth(0, .08, age) * (1 - smooth(.12, .45, age)));
  }
  return amount;
}
