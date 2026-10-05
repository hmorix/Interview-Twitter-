/**
 * Teleprompter Component
 * Renders the vertical conversation dialogue flow matching the user's reference image:
 * Questions in bold black, answers in bold red, with active centering and word-by-word highlights.
 */

export class Teleprompter {
  constructor(containerElement, onSelectDialogue) {
    this.container = containerElement;
    this.onSelectDialogue = onSelectDialogue;
    this.dialogues = [];
    this.currentIndex = 0;
  }

  setDialogues(dialogues, initialIndex = 0) {
    this.dialogues = dialogues;
    this.currentIndex = initialIndex;
    this.render();
  }

  setCurrentIndex(newIndex) {
    if (newIndex < 0 || newIndex >= this.dialogues.length) return;
    this.currentIndex = newIndex;
    this.updateCardStates();
    this.scrollToActive();
  }

  render() {
    this.container.innerHTML = '';

    this.dialogues.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'dialogue-card';
      card.dataset.index = index;

      // Question line (Bold black)
      const qEl = document.createElement('div');
      qEl.className = 'line-question';
      qEl.textContent = item.question;

      // Answer line (Bold red with individual word spans)
      const aEl = document.createElement('div');
      aEl.className = 'line-answer';
      aEl.innerHTML = this.buildWordSpans(item.answer);

      card.appendChild(qEl);
      card.appendChild(aEl);

      card.addEventListener('click', () => {
        if (this.onSelectDialogue) {
          this.onSelectDialogue(index);
        }
      });

      this.container.appendChild(card);
    });

    this.updateCardStates();
  }

  buildWordSpans(text) {
    const words = text.split(/\s+/);
    return words.map((w, wIdx) => {
      return `<span class="word-span" data-word-idx="${wIdx}">${w}</span>`;
    }).join(' ');
  }

  updateCardStates() {
    const cards = this.container.querySelectorAll('.dialogue-card');
    cards.forEach((card, idx) => {
      card.classList.remove('active', 'past', 'future');
      if (idx === this.currentIndex) {
        card.classList.add('active');
      } else if (idx < this.currentIndex) {
        card.classList.add('past');
      } else {
        card.classList.add('future');
      }
    });
  }

  // Update matched word spans on the active card
  updateMatchedWords(matchedIndices) {
    const activeCard = this.container.querySelector(`.dialogue-card[data-index="${this.currentIndex}"]`);
    if (!activeCard) return;

    const wordSpans = activeCard.querySelectorAll('.word-span');
    const matchedSet = new Set(matchedIndices);

    wordSpans.forEach((span, idx) => {
      if (matchedSet.has(idx)) {
        span.classList.add('matched');
      } else {
        span.classList.remove('matched');
      }
    });
  }

  scrollToActive() {
    const activeCard = this.container.querySelector(`.dialogue-card[data-index="${this.currentIndex}"]`);
    if (!activeCard) return;

    activeCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}
