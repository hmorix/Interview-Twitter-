/**
 * Dialogue Repository for Voice Question-and-Answer Practice
 * Includes the exact everyday speaking flow from the reference design
 * plus professional 5-10 minute interview tracks.
 */

const CONVERSATION_TRACKS = [
  {
    id: 'everyday-spoken',
    title: 'Daily Spoken English & Fluency',
    category: 'Conversational Speaking',
    badge: 'Trending',
    description: 'Natural back-and-forth dialogue for speaking rhythm, clear articulation, and confidence.',
    dialogues: [
      {
        id: 'es-1',
        question: 'Hi, how are you today?',
        answer: "I'm good, thanks. How about you?",
        hint: 'Friendly greeting with reciprocal question'
      },
      {
        id: 'es-2',
        question: "I'm doing well. How was your day?",
        answer: 'It was nice. I was a little busy, but it was good.',
        hint: 'Balanced, natural response'
      },
      {
        id: 'es-3',
        question: 'What did you do today?',
        answer: 'I went to work, then came home and relaxed.',
        hint: 'Past tense sequence of common activities'
      },
      {
        id: 'es-4',
        question: 'That sounds good. What do you usually do in your free time?',
        answer: 'I like watching movies, listening to music, and hanging out with friends.',
        hint: 'List hobbies with natural cadence'
      },
      {
        id: 'es-5',
        question: 'Have you seen any good movies recently?',
        answer: 'Yes, I watched an amazing thriller last weekend that kept me on the edge of my seat.',
        hint: 'Descriptive, expressive vocabulary'
      },
      {
        id: 'es-6',
        question: 'What kind of music do you enjoy most?',
        answer: 'I mostly listen to acoustic, indie rock, and some upbeat pop when working out.',
        hint: 'Specific preferences with contextual reason'
      },
      {
        id: 'es-7',
        question: 'Do you have any plans for the upcoming weekend?',
        answer: "I'm planning to go hiking with some close friends if the weather stays sunny.",
        hint: 'Future intention with conditional clause'
      }
    ]
  },
  {
    id: 'job-interview-5min',
    title: '5-Minute Job Interview Sprint',
    category: 'Job & Career Screening',
    badge: 'Popular',
    description: 'The top five core questions asked in almost every initial interview screening.',
    dialogues: [
      {
        id: 'ji-1',
        question: 'Tell me about yourself and your professional background.',
        answer: 'I have over four years of experience building high-performance web applications and delivering measurable impact with cross-functional teams.',
        hint: 'Concise present, past, and future career positioning'
      },
      {
        id: 'ji-2',
        question: 'What is your greatest professional strength?',
        answer: 'My greatest strength is distilling complex, chaotic technical ambiguity into clear, actionable execution plans.',
        hint: 'Demonstrate leadership and strategic clarity'
      },
      {
        id: 'ji-3',
        question: 'Tell me about a time you handled a difficult setback or mistake.',
        answer: 'When a release degraded performance, I took immediate ownership, rolled it back in eight minutes, and added automated regression safeguards.',
        hint: 'Ownership, speed of resolution, and preventative systems'
      },
      {
        id: 'ji-4',
        question: 'Why are you interested in joining our company?',
        answer: 'I admire your culture of engineering craft, high-velocity innovation, and customer focus, which directly aligns with my career goals.',
        hint: 'Specific alignment with company mission and values'
      },
      {
        id: 'ji-5',
        question: 'Where do you see yourself in three to five years?',
        answer: 'I see myself growing into a senior technical lead, mentoring upcoming engineers, and shaping architectural strategy for core systems.',
        hint: 'Long-term ambition, impact, and commitment to craft'
      }
    ]
  },
  {
    id: 'behavioral-star',
    title: 'Behavioral & Leadership (STAR Method)',
    category: 'Executive & HR',
    badge: 'High Impact',
    description: 'Master behavioral leadership scenarios: conflict resolution, prioritization, and team influence.',
    dialogues: [
      {
        id: 'bs-1',
        question: 'How do you handle disagreement or conflict with a colleague?',
        answer: 'I listen actively to understand their core perspective, focus on our shared business goals, and negotiate an objective compromise.',
        hint: 'Emotional intelligence, listening, and collaborative resolution'
      },
      {
        id: 'bs-2',
        question: 'How do you prioritize when everything on your plate is urgent?',
        answer: 'I use an impact versus urgency matrix tied to company OKRs, communicate trade-offs openly with stakeholders, and deliver highest-value work first.',
        hint: 'Clear prioritization framework and transparent boundaries'
      },
      {
        id: 'bs-3',
        question: 'Tell me about a time you had to deliver results under ambiguous requirements.',
        answer: 'I interviewed five power users to identify core friction, formulated clear hypotheses, and built a working prototype in weekly micro-milestones.',
        hint: 'Bias for action, customer discovery, and rapid prototyping'
      },
      {
        id: 'bs-4',
        question: 'Describe a project or achievement you are particularly proud of.',
        answer: 'I led a full checkout overhaul that lifted conversion by fourteen percent and reduced user drop-off across two million customers.',
        hint: 'Quantifiable business results and cross-team execution'
      }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONVERSATION_TRACKS };
}
