/**
 * PrepSphere Studio — Main Controller
 *
 * FLOW (per question):
 *  1. App loads track, renders dialogue cards
 *  2. User must click the MIC button (or press Space) to START
 *     → openMic() runs (triggers browser permission dialog if first time)
 *  3. App speaks the question via TTS
 *  4. When TTS ends → recognition starts automatically
 *  5. User speaks the red answer → words turn green
 *  6. 85% matched → success → 2s delay → next question
 *
 * If browser doesn't support Speech Recognition, a TYPE MODE input appears
 * so the user can still practice by typing the answer.
 */

import './styles/main.css';
import { INITIAL_QUESTS } from './data/questions.js';
import { SpeechEngine } from './audio/speech-engine.js';
import { Teleprompter } from './components/teleprompter.js';
import { QuestCreator } from './components/quest-creator.js';
import { ResumeStudio } from './components/resume-studio.js';

// App states
const STATE = {
  IDLE: 'idle',
  MIC_NEEDED: 'mic_needed',   // waiting for first user click
  TTS: 'tts',                 // speaking the question
  LISTENING: 'listening',     // listening to user
  SUCCESS: 'success',         // matched — showing result
  DONE: 'done'                // track finished
};

class AppController {
  constructor() {
    this.engine = new SpeechEngine();
    this.currentTrack = null;
    this.currentIndex = 0;
    this.autoAdvance = true;
    this._state = STATE.IDLE;
    this._micEverOpened = false;
    this._advanceTimer = null;

    // DOM refs
    this.navTabs = document.querySelectorAll('.nav-tab-btn');
    this.teleprompterStage = document.getElementById('teleprompterStage');
    this.creatorStage = document.getElementById('creatorStage');
    this.resumeStage = document.getElementById('resumeStage');
    this.floatingDock = document.querySelector('.floating-bottom-dock');
    this.dialogueStream = document.getElementById('dialogueStream');
    this.questContextPill = document.getElementById('questContextPill');
    this.questContextTitle = document.getElementById('questContextTitle');
    this.trackSubSelector = document.getElementById('trackSubSelector');
    this.startBanner = document.getElementById('startBanner');
    this.typeModeRow = document.getElementById('typeModeRow');
    this.typeInput = document.getElementById('typeInput');
    this.typeSubmitBtn = document.getElementById('typeSubmitBtn');

    // Dock
    this.statusBadge = document.getElementById('statusBadge');
    this.statusText = document.getElementById('statusText');
    this.progressCounter = document.getElementById('progressCounter');
    this.btnCenterMic = document.getElementById('btnCenterMic');
    this.micPulseRing = document.getElementById('micPulseRing');
    this.btnHearQuestion = document.getElementById('btnHearQuestion');
    this.btnHearAnswer = document.getElementById('btnHearAnswer');
    this.btnNextDialogue = document.getElementById('btnNextDialogue');
    this.btnAutoAdvanceToggle = document.getElementById('btnAutoAdvanceToggle');
    this.matchedCountEl = document.getElementById('matchedCount');
    this.liveTranscriptEl = document.getElementById('liveTranscript');

    this.teleprompter = new Teleprompter(
      this.dialogueStream,
      (idx) => this.goToIndex(idx)
    );
    this.creator = new QuestCreator(
      this.creatorStage,
      (quest) => this._onCustomQuestStart(quest)
    );
    this.resumeStudio = new ResumeStudio(
      this.resumeStage,
      this.engine,
      (quest) => this._onCustomQuestStart(quest)
    );

    this._setupEngineCallbacks();
    this._setupEventListeners();

    // Load first track — voices may not be ready yet, that's fine
    this._loadTrack(INITIAL_QUESTS.individual[0]);
    this._renderSubSelector('individual');
    this.creator.render();

    // Show "Click mic to begin" banner
    this._setState(STATE.MIC_NEEDED);
  }

  // ─── STATE MACHINE ────────────────────────────────────────────────────────

  _setState(s) {
    this._state = s;
    this.btnCenterMic.dataset.state = s;

    // Visual ring
    const ringActive = s === STATE.LISTENING;
    this.micPulseRing.classList.toggle('active', ringActive);
    if (!ringActive) this.micPulseRing.style.transform = 'scale(1)';

    // Mic button appearance
    this.btnCenterMic.classList.remove('speaking-state', 'listening-active', 'success-state');
    if (s === STATE.TTS) this.btnCenterMic.classList.add('speaking-state');
    if (s === STATE.LISTENING) this.btnCenterMic.classList.add('listening-active');
    if (s === STATE.SUCCESS) this.btnCenterMic.classList.add('success-state');

    // Status badge
    const badgeClass = {
      [STATE.IDLE]: 'idle',
      [STATE.MIC_NEEDED]: 'idle',
      [STATE.TTS]: 'speaking',
      [STATE.LISTENING]: 'listening',
      [STATE.SUCCESS]: 'success',
      [STATE.DONE]: 'success'
    }[s] || 'idle';
    this.statusBadge.className = `status-badge ${badgeClass}`;

    // Status text
    const msg = {
      [STATE.IDLE]: 'Ready — click the mic to begin',
      [STATE.MIC_NEEDED]: '👆 Click the mic button to begin',
      [STATE.TTS]: '🔊 Listen carefully to the question...',
      [STATE.LISTENING]: '🎤 Speak the answer aloud — take your time',
      [STATE.SUCCESS]: '✅ Great! Moving to next in a moment...',
      [STATE.DONE]: '🎉 Track complete! Great work!'
    }[s] || '';
    this.statusText.textContent = msg;

    // Start banner
    if (this.startBanner) {
      this.startBanner.style.display = s === STATE.MIC_NEEDED ? 'flex' : 'none';
    }
  }

  // ─── ENGINE CALLBACKS ─────────────────────────────────────────────────────

  _setupEngineCallbacks() {
    this.engine.onVolume = (vol) => {
      if (this._state === STATE.LISTENING) {
        const s = 1 + vol * 1.4;
        this.micPulseRing.style.transform = `scale(${s})`;
        this.micPulseRing.classList.toggle('active', vol > 0.03);
      }
    };

    this.engine.onTTSStart = () => this._setState(STATE.TTS);
    this.engine.onTTSEnd = () => {
      // Only transition if we're still in TTS state (not manually interrupted)
      if (this._state === STATE.TTS) {
        this._beginListening();
      }
    };

    this.engine.onLiveTranscript = (text) => {
      if (this.liveTranscriptEl && text) {
        this.liveTranscriptEl.textContent = `"${text}"`;
        this.liveTranscriptEl.style.opacity = '1';
        // Fade out after 2.5s of silence
        clearTimeout(this._transcriptFadeTimer);
        this._transcriptFadeTimer = setTimeout(() => {
          if (this.liveTranscriptEl) this.liveTranscriptEl.style.opacity = '0';
        }, 2500);
      }
    };

    this.engine.onWordMatch = ({ matched, total, done }) => {
      this.teleprompter.updateMatchedWords(matched);
      if (this.matchedCountEl) {
        this.matchedCountEl.textContent = total > 0
          ? `${matched.length} / ${total} words`
          : '';
      }

      if (done && this._state === STATE.LISTENING) {
        this._setState(STATE.SUCCESS);
        this.engine.stopListening();
        if (this.liveTranscriptEl) this.liveTranscriptEl.style.opacity = '0';

        if (this.autoAdvance) {
          if (this._advanceTimer) clearTimeout(this._advanceTimer);

          // Wait for silence: poll until user hasn't spoken for 2.5s, then advance
          const waitForSilenceAndAdvance = () => {
            const silenceDuration = Date.now() - (this.engine._lastSpeechTime || 0);
            if (silenceDuration < 2500) {
              // User recently spoke — keep waiting
              this._advanceTimer = setTimeout(waitForSilenceAndAdvance, 400);
            } else {
              // User is truly done — advance
              this._advanceTimer = null;
              if (this._state === STATE.SUCCESS) this._nextQuestion();
            }
          };

          // Give at least 2.5s before even checking (time for the ding + brief pause)
          this._advanceTimer = setTimeout(waitForSilenceAndAdvance, 2500);
        }
      }
    };

    this.engine.onError = (msg) => {
      this.statusText.textContent = msg;
      // Show type-mode if SR not available
      if (msg.includes('Type mode') || msg.includes('not available') || msg.includes('denied')) {
        this._showTypeMode();
      }
    };

    this.engine.onMicReady = (ok) => {
      if (ok) {
        this._micEverOpened = true;
        // Proceed with current question TTS
        this._speakCurrentQuestion();
      } else {
        this._setState(STATE.IDLE);
        this._showTypeMode();
      }
    };
  }

  // ─── TRACK & STEP CONTROL ────────────────────────────────────────────────

  _loadTrack(track) {
    if (!track?.dialogues?.length) return;
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }

    this.engine.stopSpeaking();
    this.engine.stopListening();

    this.currentTrack = track;
    this.currentIndex = 0;
    this.questContextPill.textContent = track.target || track.category;
    this.questContextTitle.textContent = track.title;

    this.teleprompter.setDialogues(track.dialogues, 0);
    this._updateProgress();
    this._hideTypeMode();

    if (this._micEverOpened) {
      // Mic already open — start immediately
      this._speakCurrentQuestion();
    } else {
      this._setState(STATE.MIC_NEEDED);
    }
  }

  _speakCurrentQuestion() {
    const item = this.currentTrack?.dialogues[this.currentIndex];
    if (!item) return;

    this.engine.stopListening();
    this.teleprompter.setCurrentIndex(this.currentIndex);
    this.teleprompter.updateMatchedWords([]);
    this._updateProgress();
    if (this.matchedCountEl) this.matchedCountEl.textContent = '';
    if (this.liveTranscriptEl) { this.liveTranscriptEl.textContent = ''; this.liveTranscriptEl.style.opacity = '0'; }
    this._hideTypeMode();
    this._setState(STATE.TTS);

    this.engine.speak(item.question, () => {
      // onDone callback: start listening
      if (this._state === STATE.TTS) this._beginListening();
    });
  }

  _beginListening() {
    if (!this.engine.hasSR) {
      this._showTypeMode();
      this._setState(STATE.LISTENING);
      return;
    }
    const item = this.currentTrack?.dialogues[this.currentIndex];
    if (!item) return;
    this._setState(STATE.LISTENING);
    this.engine.startListening(item.answer);
  }

  _nextQuestion() {
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
    const next = this.currentIndex + 1;
    if (next < this.currentTrack.dialogues.length) {
      this.currentIndex = next;
      this._speakCurrentQuestion();
    } else {
      this._setState(STATE.DONE);
      this.engine.stopListening();
    }
  }

  goToIndex(idx) {
    if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
    this.engine.stopSpeaking();
    this.engine.stopListening();
    this.currentIndex = idx;

    if (this._micEverOpened) {
      this._speakCurrentQuestion();
    } else {
      this.teleprompter.setCurrentIndex(idx);
      this._updateProgress();
      this._setState(STATE.MIC_NEEDED);
    }
  }

  // ─── MIC BUTTON (primary user action) ────────────────────────────────────

  async _onMicClick() {
    this.engine.playClick();

    if (this._state === STATE.MIC_NEEDED || this._state === STATE.IDLE || this._state === STATE.DONE) {
      // First click — open mic (triggers browser permission dialog)
      this._setState(STATE.TTS); // show "thinking" while mic opens
      this.statusText.textContent = '⏳ Requesting mic access...';
      await this.engine.openMic();
      // onMicReady callback handles the rest
      return;
    }

    if (this._state === STATE.LISTENING) {
      // Pause listening
      this.engine.stopListening();
      this._setState(STATE.IDLE);
      this.statusText.textContent = '⏸ Paused — click mic to resume';
      return;
    }

    if (this._state === STATE.TTS) {
      // Skip TTS, go straight to listening
      this.engine.stopSpeaking();
      this._beginListening();
      return;
    }

    if (this._state === STATE.IDLE) {
      // Resume current question
      this._speakCurrentQuestion();
      return;
    }

    if (this._state === STATE.SUCCESS) {
      // Manual advance
      this._nextQuestion();
      return;
    }
  }

  // ─── TYPE MODE (SR unavailable fallback) ─────────────────────────────────

  _showTypeMode() {
    if (this.typeModeRow) {
      this.typeModeRow.style.display = 'flex';
      if (this.typeInput) {
        this.typeInput.value = '';
        this.typeInput.placeholder = 'Type your answer here and press Submit...';
        this.typeInput.focus();
      }
    }
  }

  _hideTypeMode() {
    if (this.typeModeRow) this.typeModeRow.style.display = 'none';
    if (this.typeInput) this.typeInput.value = '';
  }

  _submitTypedAnswer() {
    const typed = this.typeInput?.value?.trim();
    if (!typed) return;
    // Process typed answer through the engine's matching
    const tokens = typed.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
    this.engine.matchedSet = this.engine._matchTokens(tokens, this.engine.targetTokens, this.engine.matchedSet);
    const matched = Array.from(this.engine.matchedSet);
    const total = this.engine.targetTokens.length;
    const done = total > 0 && matched.length >= Math.ceil(total * 0.60);
    this.engine.onWordMatch?.({ matched, total, done });
    if (done && !this.engine._completionFired) {
      this.engine._completionFired = true;
      this.engine._playDing();
    }
    this.typeInput.value = '';
  }

  // ─── UI HELPERS ───────────────────────────────────────────────────────────

  _updateProgress() {
    const total = this.currentTrack?.dialogues.length || 0;
    if (this.progressCounter) {
      this.progressCounter.textContent = `${this.currentIndex + 1} / ${total}`;
    }
  }

  _renderSubSelector(mode) {
    if (!this.trackSubSelector) return;
    const tracks = INITIAL_QUESTS[mode] || [];
    this.trackSubSelector.innerHTML = tracks.map((t, i) =>
      `<option value="${i}">${t.title}</option>`
    ).join('');
    this.trackSubSelector.style.display = tracks.length > 1 ? 'inline-block' : 'none';
  }

  _onCustomQuestStart(quest) {
    this.teleprompterStage.style.display = 'flex';
    this.creatorStage.style.display = 'none';
    this.resumeStage.style.display = 'none';
    if (this.floatingDock) this.floatingDock.style.display = 'block';
    this.navTabs.forEach(t => t.classList.remove('active'));
    const indTab = Array.from(this.navTabs).find(t => t.dataset.view === 'individual');
    if (indTab) indTab.classList.add('active');
    if (this.trackSubSelector) this.trackSubSelector.style.display = 'none';
    this._loadTrack(quest);
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────

  _setupEventListeners() {
    // Navigation tabs
    this.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const view = tab.dataset.view;

        if (this._advanceTimer) { clearTimeout(this._advanceTimer); this._advanceTimer = null; }
        this.engine.stopSpeaking();
        this.engine.stopListening();

        if (view === 'individual') {
          this.teleprompterStage.style.display = 'flex';
          this.creatorStage.style.display = 'none';
          this.resumeStage.style.display = 'none';
          if (this.floatingDock) this.floatingDock.style.display = 'block';
          this._renderSubSelector('individual');
          this._loadTrack(INITIAL_QUESTS.individual[0]);
        } else if (view === 'business') {
          this.teleprompterStage.style.display = 'flex';
          this.creatorStage.style.display = 'none';
          this.resumeStage.style.display = 'none';
          if (this.floatingDock) this.floatingDock.style.display = 'block';
          this._renderSubSelector('business');
          this._loadTrack(INITIAL_QUESTS.business[0]);
        } else if (view === 'resume') {
          this.teleprompterStage.style.display = 'none';
          this.creatorStage.style.display = 'none';
          this.resumeStage.style.display = 'flex';
          if (this.floatingDock) this.floatingDock.style.display = 'none';
          if (this.trackSubSelector) this.trackSubSelector.style.display = 'none';
          this.resumeStudio.render();
        } else if (view === 'creator') {
          this.teleprompterStage.style.display = 'none';
          this.creatorStage.style.display = 'block';
          this.resumeStage.style.display = 'none';
          if (this.floatingDock) this.floatingDock.style.display = 'none';
          if (this.trackSubSelector) this.trackSubSelector.style.display = 'none';
          this.creator.render();
        }
      });
    });

    // Sub-track selector
    this.trackSubSelector?.addEventListener('change', (e) => {
      const activeTab = document.querySelector('.nav-tab-btn.active');
      const view = activeTab?.dataset.view;
      const idx = parseInt(e.target.value, 10);
      const track = INITIAL_QUESTS[view]?.[idx];
      if (track) {
        this.engine.stopSpeaking();
        this.engine.stopListening();
        this._loadTrack(track);
      }
    });

    // Central mic button
    this.btnCenterMic.addEventListener('click', () => this._onMicClick());

    // Hear Question
    this.btnHearQuestion.addEventListener('click', () => {
      const item = this.currentTrack?.dialogues[this.currentIndex];
      if (!item) return;
      this.engine.stopListening();
      this._setState(STATE.TTS);
      this.engine.speak(item.question, () => {
        if (this._micEverOpened) this._beginListening();
        else this._setState(STATE.MIC_NEEDED);
      });
    });

    // Hear Answer (model reads it, then user repeats)
    this.btnHearAnswer.addEventListener('click', () => {
      const item = this.currentTrack?.dialogues[this.currentIndex];
      if (!item) return;
      this.engine.stopListening();
      this._setState(STATE.TTS);
      this.statusText.textContent = '🔊 Listen to the model answer...';
      this.engine.speak(item.answer, () => {
        if (this._micEverOpened) {
          this.statusText.textContent = '🎤 Now repeat it yourself!';
          this._beginListening();
        } else {
          this._setState(STATE.MIC_NEEDED);
        }
      });
    });

    // Next
    this.btnNextDialogue.addEventListener('click', () => this._nextQuestion());

    // Auto-advance toggle
    this.btnAutoAdvanceToggle.addEventListener('click', () => {
      this.autoAdvance = !this.autoAdvance;
      this.btnAutoAdvanceToggle.textContent = `Auto: ${this.autoAdvance ? 'ON' : 'OFF'}`;
      this.btnAutoAdvanceToggle.style.color = this.autoAdvance
        ? 'var(--accent-green)'
        : 'var(--text-muted)';
    });

    // Type mode submit
    this.typeSubmitBtn?.addEventListener('click', () => this._submitTypedAnswer());
    this.typeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._submitTypedAnswer();
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); this._onMicClick(); }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); this._nextQuestion(); }
    });

    // Start banner click
    this.startBanner?.addEventListener('click', () => this._onMicClick());
  }
}

window.addEventListener('DOMContentLoaded', () => new AppController());
