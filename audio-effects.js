/**
 * Audio Engine: Web Audio API Sound FX + Web Speech API (TTS & Speech Recognition)
 * Zero external audio files required — all sounds generated via native AudioContext.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.ttsEnabled = true;
    this.currentUtterance = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 440, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio FX error:', e);
    }
  }

  playRecordStart() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playRecordStop() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(390, now + 0.16);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playSuccessChime() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chord
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + (idx * 0.08);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      });
    } catch (e) {}
  }

  playTick() {
    this.playBeep(880, 'sine', 0.04, 0.02);
  }

  speak(text, onStart, onEnd) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }
    this.stopSpeaking();
    if (!this.ttsEnabled) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;
    utterance.rate = 1.0;
    utterance.pitch = 1.02;

    // Pick best English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('English')) && v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onStart) utterance.onstart = onStart;
    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }
}

// Visualizer helper for audio waves
class AudioWaveVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.isActive = false;
    this.animationId = null;
    this.phase = 0;
    this.barsCount = 28;
  }

  start(mode = 'recording') {
    if (!this.canvas || !this.ctx) return;
    this.isActive = true;
    this.mode = mode;
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  animate() {
    if (!this.isActive) return;
    this.clear();
    const width = this.canvas.width;
    const height = this.canvas.height;
    const barWidth = 3;
    const gap = (width - (this.barsCount * barWidth)) / (this.barsCount - 1);
    
    this.phase += 0.08;

    for (let i = 0; i < this.barsCount; i++) {
      let amp = 0;
      if (this.mode === 'recording') {
        amp = (Math.sin(this.phase + i * 0.4) * 0.4 + Math.sin(this.phase * 1.5 + i * 0.2) * 0.3 + 0.3);
      } else {
        amp = (Math.sin(this.phase * 0.8 + i * 0.3) * 0.35 + 0.25);
      }
      amp = Math.max(0.08, Math.min(0.95, amp));
      const barHeight = height * amp;
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      // Clean tech gradient: Emerald/Cyan when recording, Indigo/Blue when speaking
      const grad = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
      if (this.mode === 'recording') {
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(1, '#059669');
      } else {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, '#6366f1');
      }

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, barWidth, barHeight, 2);
      this.ctx.fill();
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

window.soundEngine = new SoundEngine();
