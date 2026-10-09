# PrepSphere Studio — Voice Interview & Spoken Dialogue Practice

A **Vite + Node.js** web application for digital interview and spoken dialogue practice with **live voice interaction**, word-by-word speech recognition feedback, and a custom quest builder for both **Individual ("I")** and **Business** scenarios.

---

## 🎤 What It Does

The app recreates the **exact reading flow shown in the reference image** — questions in **bold black**, answers in **bold red**, centered on the screen — with real microphone and speech synthesis so you can *hear and speak* every line naturally.

As you speak the red text aloud, each word **turns green** when correctly recognized, giving you instant pronunciation feedback.

---

## 🌟 Features

### 1. Teleprompter Dialogue View
- Vertically stacked question & answer pairs — **exactly like the reference image**
- **Past** exchanges fade and shrink upward, **active** pair is bold and centered, **future** pairs fade below
- Click any card to jump directly to that exchange

### 2. Live Voice Interaction
- **Question spoken aloud** by the app (Text-to-Speech) first
- **Speech Recognition** listens as you read the red answer
- **Word-by-word green highlights** appear as you speak correctly
- **Auto-Advance** moves to the next question once you hit 75% coverage
- **VAD Fallback** — if speech recognition is unavailable, speaking any sound still advances words

### 3. Floating Microphone Dock
- Live **pulsing ring** around the mic button shows real-time voice volume
- **Question** button: replay the question via TTS anytime
- **Answer** button: hear the model answer spoken aloud
- **Spacebar** toggles microphone / **Enter** advances to next question

### 4. Two Track Types

#### Individual ("I") Tracks
- **Everyday Speaking & Natural Flow** — 7 daily conversation pairs (greeting, hobbies, plans) — the exact style from the reference image
- **Job Interview Sprint** — 5 personal screening questions (pitch, strengths, setbacks, motivation, 3-year vision)

#### Business Tracks
- **Executive Behavioral & STAR Leadership** — 5 executive-level scenarios (stakeholder conflict, OKR prioritization, ambiguity, lateral influence, quantified impact)
- **Business Strategy & Product Metrics** — 3 PM scenarios (DAU drop triage, MVP scoping, capacity balancing)

### 5. Custom Quest Creator
- **Create your own questions** — add a title, choose Individual or Business track, write any number of Q&A pairs
- Saved to **browser local storage** — persist across sessions
- **Start any saved quest instantly** from the saved quests grid
- Full **delete** management

### 6. 🤖 AI Resume Interview Studio (Powered by NVIDIA NIM)
- **Resume Upload**: Upload **PDF (.pdf)**, **Word (.docx, .doc)**, or text files with instant client-side text extraction (using `pdfjs-dist` & `mammoth`).
- **NVIDIA Llama 3.2 NIM Integration**: Uses NVIDIA's free API (`meta/llama-3.2-11b-vision-instruct`) to analyze the candidate's real projects, skills, and experience level.
- **Multi-Round Selection**:
  - 💻 **Technical & Architecture Round**: Deep dive into specific tech stacks, framework internals, and system design.
  - 👔 **HR & Behavioral Round (STAR)**: Cultural fit, career story, conflict resolution, and teamwork.
  - 🚀 **Project Deep-Dive Round**: Direct questions on actual resume projects, architectural trade-offs, and metrics.
  - 🤝 **Situational & Leadership Round**: Handling production outages, tight deadlines, and mentorship.
  - 🎯 **Full Mock Interview (Mixed)**: End-to-end simulation covering the entire interview loop.
- **Dual Practice Modes**:
  - **Real Simulation Mode**: Test yourself without seeing the answer! Speak or type naturally, then get instant **NVIDIA AI Grading** (Score /10, Strengths, Missing points, Coaching tips, Model Answer comparison).
  - **Practice & Teleprompter Mode**: Rehearse speaking the high-scoring STAR model answer out loud with live word-by-word green tracking.
- **Comprehensive Scorecard**: End-of-round performance readiness score, breakdown, and personalized feedback.
- **1-Click Sample Resumes**: Alex (Full-Stack), Sarah (Frontend Lead), Marcus (Backend Systems) for instant zero-file testing.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js v18+** and **npm**

### Run Locally (Development)

```bash
npm install
npm run dev
```

The app opens automatically at **http://localhost:5173/**

> 🎤 **Important:** Microphone and Speech Recognition work on `localhost` without HTTPS. No extra setup needed.

### Build for Deployment

```bash
npm run build
```

Output goes to `dist/` — deploy it to **Vercel, Netlify, GitHub Pages, or any static host**.

### Preview Production Build

```bash
npm run preview
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---|:---|
| `Space` | Toggle microphone on/off |
| `Enter` | Advance to next dialogue |
| Click any card | Jump to that exchange |

---

## 📁 Project Structure

```
Harsh/
├── index.html                        # Vite entry HTML
├── vite.config.js                    # Vite dev/build config
├── package.json                      # npm scripts
│
├── src/
│   ├── main.js                       # App controller & orchestration
│   ├── styles/
│   │   └── main.css                  # Light UI, dialogue cards, mic dock
│   ├── data/
│   │   └── questions.js              # Individual + Business quest data & localStorage
│   ├── audio/
│   │   └── speech-engine.js          # TTS, Speech Recognition, VAD fallback, mic analyser
│   └── components/
│       ├── teleprompter.js           # Dialogue card renderer & word highlighter
│       └── quest-creator.js          # Custom quest builder UI
│
└── dist/                             # Production build output (deploy this)
```

---

## 🌐 Deploy Your Own

### Vercel (Recommended — Zero Config)

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Drag & drop the dist/ folder to netlify.com
```

### GitHub Pages

1. Push your code to GitHub
2. In **Settings → Pages**, set source to GitHub Actions
3. Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> **Note:** For GitHub Pages deployment, add `base: '/your-repo-name/'` to `vite.config.js`.

---

## 🎨 Design Notes

- **Clean light aesthetic** — white background with radial gradient, matching the reference image
- Typography: **Plus Jakarta Sans** (headings & UI) + **JetBrains Mono** (counters)
- Questions: `font-size: 1.75rem`, bold black (`#0f172a`)
- Answers: `font-size: 1.62rem`, bold red (`#dc2626`) → turn green (`#16a34a`) when correctly spoken
- **No external UI libraries** — pure vanilla CSS with GPU-composited animations
