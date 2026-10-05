/**
 * PrepSphere Studio - Core Application Logic
 * Manages interview tracks, voice dictation, timer, benchmark reveals, and readiness reports.
 */

(function() {
  'use strict';

  // --- App State ---
  const state = {
    currentTrack: null,
    currentQuestionIndex: 0,
    sessionStartTime: null,
    questionStartTime: null,
    timerInterval: null,
    timeRemainingSeconds: 90,
    isRecordingVoice: false,
    recognitionInstance: null,
    userResponses: [], // array of { questionId, questionTitle, responseText, timeTaken, rating, matchedKeywords, totalKeywords }
    waveVisualizer: null
  };

  // --- DOM Elements ---
  const views = {
    setup: document.getElementById('viewSetup'),
    interview: document.getElementById('viewInterview'),
    summary: document.getElementById('viewSummary')
  };

  // Header & Controls
  const brandHomeBtn = document.getElementById('brandHomeBtn');
  const btnTtsToggle = document.getElementById('btnTtsToggle');
  const btnSoundToggle = document.getElementById('btnSoundToggle');
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const themeIcon = document.getElementById('themeIcon');

  // Track selection
  const tracksGrid = document.getElementById('tracksGrid');

  // Interview Room
  const questionStepPill = document.getElementById('questionStepPill');
  const activeTrackTitle = document.getElementById('activeTrackTitle');
  const timerDisplay = document.getElementById('timerDisplay');
  const timerText = document.getElementById('timerText');
  const sessionProgressFill = document.getElementById('sessionProgressFill');
  const btnExitSession = document.getElementById('btnExitSession');

  // Question Card
  const interviewerDot = document.getElementById('interviewerDot');
  const interviewerStateBadge = document.getElementById('interviewerStateBadge');
  const difficultyTag = document.getElementById('difficultyTag');
  const categoryTag = document.getElementById('categoryTag');
  const questionHeading = document.getElementById('questionHeading');
  const questionInterviewerHint = document.getElementById('questionInterviewerHint');
  const btnReplayQuestion = document.getElementById('btnReplayQuestion');

  // Candidate Response Card
  const candidateResponseInput = document.getElementById('candidateResponseInput');
  const wordCountDisplay = document.getElementById('wordCountDisplay');
  const speechStatusHint = document.getElementById('speechStatusHint');
  const btnMicToggle = document.getElementById('btnMicToggle');
  const micBtnText = document.getElementById('micBtnText');
  const waveCanvas = document.getElementById('waveCanvas');
  const btnClearResponse = document.getElementById('btnClearResponse');
  const btnSubmitResponse = document.getElementById('btnSubmitResponse');
  const answeringActionsRow = document.getElementById('answeringActionsRow');

  // Benchmark Reveal Card
  const benchmarkRevealContainer = document.getElementById('benchmarkRevealContainer');
  const submittedTextDisplay = document.getElementById('submittedTextDisplay');
  const submittedWordCount = document.getElementById('submittedWordCount');
  const btnListenModelAnswer = document.getElementById('btnListenModelAnswer');
  const modelSummaryCallout = document.getElementById('modelSummaryCallout');
  const starSituationText = document.getElementById('starSituationText');
  const starTaskText = document.getElementById('starTaskText');
  const starActionText = document.getElementById('starActionText');
  const starResultText = document.getElementById('starResultText');
  const keywordsMatchStats = document.getElementById('keywordsMatchStats');
  const keywordsChipsContainer = document.getElementById('keywordsChipsContainer');
  const positivePointsList = document.getElementById('positivePointsList');
  const redFlagsList = document.getElementById('redFlagsList');
  const starRatingGroup = document.getElementById('starRatingGroup');
  const btnRetryQuestion = document.getElementById('btnRetryQuestion');
  const btnProceedNext = document.getElementById('btnProceedNext');

  // Summary View
  const finalScoreVal = document.getElementById('finalScoreVal');
  const summaryHeadlineText = document.getElementById('summaryHeadlineText');
  const summarySubtext = document.getElementById('summarySubtext');
  const statSessionTime = document.getElementById('statSessionTime');
  const statQuestionsCount = document.getElementById('statQuestionsCount');
  const statKeywordMatchRate = document.getElementById('statKeywordMatchRate');
  const statAvgWords = document.getElementById('statAvgWords');
  const accordionReviewList = document.getElementById('accordionReviewList');
  const btnDownloadReport = document.getElementById('btnDownloadReport');
  const btnPrintReport = document.getElementById('btnPrintReport');
  const btnRestartPractice = document.getElementById('btnRestartPractice');

  // --- Initialize App ---
  function init() {
    initThemes();
    initTracksGrid();
    initSpeechRecognition();
    setupEventListeners();
    state.waveVisualizer = new AudioWaveVisualizer(waveCanvas);
  }

  // --- Themes & Audio Toggles ---
  function initThemes() {
    const savedTheme = localStorage.getItem('prepsphere_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const savedSound = localStorage.getItem('prepsphere_sound') !== 'false';
    window.soundEngine.soundEnabled = savedSound;
    btnSoundToggle.classList.toggle('active', savedSound);

    const savedTts = localStorage.getItem('prepsphere_tts') !== 'false';
    window.soundEngine.ttsEnabled = savedTts;
    btnTtsToggle.classList.toggle('active', savedTts);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('prepsphere_theme', nextTheme);
    updateThemeIcon(nextTheme);
    window.soundEngine.playBeep(600, 'sine', 0.08, 0.04);
  }

  function updateThemeIcon(theme) {
    if (theme === 'light') {
      themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    } else {
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      `;
    }
  }

  // --- Render Track Selection Grid ---
  function initTracksGrid() {
    tracksGrid.innerHTML = '';
    INTERVIEW_TRACKS.forEach(track => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.dataset.trackId = track.id;

      let badgeClass = 'high-impact';
      if (track.badge === 'Popular') badgeClass = 'popular';
      if (track.badge === 'Quick Practice') badgeClass = 'quick';

      card.innerHTML = `
        <div>
          <div class="track-header">
            <div class="track-icon-wrapper">
              ${track.icon}
            </div>
            <span class="track-badge ${badgeClass}">${track.badge}</span>
          </div>

          <div class="track-category">${track.category}</div>
          <h3 class="track-title">${track.title}</h3>
          <p class="track-description">${track.description}</p>
        </div>

        <div class="track-footer">
          <div class="track-meta">
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ~${track.estMinutes} mins
            </span>
            <span class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              ${track.questions.length} questions
            </span>
          </div>

          <span class="track-start-action">
            Start Practice &rarr;
          </span>
        </div>
      `;

      card.addEventListener('click', () => startTrack(track));
      tracksGrid.appendChild(card);
    });
  }

  // --- Switch Views ---
  function switchView(viewName) {
    views.setup.style.display = viewName === 'setup' ? 'block' : 'none';
    views.interview.style.display = viewName === 'interview' ? 'block' : 'none';
    views.summary.style.display = viewName === 'summary' ? 'block' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Start Interview Session ---
  function startTrack(track) {
    state.currentTrack = track;
    state.currentQuestionIndex = 0;
    state.userResponses = [];
    state.sessionStartTime = Date.now();

    window.soundEngine.init();
    window.soundEngine.playBeep(520, 'triangle', 0.18, 0.08);

    activeTrackTitle.textContent = track.title;
    switchView('interview');
    loadQuestion(0);
  }

  // --- Load Specific Question ---
  function loadQuestion(index) {
    if (!state.currentTrack || index >= state.currentTrack.questions.length) {
      finishSession();
      return;
    }

    state.currentQuestionIndex = index;
    const question = state.currentTrack.questions[index];
    state.questionStartTime = Date.now();

    // Reset previous inputs & views
    stopVoiceRecording();
    clearInterval(state.timerInterval);
    candidateResponseInput.value = '';
    candidateResponseInput.readOnly = false;
    candidateResponseInput.classList.remove('readonly');
    wordCountDisplay.textContent = '0 words';
    speechStatusHint.textContent = 'Microphone ready or type directly';
    answeringActionsRow.style.display = 'flex';
    benchmarkRevealContainer.style.display = 'none';

    // Clear star rating selections
    document.querySelectorAll('#starRatingGroup .rating-star-btn').forEach(btn => btn.classList.remove('selected'));

    // Update Question Card UI
    const totalQ = state.currentTrack.questions.length;
    questionStepPill.textContent = `Question ${index + 1} of ${totalQ}`;
    const progressPercent = Math.round(((index) / totalQ) * 100);
    sessionProgressFill.style.width = `${progressPercent}%`;

    difficultyTag.textContent = question.difficulty;
    categoryTag.textContent = question.category;
    questionHeading.textContent = question.title;
    questionInterviewerHint.textContent = `Evaluation Focus: ${question.interviewerContext}`;

    // Setup Timer
    state.timeRemainingSeconds = question.recommendedTimeSeconds || 90;
    updateTimerDisplay();
    startTimer();

    // Voice Question Narration
    narrateCurrentQuestion();
  }

  function narrateCurrentQuestion() {
    const question = state.currentTrack.questions[state.currentQuestionIndex];
    if (!question) return;

    interviewerDot.classList.add('speaking');
    interviewerStateBadge.textContent = 'Speaking...';
    state.waveVisualizer.start('speaking');

    window.soundEngine.speak(question.title, () => {
      // on start
      interviewerDot.classList.add('speaking');
      interviewerStateBadge.textContent = 'Speaking...';
    }, () => {
      // on end
      interviewerDot.classList.remove('speaking');
      interviewerStateBadge.textContent = 'Listening';
      if (!state.isRecordingVoice) {
        state.waveVisualizer.stop();
      }
    });
  }

  // --- Countdown Timer ---
  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.timeRemainingSeconds--;
      updateTimerDisplay();

      if (state.timeRemainingSeconds <= 15 && state.timeRemainingSeconds > 0) {
        timerDisplay.classList.add('urgent');
        timerDisplay.classList.remove('warning');
        window.soundEngine.playTick();
      } else if (state.timeRemainingSeconds <= 30) {
        timerDisplay.classList.add('warning');
      } else {
        timerDisplay.classList.remove('warning', 'urgent');
      }

      if (state.timeRemainingSeconds <= 0) {
        clearInterval(state.timerInterval);
        submitResponse(true); // auto-submit on time expiration
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(Math.max(0, state.timeRemainingSeconds) / 60);
    const secs = Math.max(0, state.timeRemainingSeconds) % 60;
    timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // --- Speech Recognition (Voice Dictation) ---
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speechStatusHint.textContent = 'Speech recognition not supported in this browser. Please type responses.';
      btnMicToggle.title = 'Speech Recognition unavailable; use keyboard';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      state.isRecordingVoice = true;
      btnMicToggle.classList.add('recording');
      micBtnText.textContent = 'Stop Dictating';
      speechStatusHint.textContent = 'Listening live... speak clearly';
      interviewerDot.classList.add('speaking');
      interviewerStateBadge.textContent = 'Recording';
      state.waveVisualizer.start('recording');
      window.soundEngine.playRecordStart();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript.trim()) {
        const currentVal = candidateResponseInput.value.trim();
        candidateResponseInput.value = currentVal ? `${currentVal} ${finalTranscript.trim()}` : finalTranscript.trim();
        updateWordCount();
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopVoiceRecording();
      speechStatusHint.textContent = `Dictation paused (${event.error}). You can type directly.`;
    };

    recognition.onend = () => {
      stopVoiceRecording();
    };

    state.recognitionInstance = recognition;
  }

  function toggleVoiceRecording() {
    if (!state.recognitionInstance) {
      alert('Speech Recognition is not supported by your current browser. You can type your answers directly in the response area.');
      return;
    }

    if (state.isRecordingVoice) {
      state.recognitionInstance.stop();
      stopVoiceRecording();
    } else {
      window.soundEngine.stopSpeaking();
      try {
        state.recognitionInstance.start();
      } catch (err) {
        console.warn('Recognition start exception:', err);
      }
    }
  }

  function stopVoiceRecording() {
    state.isRecordingVoice = false;
    btnMicToggle.classList.remove('recording');
    micBtnText.textContent = 'Record Voice';
    speechStatusHint.textContent = 'Microphone ready or type directly';
    interviewerDot.classList.remove('speaking');
    interviewerStateBadge.textContent = 'Interviewer';
    state.waveVisualizer.stop();
  }

  function updateWordCount() {
    const text = candidateResponseInput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCountDisplay.textContent = `${count} word${count === 1 ? '' : 's'}`;
  }

  // --- Submit Response & Reveal Benchmark (The Core User Flow) ---
  function submitResponse(isTimeout = false) {
    const userText = candidateResponseInput.value.trim();
    if (!userText && !isTimeout) {
      const confirmEmpty = confirm("You haven't entered an answer yet. Would you like to submit and examine the benchmark model answer anyway?");
      if (!confirmEmpty) return;
    }

    // Stop all recording & audio
    clearInterval(state.timerInterval);
    if (state.isRecordingVoice && state.recognitionInstance) {
      state.recognitionInstance.stop();
    }
    stopVoiceRecording();
    window.soundEngine.stopSpeaking();
    window.soundEngine.playSuccessChime();

    // Lock candidate textarea
    candidateResponseInput.readOnly = true;
    candidateResponseInput.classList.add('readonly');
    answeringActionsRow.style.display = 'none';

    // Populate the frozen user answer card
    const displayText = userText || "(No verbal or typed response provided before submission)";
    submittedTextDisplay.textContent = displayText;
    const wordsCount = userText ? userText.split(/\s+/).length : 0;
    submittedWordCount.textContent = `${wordsCount} words`;

    // Populate Model Answer & Benchmark Data
    const question = state.currentTrack.questions[state.currentQuestionIndex];
    const model = question.modelAnswer;

    modelSummaryCallout.textContent = model.executiveSummary;
    starSituationText.textContent = model.starBreakdown.situation;
    starTaskText.textContent = model.starBreakdown.task;
    starActionText.textContent = model.starBreakdown.action;
    starResultText.textContent = model.starBreakdown.result;

    // Automated Keyword Matching Check
    const matchedKeywords = renderKeywordAnalysis(question.keywords, userText);

    // Render Winning Points & Red Flags
    renderInsightsList(positivePointsList, model.essentialPoints);
    renderInsightsList(redFlagsList, model.redFlagsToAvoid);

    // Save record to state
    const timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);
    const existingIndex = state.userResponses.findIndex(r => r.questionId === question.id);
    const responseRecord = {
      questionId: question.id,
      questionTitle: question.title,
      responseText: displayText,
      timeTaken: timeSpent,
      rating: 3, // default rating until clicked
      matchedKeywords: matchedKeywords.length,
      totalKeywords: question.keywords.length,
      category: question.category
    };

    if (existingIndex >= 0) {
      state.userResponses[existingIndex] = responseRecord;
    } else {
      state.userResponses.push(responseRecord);
    }

    // Smoothly Reveal the Benchmark stage
    benchmarkRevealContainer.style.display = 'flex';
    
    // Auto scroll so the user can begin reading the benchmark immediately
    setTimeout(() => {
      benchmarkRevealContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  // Keyword Analysis: Checks user response against standard keywords
  function renderKeywordAnalysis(keywords, userResponseText) {
    keywordsChipsContainer.innerHTML = '';
    const lowerText = (userResponseText || '').toLowerCase();
    const matched = [];

    keywords.forEach(keyword => {
      // Clean keyword for search (handle phrases and slashes)
      const cleanWord = keyword.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      const tokens = cleanWord.split(/\s+/);
      const isMatch = tokens.some(token => token.length > 2 && lowerText.includes(token));

      if (isMatch) matched.push(keyword);

      const chip = document.createElement('span');
      chip.className = `keyword-chip ${isMatch ? 'matched' : 'missed'}`;
      chip.innerHTML = `
        ${isMatch ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        ${keyword}
      `;
      keywordsChipsContainer.appendChild(chip);
    });

    keywordsMatchStats.textContent = `${matched.length} of ${keywords.length} core concepts covered in your answer`;
    return matched;
  }

  function renderInsightsList(container, items) {
    container.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      container.appendChild(li);
    });
  }

  // --- Model Answer Audio Playback ---
  function listenToModelAnswer() {
    const question = state.currentTrack.questions[state.currentQuestionIndex];
    if (!question) return;
    const model = question.modelAnswer;
    const textToSpeak = `${model.executiveSummary}. In the situation: ${model.starBreakdown.situation}. The key action taken was: ${model.starBreakdown.action}. The measurable outcome was: ${model.starBreakdown.result}`;

    btnListenModelAnswer.classList.add('active');
    btnListenModelAnswer.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      Stop Audio
    `;

    window.soundEngine.speak(textToSpeak, null, () => {
      btnListenModelAnswer.classList.remove('active');
      btnListenModelAnswer.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        Listen to Model
      `;
    });
  }

  // --- Self-Rating Handler ---
  function handleRatingClick(ratingVal) {
    const stars = document.querySelectorAll('#starRatingGroup .rating-star-btn');
    stars.forEach(s => {
      const starRating = parseInt(s.dataset.rating, 10);
      s.classList.toggle('selected', starRating <= ratingVal);
    });

    const question = state.currentTrack.questions[state.currentQuestionIndex];
    const record = state.userResponses.find(r => r.questionId === question.id);
    if (record) {
      record.rating = ratingVal;
    }
    window.soundEngine.playBeep(640, 'sine', 0.1, 0.05);
  }

  // --- Proceed to Next Question ---
  function proceedToNextQuestion() {
    window.soundEngine.stopSpeaking();
    window.soundEngine.playBeep(480, 'triangle', 0.12, 0.06);

    const nextIndex = state.currentQuestionIndex + 1;
    if (nextIndex < state.currentTrack.questions.length) {
      loadQuestion(nextIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finishSession();
    }
  }

  // --- Retry Current Question ---
  function retryCurrentQuestion() {
    window.soundEngine.stopSpeaking();
    window.soundEngine.playBeep(400, 'triangle', 0.1, 0.05);
    loadQuestion(state.currentQuestionIndex);
  }

  // --- Finish Session & Display Final Report ---
  function finishSession() {
    clearInterval(state.timerInterval);
    window.soundEngine.stopSpeaking();
    window.soundEngine.playSuccessChime();

    // Calculate Final Performance Stats
    const totalQuestions = state.currentTrack.questions.length;
    const answeredCount = state.userResponses.length;
    const sessionDurationSeconds = Math.round((Date.now() - state.sessionStartTime) / 1000);
    const durationMins = Math.floor(sessionDurationSeconds / 60);
    const durationSecs = sessionDurationSeconds % 60;

    statSessionTime.textContent = `${String(durationMins).padStart(2, '0')}m ${String(durationSecs).padStart(2, '0')}s`;
    statQuestionsCount.textContent = `${answeredCount} / ${totalQuestions}`;

    // Keyword coverage rate across all questions
    let totalKeywordsCount = 0;
    let totalMatchedKeywords = 0;
    let totalWordsCount = 0;
    let totalRatings = 0;

    state.userResponses.forEach(r => {
      totalKeywordsCount += r.totalKeywords || 1;
      totalMatchedKeywords += r.matchedKeywords || 0;
      const words = r.responseText.split(/\s+/).length;
      totalWordsCount += words;
      totalRatings += (r.rating || 3);
    });

    const keywordRate = totalKeywordsCount > 0 ? Math.round((totalMatchedKeywords / totalKeywordsCount) * 100) : 75;
    statKeywordMatchRate.textContent = `${keywordRate}%`;

    const avgWords = answeredCount > 0 ? Math.round(totalWordsCount / answeredCount) : 0;
    statAvgWords.textContent = `${avgWords} words`;

    // Composite Readiness Score (combines keyword coverage + user rating confidence)
    const ratingConfidence = answeredCount > 0 ? ((totalRatings / (answeredCount * 5)) * 100) : 75;
    const compositeScore = Math.min(98, Math.max(45, Math.round((keywordRate * 0.45) + (ratingConfidence * 0.45) + 10)));
    finalScoreVal.textContent = `${compositeScore}%`;

    if (compositeScore >= 85) {
      summaryHeadlineText.textContent = "Executive Interview Ready!";
      summarySubtext.textContent = "Outstanding performance. Your articulation, structured STAR pacing, and essential concept coverage demonstrate high seniority.";
    } else if (compositeScore >= 70) {
      summaryHeadlineText.textContent = "Strong Competitive Performance";
      summarySubtext.textContent = "Solid interview delivery. Review the benchmark points below to tighten your measurable results and keyword density.";
    } else {
      summaryHeadlineText.textContent = "Foundational Practice Complete";
      summarySubtext.textContent = "Good rehearsal sprint. Dedicate extra time to review the official model answers below to strengthen your talking points.";
    }

    // Render Accordion Review of All Questions
    renderAccordionReview();

    switchView('summary');
  }

  function renderAccordionReview() {
    accordionReviewList.innerHTML = '';

    state.currentTrack.questions.forEach((q, idx) => {
      const userResp = state.userResponses.find(r => r.questionId === q.id) || {
        responseText: '(No response recorded)',
        matchedKeywords: 0,
        rating: 0
      };

      const item = document.createElement('div');
      item.className = 'accordion-item';

      const stars = '★'.repeat(userResp.rating || 3) + '☆'.repeat(5 - (userResp.rating || 3));

      item.innerHTML = `
        <button class="accordion-trigger" data-index="${idx}">
          <div class="accordion-question-title">
            <span class="step-indicator-pill">Q${idx + 1}</span>
            <span>${q.title}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: #fbbf24; font-size: 0.9rem;">${stars}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </button>

        <div class="accordion-body" id="accordionBody${idx}">
          <div style="margin-bottom: 16px;">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #38bdf8; margin-bottom: 6px;">Your Recorded Answer:</div>
            <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.6; border: 1px solid var(--border-subtle);">${userResp.responseText}</div>
          </div>

          <div>
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #10b981; margin-bottom: 6px;">Official Benchmark Answer:</div>
            <div style="background: var(--bg-surface); padding: 14px 16px; border-radius: var(--radius-md); font-size: 0.95rem; line-height: 1.6; border: 1px solid var(--border-subtle);">
              <p style="margin-bottom: 10px; font-weight: 600;">${q.modelAnswer.executiveSummary}</p>
              <p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>S:</strong> ${q.modelAnswer.starBreakdown.situation}</p>
              <p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>T:</strong> ${q.modelAnswer.starBreakdown.task}</p>
              <p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>A:</strong> ${q.modelAnswer.starBreakdown.action}</p>
              <p style="font-size: 0.9rem; color: var(--text-secondary);"><strong>R:</strong> ${q.modelAnswer.starBreakdown.result}</p>
            </div>
          </div>
        </div>
      `;

      const trigger = item.querySelector('.accordion-trigger');
      const body = item.querySelector('.accordion-body');
      trigger.addEventListener('click', () => {
        body.classList.toggle('open');
      });

      accordionReviewList.appendChild(item);
    });
  }

  // --- Export Report as Markdown ---
  function downloadPracticeReport() {
    if (!state.currentTrack) return;
    const now = new Date().toLocaleString();
    let md = `# PrepSphere Interview Practice Report\n`;
    md += `**Track:** ${state.currentTrack.title}\n`;
    md += `**Date:** ${now}\n`;
    md += `**Readiness Score:** ${finalScoreVal.textContent}\n`;
    md += `**Total Questions:** ${state.currentTrack.questions.length}\n\n`;
    md += `---\n\n`;

    state.currentTrack.questions.forEach((q, idx) => {
      const resp = state.userResponses.find(r => r.questionId === q.id);
      md += `### Question ${idx + 1}: ${q.title}\n`;
      md += `**Category:** ${q.category} | **Difficulty:** ${q.difficulty}\n\n`;
      md += `#### Your Answer:\n${resp ? resp.responseText : '(Not answered)'}\n\n`;
      md += `#### Official Benchmark Model Answer:\n`;
      md += `*${q.modelAnswer.executiveSummary}*\n\n`;
      md += `- **Situation:** ${q.modelAnswer.starBreakdown.situation}\n`;
      md += `- **Task:** ${q.modelAnswer.starBreakdown.task}\n`;
      md += `- **Action:** ${q.modelAnswer.starBreakdown.action}\n`;
      md += `- **Result:** ${q.modelAnswer.starBreakdown.result}\n\n`;
      md += `**Essential Keywords:** ${q.keywords.join(', ')}\n\n`;
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Interview_Practice_${state.currentTrack.id}_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Header controls
    brandHomeBtn.addEventListener('click', () => {
      if (views.interview.style.display !== 'none') {
        const exit = confirm('Return to track selection? Your current session will end.');
        if (!exit) return;
      }
      clearInterval(state.timerInterval);
      window.soundEngine.stopSpeaking();
      switchView('setup');
    });

    btnThemeToggle.addEventListener('click', toggleTheme);

    btnSoundToggle.addEventListener('click', () => {
      window.soundEngine.soundEnabled = !window.soundEngine.soundEnabled;
      btnSoundToggle.classList.toggle('active', window.soundEngine.soundEnabled);
      localStorage.setItem('prepsphere_sound', window.soundEngine.soundEnabled);
      if (window.soundEngine.soundEnabled) {
        window.soundEngine.playBeep(700, 'sine', 0.1, 0.05);
      }
    });

    btnTtsToggle.addEventListener('click', () => {
      window.soundEngine.ttsEnabled = !window.soundEngine.ttsEnabled;
      btnTtsToggle.classList.toggle('active', window.soundEngine.ttsEnabled);
      localStorage.setItem('prepsphere_tts', window.soundEngine.ttsEnabled);
      if (!window.soundEngine.ttsEnabled) {
        window.soundEngine.stopSpeaking();
      }
    });

    btnExitSession.addEventListener('click', () => {
      const exit = confirm('Exit this practice session and return to track selection?');
      if (exit) {
        clearInterval(state.timerInterval);
        stopVoiceRecording();
        window.soundEngine.stopSpeaking();
        switchView('setup');
      }
    });

    // Question interaction
    btnReplayQuestion.addEventListener('click', narrateCurrentQuestion);

    // Candidate response interactions
    candidateResponseInput.addEventListener('input', updateWordCount);

    btnMicToggle.addEventListener('click', toggleVoiceRecording);

    btnClearResponse.addEventListener('click', () => {
      candidateResponseInput.value = '';
      updateWordCount();
      window.soundEngine.playBeep(350, 'sine', 0.08, 0.04);
    });

    btnSubmitResponse.addEventListener('click', () => submitResponse(false));

    // Benchmark card controls
    btnListenModelAnswer.addEventListener('click', listenToModelAnswer);

    starRatingGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.rating-star-btn');
      if (btn) {
        const val = parseInt(btn.dataset.rating, 10);
        handleRatingClick(val);
      }
    });

    btnRetryQuestion.addEventListener('click', retryCurrentQuestion);
    btnProceedNext.addEventListener('click', proceedToNextQuestion);

    // Summary buttons
    btnDownloadReport.addEventListener('click', downloadPracticeReport);
    btnPrintReport.addEventListener('click', () => window.print());
    btnRestartPractice.addEventListener('click', () => switchView('setup'));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Alt + Enter to submit response
      if (e.altKey && e.key === 'Enter') {
        if (views.interview.style.display !== 'none' && answeringActionsRow.style.display !== 'none') {
          submitResponse(false);
        } else if (benchmarkRevealContainer.style.display !== 'none') {
          proceedToNextQuestion();
        }
      }
      // Esc to stop audio/dictation
      if (e.key === 'Escape') {
        window.soundEngine.stopSpeaking();
        if (state.isRecordingVoice) {
          state.recognitionInstance.stop();
        }
      }
    });
  }

  // Bootstrapping
  window.addEventListener('DOMContentLoaded', init);
})();
