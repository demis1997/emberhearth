/** Sound architecture with placeholder Web Audio beeps */

type SoundId =
  | 'buy'
  | 'sell'
  | 'refresh'
  | 'freeze'
  | 'upgrade'
  | 'attack'
  | 'shield'
  | 'death'
  | 'summon'
  | 'victory'
  | 'defeat'
  | 'coin'
  | 'click'
  | 'triple';

const FREQ: Record<SoundId, number> = {
  buy: 440,
  sell: 330,
  refresh: 520,
  freeze: 280,
  upgrade: 660,
  attack: 200,
  shield: 800,
  death: 150,
  summon: 500,
  victory: 700,
  defeat: 120,
  coin: 900,
  click: 400,
  triple: 750,
};

class SoundManager {
  private ctx: AudioContext | null = null;
  master = 0.7;
  music = 0.4;
  effects = 0.7;
  enabled = true;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  play(id: SoundId): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = FREQ[id];
    osc.type = id === 'attack' || id === 'death' ? 'sawtooth' : 'sine';
    const vol = this.master * this.effects * 0.08;
    gain.gain.value = vol;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  setVolumes(master: number, music: number, effects: number): void {
    this.master = master;
    this.music = music;
    this.effects = effects;
  }
}

export const soundManager = new SoundManager();
