*This is a submission for the [Hacktoberfest Weekend Challenge: Build for a Friend](https://dev.to/challenges/hacktoberfest-weekend-2026-10-01)*

---

## What I Built

I built **PrepSphere Studio** — a voice-powered interview and spoken English practice platform — for my friend **Harsh**, who has been preparing for job interviews and wants to improve his spoken English fluency and confidence.

Harsh struggled with two things: knowing *what* to say in an interview, and actually *saying it out loud* confidently. Most apps let you read answers; none made him practice speaking them. PrepSphere solves both problems in one place.

**What it does:**
- 🎤 Reads each interview question aloud via **Text-to-Speech** so he hears natural pronunciation
- 📖 Shows the model answer in a teleprompter-style view — questions in bold black, answers in bold red
- ✅ Listens via **Speech Recognition** as he speaks — each word turns **green in real-time** when correctly said
- 🔁 Auto-advances to the next question once he hits 75% speech coverage
- 🛠️ Includes a **Custom Quest Creator** — add any Q&A set, saved in browser localStorage

**Built-in practice tracks:**
- Everyday Speaking & Natural Flow
- Personal Job Interview Sprint
- English Speaking Confidence Builder
- Executive Behavioral & STAR Leadership
- Product Strategy & Business Metrics

---

## Demo

<!-- 🔴 Replace the link below with your actual Vercel URL after deploying -->
🌐 **Live App:** [prepsphere.vercel.app](https://interviewtwitter.vercel.app/)

---

## Code

{% [github hmorix/Interview-Twitter-](https://github.com/hmorix/Interview-Twitter-) %}

---

## How I Built It

PrepSphere is built entirely with **open-source tools and zero paid APIs**:

| Layer | Technology |
|:---|:---|
| **Build Tool** | [Vite](https://vitejs.dev/) — fast dev server & static bundler |
| **Speech Recognition** | [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — browser-native, no key needed |
| **Text-to-Speech** | [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) — browser-native |
| **UI** | Vanilla HTML + CSS + JavaScript — no frameworks, full control |
| **AI Coding Agent** | [Antigravity by Google DeepMind](https://antigravity.dev) — scaffolded, iterated, and debugged the full app |

The AI agent helped architect the word-by-word speech diff algorithm, the VAD (Voice Activity Detection) fallback when the Speech API is unavailable, the teleprompter card renderer with GPU-composited animations, and the floating mic dock with real-time audio volume visualisation — all without any cloud inference or paid API calls.

---

## Why Does Open Innovation Matter?

Harsh cannot afford expensive SaaS interview prep subscriptions. PrepSphere costs exactly **$0 to use** and **$0 to run** — because it relies entirely on open browser APIs and open-source tooling.

Open innovation made the following possible that a closed API would not:

- **No API key, no billing, no account** — Harsh just opens a URL and starts speaking
- **Privacy by design** — speech is processed locally in the browser, never sent to any server
- **Fully remixable** — because everything is open-source, Harsh can fork it and add his own domain-specific interview questions anytime
- **Deployable anywhere** — Vite outputs a static `dist/` folder that works on Vercel, Netlify, GitHub Pages, or even offline from a USB drive

Closed APIs would have added latency, cost, privacy concerns, and a dependency that could break or rate-limit mid-practice session. Open tools gave us a **zero-latency, always-available, offline-capable** experience — exactly what a friend preparing for interviews needs.

---

## My Agent Session

<!-- Optional: embed your Antigravity or DevRelay session here -->
<!-- {% agent_session YOUR_SESSION_ID %} -->

---

## Prize Categories

- Hacktoberfest Weekend Challenge — Build for a Friend
