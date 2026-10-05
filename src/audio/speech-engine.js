/**
 * PrepSphere — Bulletproof Speech Engine
 *
 * Strategy for Vercel deployment (static HTTPS site, no backend):
 *  - Uses Web Speech API (built into Chrome/Edge — works on HTTPS)
 *  - interimResults = TRUE → live word highlights while user speaks
 *  - Recognition restarts INSTANTLY on every end/error (no gaps)
 *  - Fuzzy matching with Levenshtein distance → understands even mispronounced words
 *  - Shows live transcript so user can see what's being recognized
 *  - Threshold: 60% → much more forgiving than before
 *  - Falls back gracefully: shows typed input if SR not available
 */

export class SpeechEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.analyserNode = null;
    this.rafId = null;

    // State
    this.isMicOpen = false;
    this.isListening = false;
    this.isSpeaking = false;
    this._completionFired = false;
    this._cancelTTS = false;
    this._isRestarting = false;

    // Recognition
    this.recognition = null;
    this.targetTokens = [];
    this.matchedSet = new Set();
    this.fullTranscript = '';     // cumulative transcript across restarts

    // TTS
    this.ttsRate = 0.88;
    this.ttsPitch = 1.0;
    this.voice = null;

    // Support flags
    this.hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.hasTTS = 'speechSynthesis' in window;

    // Callbacks
    this.onVolume = null;          // (0..1)
    this.onTTSStart = null;        // ()
    this.onTTSEnd = null;          // ()
    this.onWordMatch = null;       // ({ matched, total, done, liveText })
    this.onError = null;           // (string)
    this.onMicReady = null;        // (supported: bool)
    this.onLiveTranscript = null;  // (string) — called with interim text as user speaks

    this._pickVoice();
  }

  // ─── VOICE SELECTION ─────────────────────────────────────────────────────

  _pickVoice() {
    if (!this.hasTTS) return;
    const tryPick = () => {
      const all = speechSynthesis.getVoices();
      if (!all.length) return;
      this.voice = (
        all.find(v => /Google UK English Female|Google US English|Natural|Samantha|Karen/i.test(v.name) && v.lang.startsWith('en')) ||
        all.find(v => v.lang === 'en-US') ||
        all.find(v => v.lang.startsWith('en')) ||
        all[0]
      );
    };
    tryPick();
    if (this.hasTTS) speechSynthesis.onvoiceschanged = tryPick;
  }

  // ─── AUDIO CONTEXT & MICROPHONE ──────────────────────────────────────────

  async openMic() {
    if (this.isMicOpen) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !this.audioCtx) this.audioCtx = new AC();
      if (this.audioCtx?.state === 'suspended') await this.audioCtx.resume();
    } catch (_) {}

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (this.audioCtx) {
        const src = this.audioCtx.createMediaStreamSource(this.micStream);
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 512;
        this.analyserNode.smoothingTimeConstant = 0.65;
        src.connect(this.analyserNode);
      }
      this.isMicOpen = true;
      this._monitorVolume();
      this.onMicReady?.(true);
      return true;
    } catch (err) {
      this.onMicReady?.(false);
      this.onError?.('⚠ Microphone blocked. Allow mic access and refresh the page.');
      return false;
    }
  }

  _monitorVolume() {
    const buf = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);
    const loop = () => {
      if (!this.isMicOpen || !this.analyserNode) return;
      this.analyserNode.getByteFrequencyData(buf);
      const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
      this.onVolume?.(Math.min(1, avg / 55));
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  closeMic() {
    this.isMicOpen = false;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.micStream?.getTracks().forEach(t => t.stop());
    this.micStream = null;
    this.analyserNode = null;
    this.onVolume?.(0);
  }

  // ─── FUZZY WORD MATCHING ─────────────────────────────────────────────────

  /**
   * Levenshtein distance between two strings.
   * Measures how different two words are (0 = identical).
   */
  _levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Returns true if spoken word is "close enough" to target.
   * Allows up to 2 edit-distance errors for longer words.
   */
  _fuzzyMatch(spoken, target) {
    if (!spoken || !target) return false;
    if (spoken === target) return true;

    // Short words: exact or 1 error allowed
    const minLen = Math.min(spoken.length, target.length);
    if (minLen <= 4) return spoken === target || this._levenshtein(spoken, target) <= 1;

    // Medium words: up to 2 errors
    if (minLen <= 8) return this._levenshtein(spoken, target) <= 2;

    // Long words: up to 30% error tolerance
    return this._levenshtein(spoken, target) <= Math.floor(minLen * 0.3);
  }

  /**
   * Match a list of spoken tokens against the target tokens.
   * Returns Set of matched target indices.
   */
  _matchTokens(spokenTokens, targetTokens, existingSet) {
    const result = new Set(existingSet);
    const usedSpoken = new Set();

    targetTokens.forEach((target, tIdx) => {
      if (result.has(tIdx)) return; // already matched

      for (let sIdx = 0; sIdx < spokenTokens.length; sIdx++) {
        if (usedSpoken.has(sIdx)) continue;
        if (this._fuzzyMatch(spokenTokens[sIdx], target)) {
          result.add(tIdx);
          usedSpoken.add(sIdx);
          break;
        }
      }
    });

    return result;
  }

  // ─── SPEECH RECOGNITION ──────────────────────────────────────────────────

  startListening(targetAnswer) {
    if (!this.hasSR) {
      this.onError?.('✏ Type your answer below — Speech Recognition not available in this browser.');
      return;
    }

    // Tokenize: clean and split target answer
    this.targetTokens = targetAnswer
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    this.matchedSet.clear();
    this._completionFired = false;
    this._isRestarting = false;
    this.fullTranscript = '';
    this.isListening = true;

    this._launchRecognition();
  }

  _launchRecognition() {
    if (!this.isListening || this._isRestarting) return;
    this._killRecognition();

    const RC = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new RC();

    r.continuous = true;
    r.interimResults = true;   // ← LIVE feedback as user speaks
    r.lang = 'en-US';
    r.maxAlternatives = 3;

    r.onresult = (event) => {
      if (!this.isListening) return;

      let interimText = '';
      let newFinalText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Collect all alternatives for better matching
          for (let a = 0; a < Math.min(result.length, 3); a++) {
            newFinalText += ' ' + result[a].transcript;
          }
        } else {
          interimText += result[0].transcript + ' ';
        }
      }

      // Update full cumulative transcript with new final text
      if (newFinalText.trim()) {
        this.fullTranscript += ' ' + newFinalText.trim();
      }

      // Combine: what we've confirmed + what user is saying right now
      const combinedText = (this.fullTranscript + ' ' + interimText).trim();

      // Send live text to UI
      this.onLiveTranscript?.(interimText.trim() || newFinalText.trim());

      // Tokenize spoken text
      const spokenTokens = combinedText
        .toLowerCase()
        .replace(/[^\w\s']/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      // Fuzzy match against target
      this.matchedSet = this._matchTokens(spokenTokens, this.targetTokens, this.matchedSet);

      const matched = this.matchedSet.size;
      const total = this.targetTokens.length;
      // 60% threshold — much more forgiving, closer to real conversation
      const done = !this._completionFired && total > 0 && matched >= Math.ceil(total * 0.60);

      this.onWordMatch?.({ matched: Array.from(this.matchedSet), total, done });

      if (done && !this._completionFired) {
        this._completionFired = true;
        this._playDing();
      }
    };

    r.onerror = (e) => {
      if (!this.isListening) return;
      if (e.error === 'aborted') return; // we aborted it intentionally

      if (['not-allowed', 'service-not-allowed'].includes(e.error)) {
        this.isListening = false;
        this.onError?.('🔒 Mic permission denied. Click the lock icon in your browser address bar and allow microphone.');
        return;
      }

      // no-speech, network, audio-capture — just restart immediately
      this._scheduleRestart(250);
    };

    r.onend = () => {
      // CRITICAL: restart immediately on any end so there's no silent gap
      if (this.isListening && !this._completionFired) {
        this._scheduleRestart(150);
      }
    };

    try {
      r.start();
      this.recognition = r;
    } catch (err) {
      this._scheduleRestart(400);
    }
  }

  _scheduleRestart(ms) {
    if (!this.isListening || this._completionFired || this._isRestarting) return;
    this._isRestarting = true;
    setTimeout(() => {
      this._isRestarting = false;
      if (this.isListening && !this._completionFired) {
        this._launchRecognition();
      }
    }, ms);
  }

  _killRecognition() {
    if (!this.recognition) return;
    try {
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onresult = null;
      this.recognition.abort();
    } catch (_) {}
    this.recognition = null;
  }

  stopListening() {
    this.isListening = false;
    this._completionFired = false;
    this._isRestarting = false;
    this.fullTranscript = '';
    this._killRecognition();
    this.matchedSet.clear();
  }

  // ─── TEXT-TO-SPEECH ───────────────────────────────────────────────────────

  speak(text, onDone) {
    if (!this.hasTTS) { onDone?.(); return; }
    this._cancelTTS = true;
    speechSynthesis.cancel();
    this.isSpeaking = false;

    setTimeout(() => {
      this._cancelTTS = false;
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = this.ttsRate;
      utt.pitch = this.ttsPitch;
      if (this.voice) utt.voice = this.voice;

      utt.onstart = () => {
        if (this._cancelTTS) return;
        this.isSpeaking = true;
        this.onTTSStart?.();
      };

      utt.onend = () => {
        if (this._cancelTTS) return;
        this.isSpeaking = false;
        this.onTTSEnd?.();
        onDone?.();
      };

      utt.onerror = (e) => {
        if (this._cancelTTS || e.error === 'canceled') return;
        this.isSpeaking = false;
        this.onTTSEnd?.();
        onDone?.();
      };

      speechSynthesis.speak(utt);

      // Chrome: resume if tab loses focus
      const check = setInterval(() => {
        if (!this.isSpeaking) { clearInterval(check); return; }
        if (speechSynthesis.paused) speechSynthesis.resume();
      }, 250);
    }, 100);
  }

  stopSpeaking() {
    this._cancelTTS = true;
    if (this.hasTTS) speechSynthesis.cancel();
    this.isSpeaking = false;
  }

  // ─── SOUND EFFECTS ────────────────────────────────────────────────────────

  _playDing() {
    try {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      [[523, 0.00], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([freq, t]) => {
        const now = this.audioCtx.currentTime + t;
        const o = this.audioCtx.createOscillator();
        const g = this.audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.08, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        o.connect(g); g.connect(this.audioCtx.destination);
        o.start(now); o.stop(now + 0.5);
      });
    } catch (_) {}
  }

  playClick() {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
      const t = this.audioCtx.currentTime;
      const o = this.audioCtx.createOscillator();
      const g = this.audioCtx.createGain();
      o.frequency.setValueAtTime(900, t);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(g); g.connect(this.audioCtx.destination);
      o.start(t); o.stop(t + 0.05);
    } catch (_) {}
  }
}
