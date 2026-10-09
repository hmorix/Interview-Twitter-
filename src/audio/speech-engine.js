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

    // TTS configuration
    this.ttsRate = 0.88; // Slightly slower = more natural, human presenter pace
    this.ttsPitch = 1.0; // Natural conversational pitch
    this.ttsVolume = 1.0;
    this.voice = null;
    this.onVoiceChanged = null;

    // Silence detection for smart auto-advance
    this._lastSpeechTime = 0;
    this._silenceTimer = null;

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

  /**
   * Returns available English voices ranked from most natural/human to robotic
   */
  getAvailableVoices() {
    if (!this.hasTTS) return [];
    const all = speechSynthesis.getVoices();
    if (!all.length) return [];

    return all
      .filter(v => v.lang.startsWith('en'))
      .sort((a, b) => {
        const score = (v) => {
          let s = 0;
          const name = v.name.toLowerCase();
          // Tier 1: Microsoft Azure Neural voices (Edge/Windows) — ultra-realistic human quality
          if (name.includes('aria') || name.includes('jenny') || name.includes('guy')) s += 120;  // Top Azure Neural
          if (name.includes('natural') || name.includes('online')) s += 110;
          if (name.includes('neural')) s += 100;
          // Tier 2: Google Premium voices
          if (name.includes('google uk english female')) s += 80;
          if (name.includes('google us english')) s += 75;
          if (name.includes('google uk english male')) s += 70;
          if (name.includes('google')) s += 60;
          // Tier 3: Apple Enhanced macOS voices
          if (name.includes('enhanced')) s += 55;
          if (name.includes('samantha') || name.includes('karen') || name.includes('serena')) s += 45; // Apple
          if (name.includes('daniel') || name.includes('oliver') || name.includes('arthur')) s += 40; // Apple GB
          // Tier 4: Standard system voices
          if (name.includes('zira')) s += 20;  // Windows standard female
          if (name.includes('david')) s += 15;  // Windows standard male
          // Heavily deprioritize old robotic 1990s desktop synth voices
          if (name.includes('desktop')) s -= 80;
          if (name.includes('espeak') || name.includes('festival')) s -= 80;
          // Language preference
          if (v.lang === 'en-US') s += 12;
          if (v.lang === 'en-GB') s += 10;
          if (v.lang === 'en-AU' || v.lang === 'en-IN') s += 5;
          return s;
        };
        return score(b) - score(a);
      });
  }

  _pickVoice() {
    if (!this.hasTTS) return;
    const tryPick = () => {
      const voices = this.getAvailableVoices();
      if (!voices.length) return;

      const savedVoiceName = localStorage.getItem('prepsphere_selected_voice');
      if (savedVoiceName) {
        const match = voices.find(v => v.name === savedVoiceName);
        if (match) {
          this.voice = match;
          this.onVoiceChanged?.(this.voice);
          return;
        }
      }

      // Pick top-ranked natural voice
      this.voice = voices[0];
      this.onVoiceChanged?.(this.voice);
    };

    tryPick();
    if (this.hasTTS) speechSynthesis.onvoiceschanged = tryPick;
  }

  setVoiceByName(voiceName) {
    const voices = this.getAvailableVoices();
    const match = voices.find(v => v.name === voiceName);
    if (match) {
      this.voice = match;
      localStorage.setItem('prepsphere_selected_voice', voiceName);
      this.onVoiceChanged?.(this.voice);
      return true;
    }
    return false;
  }

  testVoicePreview(customText) {
    const phrase = customText || "Hello! I am your AI interviewer today. I am looking forward to discussing your technical background and experience.";
    this.speak(phrase);
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

  /**
   * Start listening for user's spoken answer.
   * @param {string} targetAnswer  — target text (for word tracking in teleprompter mode; pass '' for free answer)
   * @param {Function} [onLive]   — optional callback(liveText) fired on interim transcripts
   * @param {Function} [onMatch]  — optional callback({matched, total, done}) fired on word match updates
   */
  startListening(targetAnswer, onLive, onMatch) {
    if (!this.hasSR) {
      this.onError?.('✏ Type your answer below — Speech Recognition not available in this browser.');
      return;
    }

    // Override engine-level callbacks if provided directly (used by resume-studio free-answer mode)
    if (typeof onLive === 'function') this._localOnLive = onLive;
    else this._localOnLive = null;

    if (typeof onMatch === 'function') this._localOnMatch = onMatch;
    else this._localOnMatch = null;

    // Tokenize: clean and split target answer
    this.targetTokens = (targetAnswer || '')
      .toLowerCase()
      .replace(/[^\w\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    this.matchedSet.clear();
    this._completionFired = false;
    this._isRestarting = false;
    this.fullTranscript = '';
    this.isListening = true;
    this._lastSpeechTime = Date.now();

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

      // Mark that user has recently spoken (for silence detection)
      const hasActivity = interimText.trim() || newFinalText.trim();
      if (hasActivity) {
        this._lastSpeechTime = Date.now();
      }

      // Combine: what we've confirmed + what user is saying right now
      const combinedText = (this.fullTranscript + ' ' + interimText).trim();

      // Fire live transcript — prefer component-level callback, fall back to engine-level
      const liveText = interimText.trim() || newFinalText.trim();
      if (this._localOnLive) {
        // In free-answer mode (resume-studio simulation), deliver full accumulated text
        const accumulated = (this.fullTranscript + ' ' + interimText).trim();
        this._localOnLive(accumulated);
      }
      this.onLiveTranscript?.(liveText);

      // Tokenize spoken text
      const spokenTokens = combinedText
        .toLowerCase()
        .replace(/[^\w\s']/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

      // Fuzzy match against target (only meaningful when targetTokens are set)
      this.matchedSet = this._matchTokens(spokenTokens, this.targetTokens, this.matchedSet);

      const matched = this.matchedSet.size;
      const total = this.targetTokens.length;
      // 85% threshold — requires user to speak most of the answer before signaling completion
      // For free-answer mode (total === 0), never auto-complete via word match
      const done = !this._completionFired && total > 0 && matched >= Math.ceil(total * 0.85);

      // Fire match callback — prefer component-level, fall back to engine-level
      const matchPayload = { matched: Array.from(this.matchedSet), total, done };
      if (this._localOnMatch) {
        this._localOnMatch(matchPayload);
      }
      this.onWordMatch?.(matchPayload);

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
      // Continue listening without killing the mic so user can finish speaking smoothly
      if (this.isListening) {
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
    if (!this.isListening || this._isRestarting) return;
    this._isRestarting = true;
    setTimeout(() => {
      this._isRestarting = false;
      if (this.isListening) {
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
    this._localOnLive = null;
    this._localOnMatch = null;
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

      // Split long text into sentences for more natural delivery (avoids Chrome TTS cutoff bug)
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      let currentIdx = 0;

      const speakNext = () => {
        if (this._cancelTTS || currentIdx >= sentences.length) {
          if (!this._cancelTTS) {
            this.isSpeaking = false;
            this.onTTSEnd?.();
            onDone?.();
          }
          return;
        }

        const sentence = sentences[currentIdx++].trim();
        if (!sentence) { speakNext(); return; }

        const utt = new SpeechSynthesisUtterance(sentence);
        utt.rate = this.ttsRate;
        utt.pitch = this.ttsPitch;
        utt.volume = this.ttsVolume;
        if (this.voice) utt.voice = this.voice;

        if (currentIdx === 1) {
          utt.onstart = () => {
            if (this._cancelTTS) return;
            this.isSpeaking = true;
            this.onTTSStart?.();
          };
        }

        utt.onend = () => {
          if (this._cancelTTS) return;
          speakNext();
        };

        utt.onerror = (e) => {
          if (this._cancelTTS || e.error === 'canceled') return;
          speakNext(); // Skip problematic sentence, try next
        };

        speechSynthesis.speak(utt);
      };

      speakNext();

      // Chrome: resume if tab loses focus during TTS
      const check = setInterval(() => {
        if (!this.isSpeaking) { clearInterval(check); return; }
        if (speechSynthesis.paused) speechSynthesis.resume();
      }, 250);
    }, 80);
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
