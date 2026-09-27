/**
 * Web Audio API procedural sound engine for Self-Haul ritual.
 * Operates without external audio files, with dynamic frequency synthesis
 * and zero reliance on network-fetched MP3s.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;

  public init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch {
        console.warn('Web Audio API not supported');
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.05, this.ctx.currentTime, 0.2);
    }
  }

  public startAmbientDrone() {
    // Continuous background drone disabled per user request
    return;
  }

  // Crisp tactile button click feedback sound (randomly selects from sound 1, 2, 3, or 4)
  public playButtonClickSound() {
    if (this.isMuted) return;
    this.init();

    const buttonSounds = [
      '/media/audio/button-sound.mp3',
      '/media/audio/soundbutton2.mp3',
      '/media/audio/soundbutton3.mp3',
      '/media/audio/soundbutton4.mp3',
    ];

    const randomSound = buttonSounds[Math.floor(Math.random() * buttonSounds.length)];

    try {
      const audio = new Audio(randomSound);
      audio.volume = 0.75;
      audio.play().catch(() => {
        this.playSynthClickSound();
      });
    } catch (e) {
      this.playSynthClickSound();
    }
  }

  // Fallback procedural synth click sound
  private playSynthClickSound() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      
      // High frequency click attack
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(1200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.04);

      // Warm tone body
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(440, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(180, now + 0.09);
      bodyGain.gain.setValueAtTime(0.3, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.ctx.destination);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.09);
    } catch (e) {
      console.warn('Synth click error', e);
    }
  }

  // Custom audio file sound (button-sound.mp3) specifically for text box Enter submit
  public playEnterKeySound() {
    if (this.isMuted) return;
    this.init();

    try {
      const audio = new Audio('/media/audio/button-sound.mp3');
      audio.volume = 0.8;
      audio.play().catch(() => {
        this.playButtonClickSound();
      });
    } catch (e) {
      this.playButtonClickSound();
    }
  }

  // Soothing breathing mode toggle chime
  public playBreathingSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.22);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Breathing sound error', e);
    }
  }

  // Plays a clean, gentle click/pop sound when question is swallowed
  public playSwallowSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.15);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Swallow sound error', e);
    }
  }

  // Electric crackle arc sound
  public playLightningCrackle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200 + Math.random() * 800, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch (e) {
      console.warn('Crackle sound error', e);
    }
  }

  // Clean sound for portal convergence impact
  public playImpactBoom() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Boom sound error', e);
    }
  }

  // Soft airy chord for portal reveal & higher self state
  public playAstralChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const freqs = [220, 277.18, 329.63, 440, 554.37]; // A major 9th spectral pad
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.1;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 2.5);
      });
    } catch (e) {
      console.warn('Astral chime error', e);
    }
  }
}

export const soundEngine = typeof window !== 'undefined' ? new SoundEngine() : ({} as SoundEngine);

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    soundEngine.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}
