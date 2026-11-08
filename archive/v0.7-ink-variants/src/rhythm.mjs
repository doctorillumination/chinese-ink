import { clamp } from './simulation-math.mjs';

// Each fish makes its own seeded, irregular changes in swimming intention.
// The locomotion model still decides how quickly its body can respond.
export class SwimRhythm {
  constructor(seed) {
    this.randomState = (seed ^ 0x9e3779b9) >>> 0 || 1;
    this.state = 'cruise';
    this.remaining = 1.8 + this.random() * 5.7;
    this.pace = 1;
    this.power = 1;
    this.tempo = 1;
    this.brake = 0;
    this.flutter = 0;
    this.goal = { pace: 1, power: 1, tempo: 1, brake: 0, flutter: 0 };
  }

  random() {
    let x = this.randomState;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.randomState = x >>> 0;
    return this.randomState / 4294967296;
  }

  transition() {
    if (this.state === 'flutter') this.state = 'coast';
    else if (this.state === 'quiet') this.state = 'flutter';
    else if (this.state === 'coast') this.state = 'cruise';
    else {
      const choice = this.random();
      this.state = choice < 0.60 ? 'flutter' : choice < 0.90 ? 'coast' : 'quiet';
    }
    const variation = this.random();
    if (this.state === 'cruise') {
      this.remaining = 3.0 + this.random() * 5.0;
      this.goal = { pace: 0.98 + variation * 0.05, power: 1, tempo: 1, brake: 0, flutter: 0 };
    } else if (this.state === 'flutter') {
      this.remaining = 0.65 + this.random() * 0.45;
      this.goal = { pace: 1.32 + variation * 0.16, power: 1, tempo: 1.55 + variation * 0.15, brake: 0, flutter: 1 };
    } else if (this.state === 'coast') {
      this.remaining = 1.6 + this.random() * 1.8;
      this.goal = { pace: 0.84 + variation * 0.14, power: 0.22 + variation * 0.12, tempo: 0.80, brake: 0, flutter: 0 };
    } else {
      this.remaining = 2.0 + this.random() * 1.5;
      this.goal = { pace: 0.10 + variation * 0.12, power: 0.025, tempo: 0.60, brake: 0.23, flutter: 0 };
    }
  }

  step(dt, amount) {
    this.remaining -= dt;
    if (this.remaining <= 0) this.transition();
    const attack = this.state === 'flutter' ? 7 : 2.6;
    for (const key of ['pace', 'power', 'tempo', 'brake', 'flutter']) this[key] += (this.goal[key] - this[key]) * (1 - Math.exp(-attack * dt));
    const strength = clamp(amount, 0, 1);
    return {
      pace: 1 + (this.pace - 1) * strength,
      power: 1 + (this.power - 1) * strength,
      tempo: 1 + (this.tempo - 1) * strength,
      brake: this.brake * strength,
      flutter: this.flutter * strength,
    };
  }
}
