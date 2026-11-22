// SABLE & GOLD — every sound is synthesised in code with WebAudio: no
// audio file is ever loaded. A tiny helper builds short oscillator blips,
// and each named cue composes one or two of them.
export function createSound() {
  const sound = {
    context: null,
    muted: false,
    ensure() {
      if (!this.context) {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
      }
      if (this.context.state === 'suspended') void this.context.resume();
      return true;
    },
    blip(freq, duration, type, volume, when = 0, slideTo = null) {
      if (this.muted || !this.ensure()) return;
      const now = this.context.currentTime + when;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(this.context.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    },
    pickup() { this.blip(880, 0.1, 'sine', 0.16); this.blip(1318, 0.14, 'sine', 0.14, 0.07); },
    gold() { this.blip(659, 0.1, 'triangle', 0.18); this.blip(988, 0.12, 'triangle', 0.16, 0.06); this.blip(1318, 0.18, 'triangle', 0.14, 0.12); },
    diamond() { [1046, 1318, 1568, 2093].forEach((f, i) => this.blip(f, 0.22, 'sine', 0.15, i * 0.08)); },
    keycard() { this.blip(520, 0.09, 'square', 0.08); this.blip(780, 0.12, 'square', 0.08, 0.08); },
    door() { this.blip(180, 0.25, 'sawtooth', 0.08, 0, 320); },
    coin() { this.blip(1568, 0.07, 'sine', 0.14); this.blip(1568, 0.07, 'sine', 0.1, 0.16); },
    alarm() { this.blip(440, 0.32, 'sawtooth', 0.14, 0, 880); this.blip(440, 0.32, 'sawtooth', 0.14, 0.34, 880); },
    laser() { this.blip(1200, 0.12, 'sawtooth', 0.1, 0, 300); },
    caught() { this.blip(330, 0.5, 'sawtooth', 0.16, 0, 110); },
    click() { this.blip(2000, 0.04, 'square', 0.07); },
    tumbler() { this.blip(1500, 0.05, 'square', 0.1); this.blip(2100, 0.08, 'square', 0.1, 0.05); },
    hack() { this.blip(700, 0.08, 'square', 0.07); this.blip(1050, 0.08, 'square', 0.07, 0.07); this.blip(1400, 0.12, 'square', 0.07, 0.14); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(f, 0.3, 'triangle', 0.15, i * 0.11)); },
    step() { this.blip(190, 0.04, 'sine', 0.05); },
    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    },
  };
  return sound;
}
