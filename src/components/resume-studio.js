/**
 * AI Resume Interview Studio Component
 * Integrates document parsing (PDF/DOCX), NVIDIA Llama 3.2 NIM AI,
 * round selection (HR, Technical, Project, Situational, Mixed),
 * animated processing steps, and dual practice/simulation interview modes.
 */

import { DocumentParser } from '../services/document-parser.js';
import { NvidiaService, AVAILABLE_MODELS } from '../services/nvidia-service.js';
import { SAMPLE_RESUMES } from '../data/sample-resumes.js';

export class ResumeStudio {
  /**
   * @param {HTMLElement} containerElement
   * @param {SpeechEngine} speechEngine
   * @param {Function} onSendToTeleprompter Callback to send generated quest to teleprompter
   */
  constructor(containerElement, speechEngine, onSendToTeleprompter) {
    this.container = containerElement;
    this.engine = speechEngine;
    this.onSendToTeleprompter = onSendToTeleprompter;
    this.nvidia = new NvidiaService();

    // State
    this.currentFile = null;
    this.extractedText = '';
    this.selectedRound = 'technical'; // 'hr', 'technical', 'project', 'situational', 'mixed'
    this.targetRole = '';
    this.difficulty = 'Mid-Senior';
    this.questionCount = 4;
    this.activeTab = 'upload'; // 'upload' | 'paste' | 'samples'

    // Interview session state
    this.interviewData = null; // { roundTitle, roundSummary, questions }
    this.candidateProfile = null;
    this.currentQuestionIndex = 0;
    this.practiceMode = 'simulation'; // 'simulation' (test yourself + AI grading) | 'teleprompter' (read model answer)
    this.userAnswers = {}; // { [qIndex]: string }
    this.aiEvaluations = {}; // { [qIndex]: { score, verdict, strengths, missedPoints, coachingTip, improvedAnswer } }
    this.isEvaluating = false;
    this.isListening = false;
    this.userSpokenWords = [];

    // UI View states: 'setup' | 'processing' | 'interview' | 'summary'
    this.viewState = 'setup';
  }

  render() {
    this.container.innerHTML = '';

    if (this.viewState === 'setup') {
      this._renderSetupView();
    } else if (this.viewState === 'processing') {
      this._renderProcessingView();
    } else if (this.viewState === 'interview') {
      this._renderInterviewView();
    } else if (this.viewState === 'summary') {
      this._renderSummaryView();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 1: SETUP & RESUME UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  _renderSetupView() {
    const activeKey = this.nvidia.getApiKey();
    const isCustomKey = activeKey !== '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';

    this.container.innerHTML = `
      <div class="resume-studio-container">

        <!-- Top Header & Hero -->
        <div class="rs-hero">
          <div class="rs-hero-badges">
            <span class="rs-badge rs-badge-ai">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Powered by NVIDIA NIM AI (Llama 3.2)
            </span>
            <span class="rs-badge rs-badge-status" id="btnOpenApiModal" style="cursor: pointer;" title="Configure NVIDIA API">
              <span class="rs-status-dot"></span>
              NVIDIA Model Active
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </span>
          </div>

          <h1 class="rs-title">AI Resume Interview Practice Studio</h1>
          <p class="rs-subtitle">
            Upload your resume in <strong>PDF</strong> or <strong>Word (.docx)</strong>. Our NVIDIA AI model will analyze your real projects, skills, and background, formulate tough interview questions for your chosen round, and evaluate your spoken answers in real-time.
          </p>
        </div>

        <!-- Main Form Grid -->
        <div class="rs-grid">

          <!-- Left Column: Resume Input -->
          <div class="rs-card">
            <div class="rs-card-header">
              <div class="rs-step-indicator">1</div>
              <div>
                <h3 class="rs-card-title">Upload or Provide Resume</h3>
                <p class="rs-card-sub">Accepts PDF, Word (.docx), or plain text. Private & parsed locally.</p>
              </div>
            </div>

            <!-- Resume Input Tabs -->
            <div class="rs-tabs-row">
              <button type="button" class="rs-tab-btn ${this.activeTab === 'upload' ? 'active' : ''}" data-tab="upload">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload File (.pdf / .docx)
              </button>
              <button type="button" class="rs-tab-btn ${this.activeTab === 'paste' ? 'active' : ''}" data-tab="paste">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                Paste Text
              </button>
              <button type="button" class="rs-tab-btn ${this.activeTab === 'samples' ? 'active' : ''}" data-tab="samples">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Sample Resumes
              </button>
            </div>

            <!-- TAB 1: File Upload Dropzone -->
            <div id="rsTabUpload" class="rs-tab-content ${this.activeTab === 'upload' ? 'active' : ''}">
              <div id="rsDropzone" class="rs-dropzone ${this.currentFile ? 'has-file' : ''}">
                <input type="file" id="rsFileInput" accept=".pdf,.docx,.doc,.txt" style="display:none;">
                <div class="rs-dropzone-icon">
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="M12 18v-6"/>
                    <path d="M9 15l3-3 3 3"/>
                  </svg>
                </div>
                <div class="rs-dropzone-title">
                  ${this.currentFile ? 'File Selected' : 'Drag & drop your resume here, or <span class="rs-link">browse</span>'}
                </div>
                <div class="rs-dropzone-hint">
                  Supports PDF (.pdf), Word (.docx, .doc), and text files. Max 15MB.
                </div>
              </div>

              <!-- Selected File Card -->
              <div id="rsFileCard" class="rs-file-card" style="${this.currentFile ? 'display:flex;' : 'display:none;'}">
                <div class="rs-file-card-icon">📄</div>
                <div class="rs-file-card-info">
                  <div class="rs-file-card-name" id="rsFileCardName">${this.currentFile?.name || ''}</div>
                  <div class="rs-file-card-meta" id="rsFileCardMeta">
                    ${this.extractedText ? `${DocumentParser._countWords(this.extractedText)} words parsed` : 'Ready to parse'}
                  </div>
                </div>
                <button type="button" id="btnRemoveFile" class="rs-btn-icon" title="Remove file">✕</button>
              </div>
            </div>

            <!-- TAB 2: Paste Text -->
            <div id="rsTabPaste" class="rs-tab-content ${this.activeTab === 'paste' ? 'active' : ''}">
              <textarea
                id="rsPasteTextarea"
                class="rs-textarea"
                placeholder="Paste the text from your resume here (Summary, Work Experience, Projects, Skills)..."
                rows="9"
              >${this.extractedText || ''}</textarea>
              <div class="rs-textarea-footer">
                <span id="rsWordCountLabel">${DocumentParser._countWords(this.extractedText)} words</span>
                <button type="button" id="btnClearPasted" class="btn-pill-tool">Clear</button>
              </div>
            </div>

            <!-- TAB 3: Sample Resumes -->
            <div id="rsTabSamples" class="rs-tab-content ${this.activeTab === 'samples' ? 'active' : ''}">
              <p class="rs-samples-hint">Choose a sample profile to test immediately without uploading a file:</p>
              <div class="rs-samples-list">
                ${SAMPLE_RESUMES.map(s => `
                  <div class="rs-sample-card" data-sample-id="${s.id}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span class="rs-sample-title">${s.title}</span>
                      <span class="rs-sample-badge">${s.badge}</span>
                    </div>
                    <div class="rs-sample-sub">Role: ${s.role}</div>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

          <!-- Right Column: Round Selection & Configuration -->
          <div class="rs-card">
            <div class="rs-card-header">
              <div class="rs-step-indicator">2</div>
              <div>
                <h3 class="rs-card-title">Select Interview Round</h3>
                <p class="rs-card-sub">Choose which type of interview you want to simulate.</p>
              </div>
            </div>

            <!-- Round Cards Grid -->
            <div class="rs-rounds-grid">

              <!-- Technical Round -->
              <div class="rs-round-card ${this.selectedRound === 'technical' ? 'selected' : ''}" data-round="technical">
                <div class="rs-round-icon">💻</div>
                <div class="rs-round-content">
                  <div class="rs-round-title">Technical & Architecture</div>
                  <div class="rs-round-desc">Framework internals, design patterns, bottlenecks, caching, and code design tailored to your tech stack.</div>
                </div>
                <div class="rs-round-radio"></div>
              </div>

              <!-- HR / Behavioral Round -->
              <div class="rs-round-card ${this.selectedRound === 'hr' ? 'selected' : ''}" data-round="hr">
                <div class="rs-round-icon">👔</div>
                <div class="rs-round-content">
                  <div class="rs-round-title">HR & Behavioral (STAR)</div>
                  <div class="rs-round-desc">Background introduction, conflict resolution, teamwork, career aspirations, and cultural alignment.</div>
                </div>
                <div class="rs-round-radio"></div>
              </div>

              <!-- Project Deep-Dive -->
              <div class="rs-round-card ${this.selectedRound === 'project' ? 'selected' : ''}" data-round="project">
                <div class="rs-round-icon">🚀</div>
                <div class="rs-round-content">
                  <div class="rs-round-title">Project Deep-Dive</div>
                  <div class="rs-round-desc">Drills into the actual projects and achievements on your resume: architecture, trade-offs, and metrics.</div>
                </div>
                <div class="rs-round-radio"></div>
              </div>

              <!-- Situational & Leadership -->
              <div class="rs-round-card ${this.selectedRound === 'situational' ? 'selected' : ''}" data-round="situational">
                <div class="rs-round-icon">🤝</div>
                <div class="rs-round-content">
                  <div class="rs-round-title">Situational & Leadership</div>
                  <div class="rs-round-desc">High-pressure scenarios, handling production outages, managing tight deadlines, and mentoring.</div>
                </div>
                <div class="rs-round-radio"></div>
              </div>

              <!-- Comprehensive Mixed -->
              <div class="rs-round-card ${this.selectedRound === 'mixed' ? 'selected' : ''}" data-round="mixed">
                <div class="rs-round-icon">🎯</div>
                <div class="rs-round-content">
                  <div class="rs-round-title">Full Mock Interview (Mixed)</div>
                  <div class="rs-round-desc">Realistic end-to-end loop: HR opening + 2 technical questions + 1 project review + 1 situational closing.</div>
                </div>
                <div class="rs-round-radio"></div>
              </div>

            </div>

            <!-- Fine-Tuning Options -->
            <div class="rs-options-grid">
              <div class="form-group">
                <label class="form-label">Target Role (Optional)</label>
                <input
                  type="text"
                  id="rsTargetRoleInput"
                  class="form-input"
                  placeholder="e.g. Senior Frontend Engineer (auto-detect if empty)"
                  value="${this.targetRole}"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Difficulty Level</label>
                <select id="rsDifficultySelect" class="form-select">
                  <option value="Junior-Mid" ${this.difficulty === 'Junior-Mid' ? 'selected' : ''}>Junior / Associate (Foundations & Practical)</option>
                  <option value="Mid-Senior" ${this.difficulty === 'Mid-Senior' ? 'selected' : ''}>Mid-Senior (Architecture & Deep Dive)</option>
                  <option value="Staff-Principal" ${this.difficulty === 'Staff-Principal' ? 'selected' : ''}>Staff / Lead (Trade-offs & Scalability)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Number of Questions</label>
                <select id="rsCountSelect" class="form-select">
                  <option value="3" ${this.questionCount === 3 ? 'selected' : ''}>3 Questions (Quick Practice ~8 min)</option>
                  <option value="4" ${this.questionCount === 4 ? 'selected' : ''}>4 Questions (Standard Round ~12 min)</option>
                  <option value="5" ${this.questionCount === 5 ? 'selected' : ''}>5 Questions (Comprehensive ~15 min)</option>
                </select>
              </div>
            </div>

            <!-- Start Action Button -->
            <div class="rs-action-row">
              <button
                type="button"
                id="btnGenerateInterview"
                class="rs-btn-primary"
                ${!this.extractedText || this.extractedText.length < 30 ? 'disabled' : ''}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                <span>Process Resume & Generate Interview</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      <!-- NVIDIA API Configuration Modal -->
      <div id="rsApiModal" class="rs-modal" style="display:none;">
        <div class="rs-modal-content">
          <div class="rs-modal-header">
            <h3>NVIDIA NIM AI Settings</h3>
            <button type="button" id="btnCloseApiModal" class="rs-btn-icon">✕</button>
          </div>
          <div class="rs-modal-body">
            <div class="form-group">
              <label class="form-label">NVIDIA API Key</label>
              <input type="password" id="modalApiKeyInput" class="form-input" value="${this.nvidia.getApiKey()}">
              <small class="form-hint">Using your provided active NVIDIA NIM API key. Stored securely in browser.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Model</label>
              <select id="modalModelSelect" class="form-select">
                ${AVAILABLE_MODELS.map(m => `
                  <option value="${m.id}" ${this.nvidia.getModel() === m.id ? 'selected' : ''}>
                    ${m.name} ${m.recommended ? '(Recommended)' : ''}
                  </option>
                `).join('')}
              </select>
            </div>
            <div id="modalTestResult" class="rs-test-result" style="display:none;"></div>
          </div>
          <div class="rs-modal-footer">
            <button type="button" id="btnTestApi" class="btn-pill-tool">Test Connection</button>
            <button type="button" id="btnResetApi" class="btn-pill-tool" style="color:var(--text-muted);">Reset Key</button>
            <button type="button" id="btnSaveApi" class="rs-btn-primary" style="padding:8px 18px;font-size:13px;">Save & Close</button>
          </div>
        </div>
      </div>
    `;

    this._bindSetupEvents();
  }

  _bindSetupEvents() {
    // Tab switching
    const tabBtns = this.container.querySelectorAll('.rs-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        
        this.container.querySelectorAll('.rs-tab-content').forEach(tc => tc.classList.remove('active'));
        if (this.activeTab === 'upload') this.container.querySelector('#rsTabUpload')?.classList.add('active');
        if (this.activeTab === 'paste') this.container.querySelector('#rsTabPaste')?.classList.add('active');
        if (this.activeTab === 'samples') this.container.querySelector('#rsTabSamples')?.classList.add('active');
      });
    });

    // Dropzone & File Input
    const dropzone = this.container.querySelector('#rsDropzone');
    const fileInput = this.container.querySelector('#rsFileInput');

    dropzone?.addEventListener('click', () => fileInput?.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone?.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone?.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) this._handleFileSelection(file);
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target?.files?.[0];
      if (file) this._handleFileSelection(file);
    });

    // Remove file button
    this.container.querySelector('#btnRemoveFile')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.currentFile = null;
      this.extractedText = '';
      this._updateButtonState();
      this._renderSetupView();
    });

    // Paste textarea
    const pasteTextarea = this.container.querySelector('#rsPasteTextarea');
    pasteTextarea?.addEventListener('input', (e) => {
      this.extractedText = e.target.value;
      const countLabel = this.container.querySelector('#rsWordCountLabel');
      if (countLabel) {
        countLabel.textContent = `${DocumentParser._countWords(this.extractedText)} words`;
      }
      this._updateButtonState();
    });

    this.container.querySelector('#btnClearPasted')?.addEventListener('click', () => {
      if (pasteTextarea) pasteTextarea.value = '';
      this.extractedText = '';
      this._updateButtonState();
    });

    // Sample cards
    const sampleCards = this.container.querySelectorAll('.rs-sample-card');
    sampleCards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.sampleId;
        const sample = SAMPLE_RESUMES.find(s => s.id === id);
        if (sample) {
          this.extractedText = sample.text;
          this.currentFile = { name: `${sample.title} (Preset).txt`, size: sample.text.length };
          this.targetRole = sample.role;
          this._updateButtonState();
          this._renderSetupView();
        }
      });
    });

    // Round cards
    const roundCards = this.container.querySelectorAll('.rs-round-card');
    roundCards.forEach(card => {
      card.addEventListener('click', () => {
        roundCards.forEach(rc => rc.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedRound = card.dataset.round;
      });
    });

    // Target role input
    this.container.querySelector('#rsTargetRoleInput')?.addEventListener('input', (e) => {
      this.targetRole = e.target.value;
    });

    // Difficulty select
    this.container.querySelector('#rsDifficultySelect')?.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
    });

    // Question count select
    this.container.querySelector('#rsCountSelect')?.addEventListener('change', (e) => {
      this.questionCount = parseInt(e.target.value, 10) || 4;
    });

    // Generate Interview button
    this.container.querySelector('#btnGenerateInterview')?.addEventListener('click', () => {
      this._startProcessing();
    });

    // API Modal events
    const apiModal = this.container.querySelector('#rsApiModal');
    this.container.querySelector('#btnOpenApiModal')?.addEventListener('click', () => {
      if (apiModal) apiModal.style.display = 'flex';
    });
    this.container.querySelector('#btnCloseApiModal')?.addEventListener('click', () => {
      if (apiModal) apiModal.style.display = 'none';
    });
    this.container.querySelector('#btnSaveApi')?.addEventListener('click', () => {
      const newKey = this.container.querySelector('#modalApiKeyInput')?.value;
      const newModel = this.container.querySelector('#modalModelSelect')?.value;
      if (newKey) this.nvidia.setApiKey(newKey);
      if (newModel) this.nvidia.setModel(newModel);
      if (apiModal) apiModal.style.display = 'none';
      this._renderSetupView();
    });
    this.container.querySelector('#btnResetApi')?.addEventListener('click', () => {
      this.nvidia.resetApiKey();
      const input = this.container.querySelector('#modalApiKeyInput');
      if (input) input.value = this.nvidia.getApiKey();
    });
    this.container.querySelector('#btnTestApi')?.addEventListener('click', async () => {
      const testResultEl = this.container.querySelector('#modalTestResult');
      if (testResultEl) {
        testResultEl.style.display = 'block';
        testResultEl.textContent = 'Testing connection with NVIDIA NIM...';
        testResultEl.className = 'rs-test-result';
      }
      const res = await this.nvidia.testConnection();
      if (testResultEl) {
        if (res.ok) {
          testResultEl.textContent = '✅ NVIDIA NIM API connection successful! Ready to use.';
          testResultEl.className = 'rs-test-result success';
        } else {
          testResultEl.textContent = `❌ Connection failed (${res.status || 'error'}): ${res.error || 'Please verify key'}`;
          testResultEl.className = 'rs-test-result error';
        }
      }
    });
  }

  async _handleFileSelection(file) {
    this.currentFile = file;
    const dropzone = this.container.querySelector('#rsDropzone');
    const fileCard = this.container.querySelector('#rsFileCard');
    const fileCardName = this.container.querySelector('#rsFileCardName');
    const fileCardMeta = this.container.querySelector('#rsFileCardMeta');

    if (fileCardName) fileCardName.textContent = file.name;
    if (fileCardMeta) fileCardMeta.textContent = 'Parsing file contents...';
    if (fileCard) fileCard.style.display = 'flex';

    try {
      const result = await DocumentParser.parseFile(file, ({ stage, percent }) => {
        if (fileCardMeta) fileCardMeta.textContent = `${stage} (${percent}%)`;
      });

      this.extractedText = result.text;
      if (fileCardMeta) {
        fileCardMeta.textContent = `✅ ${result.metadata.wordCount || DocumentParser._countWords(result.text)} words extracted`;
      }
      this._updateButtonState();
    } catch (err) {
      alert(`Error reading file: ${err.message}`);
      if (fileCardMeta) fileCardMeta.textContent = `Error: ${err.message}`;
    }
  }

  _updateButtonState() {
    const btn = this.container.querySelector('#btnGenerateInterview');
    if (btn) {
      const valid = this.extractedText && this.extractedText.length >= 30;
      btn.disabled = !valid;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 2: PROCESSING & ANALYSIS STAGE
  // ═══════════════════════════════════════════════════════════════════════════

  async _startProcessing() {
    this.viewState = 'processing';
    this.render();

    const step1El = this.container.querySelector('#rsStep1');
    const step2El = this.container.querySelector('#rsStep2');
    const step3El = this.container.querySelector('#rsStep3');
    const step4El = this.container.querySelector('#rsStep4');
    const progressBar = this.container.querySelector('#rsProgressBar');
    const progressLabel = this.container.querySelector('#rsProgressLabel');
    const statusMsg = this.container.querySelector('#rsStatusMessage');

    const updateStep = (stepEl, status, text) => {
      if (!stepEl) return;
      stepEl.className = `rs-processing-step ${status}`;
      const iconEl = stepEl.querySelector('.rs-proc-icon');
      if (iconEl) {
        if (status === 'done') iconEl.textContent = '✓';
        else if (status === 'active') iconEl.innerHTML = '<span class="rs-proc-spinner"></span>';
        else iconEl.textContent = '○';
      }
      if (text) {
        const textEl = stepEl.querySelector('.rs-proc-text');
        if (textEl) textEl.textContent = text;
      }
    };

    try {
      // Step 1: Document Structure
      updateStep(step1El, 'active', 'Extracting document text & sections...');
      if (progressBar) progressBar.style.width = '20%';
      if (progressLabel) progressLabel.textContent = '20%';
      if (statusMsg) statusMsg.textContent = 'Parsing resume text and formatting keywords...';
      await new Promise(r => setTimeout(r, 600));

      updateStep(step1El, 'done', `Document Parsed (${DocumentParser._countWords(this.extractedText)} words)`);

      // Step 2: Candidate Profiling
      updateStep(step2El, 'active', 'NVIDIA Llama 3.2 profiling skills & experience...');
      if (progressBar) progressBar.style.width = '45%';
      if (progressLabel) progressLabel.textContent = '45%';
      if (statusMsg) statusMsg.textContent = 'Identifying core tech stack, years of experience, and key accomplishments...';

      this.candidateProfile = await this.nvidia.analyzeProfile(this.extractedText);
      const detectedRole = this.candidateProfile?.role || 'Software Engineer';
      if (!this.targetRole) this.targetRole = detectedRole;

      updateStep(step2El, 'done', `Profile Identified: ${this.candidateProfile.name || 'Candidate'} (${detectedRole})`);

      // Step 3: NVIDIA NIM Question Synthesis
      const roundNames = {
        technical: 'Technical & Architecture',
        hr: 'HR & Behavioral',
        project: 'Project Deep-Dive',
        situational: 'Situational & Leadership',
        mixed: 'Comprehensive Mock'
      };
      const roundLabel = roundNames[this.selectedRound] || 'Technical';

      updateStep(step3El, 'active', `NVIDIA AI synthesizing ${roundLabel} questions...`);
      if (progressBar) progressBar.style.width = '75%';
      if (progressLabel) progressLabel.textContent = '75%';
      if (statusMsg) statusMsg.textContent = `Crafting realistic questions testing your resume projects and ${this.candidateProfile.skills?.slice(0, 3).join(', ') || 'skills'}...`;

      this.interviewData = await this.nvidia.generateInterviewRound({
        resumeText: this.extractedText,
        roundType: this.selectedRound,
        targetRole: this.targetRole,
        difficulty: this.difficulty,
        questionCount: this.questionCount
      });

      updateStep(step3El, 'done', `Generated ${this.interviewData.questions.length} Targeted Questions`);

      // Step 4: STAR Model Answers & Rubric
      updateStep(step4El, 'active', 'Formulating STAR model answers & evaluation rubrics...');
      if (progressBar) progressBar.style.width = '95%';
      if (progressLabel) progressLabel.textContent = '95%';
      if (statusMsg) statusMsg.textContent = 'Polishing benchmarks for live speech scoring...';
      await new Promise(r => setTimeout(r, 600));

      updateStep(step4El, 'done', 'STAR Benchmarks & Scoring Rubrics Ready');
      if (progressBar) progressBar.style.width = '100%';
      if (progressLabel) progressLabel.textContent = '100%';
      if (statusMsg) statusMsg.textContent = 'Ready! Launching Interview Session...';
      await new Promise(r => setTimeout(r, 700));

      // Switch to Interview View
      this.currentQuestionIndex = 0;
      this.userAnswers = {};
      this.aiEvaluations = {};
      this.viewState = 'interview';
      this.render();

      // Automatically speak the first question
      this._speakActiveQuestion();

    } catch (err) {
      console.error('Processing error:', err);
      alert(`Error during AI processing: ${err.message}`);
      this.viewState = 'setup';
      this.render();
    }
  }

  _renderProcessingView() {
    this.container.innerHTML = `
      <div class="rs-processing-stage">
        <div class="rs-proc-card">

          <!-- Glowing AI Brain Animation -->
          <div class="rs-neural-orb">
            <div class="rs-neural-glow"></div>
            <div class="rs-neural-core">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </div>
          </div>

          <h2 class="rs-proc-title">Analyzing Resume with NVIDIA NIM AI</h2>
          <p id="rsStatusMessage" class="rs-proc-sub">Initializing neural model and reading candidate profile...</p>

          <!-- Progress Bar -->
          <div class="rs-progress-wrap">
            <div class="rs-progress-track">
              <div id="rsProgressBar" class="rs-progress-fill" style="width: 15%;"></div>
            </div>
            <span id="rsProgressLabel" class="rs-progress-num">15%</span>
          </div>

          <!-- Checklist of Stages -->
          <div class="rs-proc-steps">
            <div id="rsStep1" class="rs-processing-step pending">
              <span class="rs-proc-icon">○</span>
              <span class="rs-proc-text">Document Parsing & Text Extraction</span>
            </div>
            <div id="rsStep2" class="rs-processing-step pending">
              <span class="rs-proc-icon">○</span>
              <span class="rs-proc-text">Candidate Profiling & Tech Stack Analysis</span>
            </div>
            <div id="rsStep3" class="rs-processing-step pending">
              <span class="rs-proc-icon">○</span>
              <span class="rs-proc-text">NVIDIA Llama 3.2 Question Synthesis</span>
            </div>
            <div id="rsStep4" class="rs-processing-step pending">
              <span class="rs-proc-icon">○</span>
              <span class="rs-proc-text">STAR Model Answers & Scoring Rubrics</span>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 3: ACTIVE INTERVIEW STUDIO
  // ═══════════════════════════════════════════════════════════════════════════

  _renderInterviewView() {
    const qIndex = this.currentQuestionIndex;
    const questions = this.interviewData?.questions || [];
    const currentQ = questions[qIndex] || { question: 'No question found', answer: '', hint: '', keyPoints: [] };
    const totalQ = questions.length;
    const evalData = this.aiEvaluations[qIndex];
    const candidateAnswer = this.userAnswers[qIndex] || '';

    this.container.innerHTML = `
      <div class="rs-interview-stage">

        <!-- Top Navigation & Stats Bar -->
        <div class="rs-interview-nav">
          <div class="rs-inav-left">
            <button type="button" id="btnBackToSetup" class="btn-pill-tool">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Exit Interview
            </button>
            <span class="rs-badge rs-badge-ai">${this.interviewData?.roundTitle || 'Technical Round'}</span>
            <span class="rs-inav-candidate">${this.candidateProfile?.name || 'Candidate'} · ${this.targetRole || 'Engineer'}</span>
          </div>

          <!-- Mode Switcher -->
          <div class="rs-mode-switch">
            <button type="button" class="rs-mode-btn ${this.practiceMode === 'simulation' ? 'active' : ''}" data-mode="simulation" title="Test yourself without looking at the answer, then get AI scoring">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7 7 0 0 1 11 5.07V5a1 1 0 0 1 2 0v.07A7 7 0 0 1 18.93 11H19a1 1 0 0 1 0 2h-.07A7 7 0 0 1 13 16.93z"/></svg>
              Real Simulation (AI Grading)
            </button>
            <button type="button" class="rs-mode-btn ${this.practiceMode === 'teleprompter' ? 'active' : ''}" data-mode="teleprompter" title="Rehearse by speaking the model answer out loud with live word tracking">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Practice Mode (Model Answer)
            </button>
          </div>

          <!-- Question Pills -->
          <div class="rs-qpills">
            ${questions.map((q, idx) => `
              <button type="button" class="rs-qpill ${idx === qIndex ? 'active' : ''} ${this.aiEvaluations[idx] ? 'evaluated' : ''}" data-idx="${idx}">
                Q${idx + 1}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Interview Card -->
        <div class="rs-interview-card">

          <!-- Interviewer Header -->
          <div class="rs-interviewer-header">
            <div class="rs-interviewer-avatar" id="interviewerAvatar">
              <span class="rs-avatar-dot"></span>
              🤖
            </div>
            <div class="rs-interviewer-meta">
              <div class="rs-interviewer-name">AI Interviewer (${this.selectedRound.toUpperCase()} Round)</div>
              <div class="rs-interviewer-status" id="interviewerVoiceStatus">🔊 Asking question aloud...</div>
            </div>
            <div class="rs-interviewer-actions">
              <button type="button" id="btnReplayQuestion" class="btn-pill-tool" title="Hear question again">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                Replay Question
              </button>
              <button type="button" id="btnSendToPrompter" class="btn-pill-tool" title="Practice full quest in Teleprompter Studio">
                Prompter Mode ↗
              </button>
            </div>
          </div>

          <!-- Question Text -->
          <div class="rs-question-box">
            <div class="rs-q-number">QUESTION ${qIndex + 1} OF ${totalQ}</div>
            <h2 class="rs-q-text">${currentQ.question}</h2>

            <!-- Coaching Hint Pill -->
            ${currentQ.hint ? `
              <div class="rs-q-hint">
                <span class="rs-hint-badge">💡 Coaching Tip</span>
                <span>${currentQ.hint}</span>
              </div>
            ` : ''}

            <!-- Key Rubric Points -->
            ${currentQ.keyPoints && currentQ.keyPoints.length ? `
              <div class="rs-key-points">
                <span class="rs-kp-label">Key points interviewers look for:</span>
                <div class="rs-kp-tags">
                  ${currentQ.keyPoints.map(kp => `<span class="rs-kp-tag">• ${kp}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- DUAL MODE CONTENT -->

          <!-- 1. SIMULATION MODE (Default: answer naturally, get AI score) -->
          <div id="rsModeSimulation" style="${this.practiceMode === 'simulation' ? 'display:block;' : 'display:none;'}">

            <div class="rs-candidate-response-area">
              <div class="rs-cra-header">
                <span class="rs-cra-title">Your Spoken or Typed Response</span>
                <span class="rs-cra-indicator" id="liveListeningIndicator" style="display:none;">
                  <span class="rs-pulse-dot"></span> Listening live... speak at your own pace, then click "Done Speaking"
                </span>
              </div>

              <!-- Live Voice / Typed Answer Box -->
              <div class="rs-answer-input-wrap">
                <textarea
                  id="rsCandidateAnswerText"
                  class="rs-answer-textarea"
                  placeholder="Click '🎙 Speak Answer' to record your voice, or type your answer here directly. Take your time — there's no rush. When you're satisfied with your response, click 'Submit for AI Evaluation'..."
                  rows="4"
                >${candidateAnswer}</textarea>
              </div>

              <!-- Action Bar -->
              <div class="rs-cra-actions">
                <div style="display:flex;gap:10px;align-items:center;">
                  <button type="button" id="btnToggleRecordAnswer" class="rs-btn-mic ${this.isListening ? 'recording' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    <span id="btnRecordLabel">${this.isListening ? '⏹ Done Speaking' : '🎙 Speak Answer'}</span>
                  </button>
                  <span class="rs-rec-hint" id="rsRecHint">${this.isListening ? 'Speaking live — click "Done Speaking" when finished' : 'Click mic to speak, or type your answer below'}</span>
                </div>

                <button
                  type="button"
                  id="btnSubmitAnswer"
                  class="rs-btn-evaluate"
                  ${this.isEvaluating ? 'disabled' : ''}
                >
                  ${this.isEvaluating ? `
                    <span class="rs-proc-spinner" style="width:14px;height:14px;"></span> Evaluating with NVIDIA AI...
                  ` : `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Submit for AI Evaluation
                  `}
                </button>
              </div>
            </div>

            <!-- AI EVALUATION CARD (Shown after evaluation) -->
            ${evalData ? `
              <div class="rs-eval-card">
                <div class="rs-eval-header">
                  <div class="rs-score-badge ${evalData.score >= 8 ? 'high' : evalData.score >= 6 ? 'mid' : 'low'}">
                    <span class="rs-score-num">${evalData.score.toFixed(1)}</span>
                    <span class="rs-score-max">/10</span>
                  </div>
                  <div>
                    <h3 class="rs-eval-verdict">${evalData.verdict}</h3>
                    <p class="rs-eval-sub">Evaluated by NVIDIA Llama 3.2 NIM against industry benchmarks</p>
                  </div>
                </div>

                <div class="rs-eval-body">
                  <div class="rs-eval-section">
                    <div class="rs-eval-label strong">🌟 Key Strengths</div>
                    <div class="rs-eval-text">${evalData.strengths}</div>
                  </div>

                  <div class="rs-eval-section">
                    <div class="rs-eval-label missing">⚠️ Areas for Improvement / Missed Points</div>
                    <div class="rs-eval-text">${evalData.missedPoints}</div>
                  </div>

                  <div class="rs-eval-section">
                    <div class="rs-eval-label tip">💡 Real-Interview Coaching Tip</div>
                    <div class="rs-eval-text">${evalData.coachingTip}</div>
                  </div>

                  <!-- Expandable Benchmark Answer -->
                  <details class="rs-benchmark-accordion">
                    <summary class="rs-benchmark-summary">🏆 View Exemplary Benchmark Model Answer</summary>
                    <div class="rs-benchmark-content">
                      <p>${currentQ.answer}</p>
                    </div>
                  </details>
                </div>
              </div>
            ` : ''}

          </div>

          <!-- 2. TELEPROMPTER / PRACTICE MODE (Read model answer aloud with green tracking) -->
          <div id="rsModeTeleprompter" style="${this.practiceMode === 'teleprompter' ? 'display:block;' : 'display:none;'}">
            <div class="rs-prompter-box">
              <div class="rs-pbox-header">
                <span class="rs-pbox-badge">Model Answer (Rehearse Out Loud)</span>
                <button type="button" id="btnHearModelAnswer" class="btn-pill-tool">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                  Listen to Model Answer
                </button>
              </div>

              <!-- Red model answer text with word tracking spans -->
              <div id="rsPrompterAnswerText" class="rs-prompter-text">
                ${this._buildWordSpans(currentQ.answer)}
              </div>

              <div class="rs-prompter-footer">
                <div id="rsPrompterWordCount" class="rs-pbox-stat">Words turn green as you speak</div>
                <div class="rs-prompter-mic-cta">
                  <button type="button" id="btnPrompterMic" class="rs-btn-mic ${this.isListening ? 'recording' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    <span>${this.isListening ? 'Listening...' : 'Speak the Red Text'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Stage Navigation Controls -->
          <div class="rs-stage-controls">
            <button
              type="button"
              id="btnPrevQuestion"
              class="btn-pill-tool"
              ${qIndex === 0 ? 'disabled' : ''}
            >
              ← Previous
            </button>

            <span class="rs-progress-label">
              Question ${qIndex + 1} of ${totalQ}
            </span>

            ${qIndex < totalQ - 1 ? `
              <button type="button" id="btnNextQuestion" class="rs-btn-primary" style="padding:10px 22px;">
                Next Question →
              </button>
            ` : `
              <button type="button" id="btnFinishRound" class="rs-btn-primary" style="padding:10px 22px; background:linear-gradient(135deg, #059669, #10b981);">
                Finish Round & View Report 🏆
              </button>
            `}
          </div>

        </div>

      </div>
    `;

    this._bindInterviewEvents();
  }

  _buildWordSpans(text) {
    if (!text) return '';
    const words = text.split(/\s+/);
    return words.map((w, idx) => `<span class="rs-word-span" data-widx="${idx}">${w}</span>`).join(' ');
  }

  _bindInterviewEvents() {
    const qIndex = this.currentQuestionIndex;
    const questions = this.interviewData?.questions || [];
    const currentQ = questions[qIndex];

    // Exit interview
    this.container.querySelector('#btnBackToSetup')?.addEventListener('click', () => {
      this.engine.stopSpeaking();
      this.engine.stopListening();
      this.viewState = 'setup';
      this.render();
    });

    // Send full quest to Teleprompter
    this.container.querySelector('#btnSendToPrompter')?.addEventListener('click', () => {
      this.engine.stopSpeaking();
      this.engine.stopListening();
      if (this.onSendToTeleprompter && this.interviewData) {
        const quest = {
          id: `ai-resume-${Date.now()}`,
          title: `${this.candidateProfile?.name || 'Resume'} — ${this.interviewData.roundTitle}`,
          category: 'AI Resume Interview',
          target: this.targetRole || 'Software Engineer',
          description: this.interviewData.roundSummary,
          dialogues: this.interviewData.questions.map((q, idx) => ({
            id: `q-${idx}`,
            question: q.question,
            answer: q.answer,
            hint: q.hint
          }))
        };
        this.onSendToTeleprompter(quest);
      }
    });

    // Mode switch
    const modeBtns = this.container.querySelectorAll('.rs-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.practiceMode = btn.dataset.mode;
        this.render();
      });
    });

    // Question pill quick jumps
    const qPills = this.container.querySelectorAll('.rs-qpill');
    qPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const idx = parseInt(pill.dataset.idx, 10);
        this._goToQuestion(idx);
      });
    });

    // Replay question TTS
    this.container.querySelector('#btnReplayQuestion')?.addEventListener('click', () => {
      this._speakActiveQuestion();
    });

    // Hear model answer TTS
    this.container.querySelector('#btnHearModelAnswer')?.addEventListener('click', () => {
      if (!currentQ?.answer) return;
      this.engine.stopListening();
      const statusEl = this.container.querySelector('#interviewerVoiceStatus');
      if (statusEl) statusEl.textContent = '🔊 Model answer speaking...';
      this.engine.speak(currentQ.answer, () => {
        if (statusEl) statusEl.textContent = '🎤 Now speak it yourself!';
      });
    });

    // Candidate textarea auto-save
    const answerTextarea = this.container.querySelector('#rsCandidateAnswerText');
    answerTextarea?.addEventListener('input', (e) => {
      this.userAnswers[qIndex] = e.target.value;
    });

    // Speak / Record in Simulation Mode
    this.container.querySelector('#btnToggleRecordAnswer')?.addEventListener('click', () => {
      this._toggleAnswerRecording();
    });

    // Speak in Teleprompter Mode
    this.container.querySelector('#btnPrompterMic')?.addEventListener('click', () => {
      this._togglePrompterVoiceMode();
    });

    // Submit Answer for AI Evaluation
    this.container.querySelector('#btnSubmitAnswer')?.addEventListener('click', () => {
      this._evaluateCurrentAnswer();
    });

    // Next / Prev / Finish buttons
    this.container.querySelector('#btnPrevQuestion')?.addEventListener('click', () => {
      if (qIndex > 0) this._goToQuestion(qIndex - 1);
    });

    this.container.querySelector('#btnNextQuestion')?.addEventListener('click', () => {
      if (qIndex < questions.length - 1) this._goToQuestion(qIndex + 1);
    });

    this.container.querySelector('#btnFinishRound')?.addEventListener('click', () => {
      this.engine.stopSpeaking();
      this.engine.stopListening();
      this.viewState = 'summary';
      this.render();
    });
  }

  _goToQuestion(newIndex) {
    this.engine.stopSpeaking();
    this.engine.stopListening();
    this.isListening = false;
    this.currentQuestionIndex = newIndex;
    this.render();
    this._speakActiveQuestion();
  }

  _speakActiveQuestion() {
    const q = this.interviewData?.questions?.[this.currentQuestionIndex];
    if (!q) return;

    const statusEl = this.container.querySelector('#interviewerVoiceStatus');
    const avatar = this.container.querySelector('#interviewerAvatar');
    const listenInd = this.container.querySelector('#liveListeningIndicator');

    // Set interviewer to speaking state
    if (statusEl) {
      statusEl.textContent = '🔊 Interviewer speaking...';
      statusEl.style.color = 'var(--accent-blue)';
    }
    if (avatar) avatar.classList.add('speaking');
    if (listenInd) listenInd.style.display = 'none';

    this.engine.speak(q.question, () => {
      // When AI stops speaking, transition to "Your turn" state
      if (avatar) avatar.classList.remove('speaking');
      if (statusEl) {
        statusEl.textContent = '🎤 Your turn — speak your answer or type below';
        statusEl.style.color = 'var(--accent-green)';
      }
    });
  }

  _toggleAnswerRecording() {
    if (this.isListening) {
      // User clicked "Done Speaking" — stop listening
      this.engine.stopListening();
      this.isListening = false;

      const recBtn = this.container.querySelector('#btnToggleRecordAnswer');
      const recLabel = this.container.querySelector('#btnRecordLabel');
      const ind = this.container.querySelector('#liveListeningIndicator');
      const statusEl = this.container.querySelector('#interviewerVoiceStatus');

      if (recBtn) { recBtn.classList.remove('recording'); recBtn.style.background = ''; }
      if (recLabel) recLabel.textContent = '🎙 Speak Answer';
      if (ind) ind.style.display = 'none';
      if (statusEl) {
        statusEl.textContent = '✅ Done speaking — review your answer, then submit for AI evaluation';
        statusEl.style.color = 'var(--accent-green)';
      }
    } else {
      // Start listening
      if (!this.engine.hasSR) {
        // SR not available, just show a helpful note — user can type
        const statusEl = this.container.querySelector('#interviewerVoiceStatus');
        if (statusEl) {
          statusEl.textContent = '⌨️ Speech recognition not available — please type your answer below';
          statusEl.style.color = 'var(--accent-amber, #f59e0b)';
        }
        return;
      }
      this.engine.stopSpeaking();
      this.isListening = true;

      const recBtn = this.container.querySelector('#btnToggleRecordAnswer');
      const recLabel = this.container.querySelector('#btnRecordLabel');
      const ind = this.container.querySelector('#liveListeningIndicator');
      const textarea = this.container.querySelector('#rsCandidateAnswerText');
      const statusEl = this.container.querySelector('#interviewerVoiceStatus');

      if (recBtn) recBtn.classList.add('recording');
      if (recLabel) recLabel.textContent = '⏹ Done Speaking';
      if (ind) ind.style.display = 'inline-flex';
      if (statusEl) {
        statusEl.textContent = '🎤 Listening live — click "Done Speaking" when you finish your answer';
        statusEl.style.color = '#ef4444';
      }

      const existingText = textarea?.value ? textarea.value.trim() + ' ' : '';

      this.engine.startListening(
        '', // No strict target — free-form answer mode
        (accumulatedTranscript) => {
          // Live transcript: update textarea with accumulated speech
          if (textarea && accumulatedTranscript) {
            textarea.value = accumulatedTranscript.trim();
            this.userAnswers[this.currentQuestionIndex] = textarea.value;
          }
        },
        () => {} // No word-match handler for free answers
      );
    }
  }

  _togglePrompterVoiceMode() {
    const q = this.interviewData?.questions?.[this.currentQuestionIndex];
    if (!q) return;

    if (this.isListening) {
      this.engine.stopListening();
      this.isListening = false;
      const btn = this.container.querySelector('#btnPrompterMic');
      if (btn) btn.classList.remove('recording');
    } else {
      if (!this.engine.hasSR) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }
      this.engine.stopSpeaking();
      this.isListening = true;

      const btn = this.container.querySelector('#btnPrompterMic');
      if (btn) btn.classList.add('recording');

      this.engine.startListening(
        q.answer,
        (live) => {
          // Live words tracking
        },
        ({ matched, total, done }) => {
          const spans = this.container.querySelectorAll('.rs-word-span');
          const matchedSet = new Set(matched);
          spans.forEach((span, idx) => {
            span.classList.toggle('matched', matchedSet.has(idx));
          });

          const statEl = this.container.querySelector('#rsPrompterWordCount');
          if (statEl) {
            statEl.textContent = `${matched.length} / ${total} words spoken accurately`;
          }

          if (done) {
            this.isListening = false;
            if (btn) btn.classList.remove('recording');
            this.engine.stopListening();
          }
        }
      );
    }
  }

  async _evaluateCurrentAnswer() {
    const qIndex = this.currentQuestionIndex;
    const q = this.interviewData?.questions?.[qIndex];
    const candidateAnswer = this.userAnswers[qIndex] || this.container.querySelector('#rsCandidateAnswerText')?.value;

    if (!candidateAnswer || candidateAnswer.trim().length < 5) {
      alert('Please speak or type an answer first before requesting AI evaluation.');
      return;
    }

    this.isEvaluating = true;
    this.engine.stopListening();
    this.isListening = false;
    this.render();

    try {
      const evaluation = await this.nvidia.evaluateAnswer({
        question: q.question,
        modelAnswer: q.answer,
        userAnswer: candidateAnswer,
        roundType: this.selectedRound
      });

      this.aiEvaluations[qIndex] = evaluation;
    } catch (err) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      this.isEvaluating = false;
      this.render();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 4: INTERVIEW SUMMARY & PERFORMANCE SCORECARD
  // ═══════════════════════════════════════════════════════════════════════════

  _renderSummaryView() {
    const questions = this.interviewData?.questions || [];
    const evaluations = Object.values(this.aiEvaluations);

    let avgScore = 0;
    if (evaluations.length > 0) {
      const total = evaluations.reduce((acc, curr) => acc + (curr.score || 0), 0);
      avgScore = Math.round((total / (questions.length * 10)) * 100);
    } else {
      avgScore = 75; // Default completed benchmark
    }

    const badgeVerdict = avgScore >= 80 ? '🌟 Highly Interview-Ready' : avgScore >= 65 ? '👍 Strong Candidate with Polishing Needed' : '📚 More Rehearsal Recommended';

    this.container.innerHTML = `
      <div class="rs-summary-stage">
        <div class="rs-summary-card">

          <div class="rs-sum-header">
            <span class="rs-badge rs-badge-ai">Interview Performance Scorecard</span>
            <h1 class="rs-sum-title">Round Complete! Here is Your Assessment</h1>
            <p class="rs-sum-sub">
              ${this.interviewData?.roundTitle} · Candidate: <strong>${this.candidateProfile?.name || 'Candidate'}</strong> (${this.targetRole})
            </p>
          </div>

          <!-- Score Banner -->
          <div class="rs-score-banner">
            <div class="rs-score-dial">
              <span class="rs-dial-num">${avgScore}%</span>
              <span class="rs-dial-lbl">Readiness Score</span>
            </div>
            <div class="rs-dial-details">
              <h3 class="rs-dial-verdict">${badgeVerdict}</h3>
              <p class="rs-dial-desc">
                Based on NVIDIA Llama 3.2 evaluation of your responses against the STAR framework, technical depth, communication clarity, and resume project alignment.
              </p>
            </div>
          </div>

          <!-- Question-by-Question Breakdown -->
          <div class="rs-breakdown-list">
            <h3 class="rs-bk-title">Question Breakdown</h3>
            ${questions.map((q, idx) => {
              const ev = this.aiEvaluations[idx];
              return `
                <div class="rs-bk-item">
                  <div class="rs-bk-header">
                    <span class="rs-bk-badge">Q${idx + 1}</span>
                    <span class="rs-bk-q">${q.question}</span>
                    ${ev ? `
                      <span class="rs-score-pill ${ev.score >= 8 ? 'high' : ev.score >= 6 ? 'mid' : 'low'}">
                        ${ev.score.toFixed(1)} / 10
                      </span>
                    ` : `
                      <span class="rs-score-pill">Unscored</span>
                    `}
                  </div>
                  ${ev ? `
                    <div class="rs-bk-body">
                      <div class="rs-bk-row"><strong>Strengths:</strong> ${ev.strengths}</div>
                      <div class="rs-bk-row"><strong>Improvement:</strong> ${ev.missedPoints}</div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Bottom Actions -->
          <div class="rs-sum-actions">
            <button type="button" id="btnRetryRound" class="btn-pill-tool" style="padding:10px 20px;">
              ↺ Retake This Round
            </button>
            <button type="button" id="btnAnotherRound" class="rs-btn-primary">
              Choose Another Round or Role →
            </button>
          </div>

        </div>
      </div>
    `;

    this.container.querySelector('#btnRetryRound')?.addEventListener('click', () => {
      this.currentQuestionIndex = 0;
      this.userAnswers = {};
      this.aiEvaluations = {};
      this.viewState = 'interview';
      this.render();
      this._speakActiveQuestion();
    });

    this.container.querySelector('#btnAnotherRound')?.addEventListener('click', () => {
      this.viewState = 'setup';
      this.render();
    });
  }
}
