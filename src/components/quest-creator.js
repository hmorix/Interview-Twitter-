/**
 * Custom Quest Creator Component
 * Enables any user or business to create their own custom questions and answers,
 * save them, and practice them immediately.
 */

import { saveCustomQuest, loadCustomQuests, deleteCustomQuest } from '../data/questions.js';

export class QuestCreator {
  constructor(containerElement, onQuestSavedAndStart) {
    this.container = containerElement;
    this.onQuestSavedAndStart = onQuestSavedAndStart;
    this.questionItems = [
      { question: '', answer: '' },
      { question: '', answer: '' }
    ];
  }

  render() {
    this.container.innerHTML = `
      <div class="creator-header">
        <h2 class="creator-title">Create Custom Question Quest</h2>
        <p class="creator-subtitle">Design your own interview or speaking track for Individual ("I") or Business goals.</p>
      </div>

      <div class="creator-card">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Quest Title</label>
            <input type="text" id="questTitleInput" class="form-input" placeholder="e.g. Senior Frontend Screener / Daily Polish">
          </div>
          <div class="form-group">
            <label class="form-label">Quest Target</label>
            <select id="questCategorySelect" class="form-select">
              <option value="Individual (\"I\")">Individual ("I") / Personal</option>
              <option value="Business">Business / Executive</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Short Description</label>
          <input type="text" id="questDescInput" class="form-input" placeholder="Brief summary of what this practice session trains">
        </div>

        <div class="form-group">
          <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Question & Answer Pairs</span>
            <button type="button" id="btnAddQuestionPair" class="btn-pill-tool">+ Add Another Question</button>
          </label>
          <div id="questionsBuilderList" class="questions-builder-list"></div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" id="btnSaveQuest" class="btn-primary-action">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save & Practice Now
          </button>
        </div>
      </div>

      <div class="creator-header" style="margin-top: 48px; text-align: left;">
        <h3 style="font-size: 1.3rem; font-weight: 700;">Your Saved Quests</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted);">Quests created and stored on this device.</p>
      </div>

      <div id="savedQuestsGrid" class="saved-quests-grid"></div>
    `;

    this.renderQuestionInputs();
    this.renderSavedQuests();
    this.setupListeners();
  }

  renderQuestionInputs() {
    const list = this.container.querySelector('#questionsBuilderList');
    list.innerHTML = '';

    this.questionItems.forEach((item, idx) => {
      const box = document.createElement('div');
      box.className = 'question-builder-item';
      box.innerHTML = `
        ${this.questionItems.length > 1 ? `<button type="button" class="btn-remove-builder-q" data-idx="${idx}" title="Remove question">✕</button>` : ''}
        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-dark); display: block; margin-bottom: 4px;">
            Question ${idx + 1} (Prompt Asked)
          </label>
          <input type="text" class="form-input q-input" data-idx="${idx}" value="${item.question}" placeholder="e.g. Tell me about a time you resolved a major production bug.">
        </div>
        <div>
          <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-red); display: block; margin-bottom: 4px;">
            Target Spoken Answer (In Red)
          </label>
          <textarea class="form-textarea a-input" data-idx="${idx}" placeholder="e.g. I isolated the memory leak, rolled back safely in five minutes, and implemented unit tests.">${item.answer}</textarea>
        </div>
      `;
      list.appendChild(box);
    });
  }

  renderSavedQuests() {
    const grid = this.container.querySelector('#savedQuestsGrid');
    const saved = loadCustomQuests();
    if (!saved || saved.length === 0) {
      grid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1 / -1;">No custom quests saved yet. Create your first one above!</p>`;
      return;
    }

    grid.innerHTML = '';
    saved.forEach(quest => {
      const card = document.createElement('div');
      card.className = 'saved-quest-card';
      card.innerHTML = `
        <div>
          <span class="context-pill" style="margin-bottom: 8px;">${quest.target}</span>
          <div class="saved-quest-title">${quest.title}</div>
          <div class="saved-quest-meta">${quest.dialogues.length} questions • ${quest.category}</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 16px;">${quest.description || 'Custom practice track'}</p>
        </div>
        <div style="display: flex; gap: 8px; justify-content: space-between;">
          <button class="btn-pill-tool btn-practice-saved" data-id="${quest.id}" style="color: var(--accent-blue); font-weight: 700;">
            Start Quest &rarr;
          </button>
          <button class="btn-pill-tool btn-delete-saved" data-id="${quest.id}" style="color: var(--accent-red);">
            Delete
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.btn-practice-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const q = saved.find(x => x.id === id);
        if (q && this.onQuestSavedAndStart) {
          this.onQuestSavedAndStart(q);
        }
      });
    });

    grid.querySelectorAll('.btn-delete-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        deleteCustomQuest(id);
        this.renderSavedQuests();
      });
    });
  }

  setupListeners() {
    const btnAdd = this.container.querySelector('#btnAddQuestionPair');
    btnAdd.addEventListener('click', () => {
      this.syncInputs();
      this.questionItems.push({ question: '', answer: '' });
      this.renderQuestionInputs();
    });

    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-builder-q')) {
        const idx = parseInt(e.target.dataset.idx, 10);
        this.syncInputs();
        this.questionItems.splice(idx, 1);
        this.renderQuestionInputs();
      }
    });

    const btnSave = this.container.querySelector('#btnSaveQuest');
    btnSave.addEventListener('click', () => {
      this.syncInputs();
      const title = this.container.querySelector('#questTitleInput').value.trim();
      const target = this.container.querySelector('#questCategorySelect').value;
      const desc = this.container.querySelector('#questDescInput').value.trim();

      if (!title) {
        alert('Please enter a Quest Title.');
        return;
      }

      const validPairs = this.questionItems.filter(p => p.question.trim() && p.answer.trim());
      if (validPairs.length === 0) {
        alert('Please fill out at least one Question and Answer pair.');
        return;
      }

      const newQuest = {
        id: `custom-${Date.now()}`,
        title,
        category: 'Custom Practice',
        target,
        description: desc || 'Custom created practice track',
        dialogues: validPairs.map((p, idx) => ({
          id: `cust-q-${idx + 1}`,
          question: p.question.trim(),
          answer: p.answer.trim(),
          hint: 'Custom benchmark answer'
        }))
      };

      saveCustomQuest(newQuest);
      if (this.onQuestSavedAndStart) {
        this.onQuestSavedAndStart(newQuest);
      }
    });
  }

  syncInputs() {
    const qInputs = this.container.querySelectorAll('.q-input');
    const aInputs = this.container.querySelectorAll('.a-input');
    qInputs.forEach((input, i) => {
      if (this.questionItems[i]) {
        this.questionItems[i].question = input.value;
      }
    });
    aInputs.forEach((input, i) => {
      if (this.questionItems[i]) {
        this.questionItems[i].answer = input.value;
      }
    });
  }
}
