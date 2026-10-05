/**
 * Questions & Quest Data — Individual ("I") and Business tracks
 * Expanded with more questions and fixes for Business track loading
 */

export const INITIAL_QUESTS = {
  individual: [
    {
      id: 'ind-everyday',
      title: 'Everyday Speaking & Natural Flow',
      category: 'Daily Conversation',
      target: 'Individual ("I")',
      description: 'Natural back-and-forth dialogue. Questions in black, your spoken answers in red.',
      dialogues: [
        {
          id: 'd1',
          question: 'Hi, how are you today?',
          answer: "I'm good, thanks. How about you?",
          hint: 'Friendly greeting with reciprocal question'
        },
        {
          id: 'd2',
          question: "I'm doing well. How was your day?",
          answer: 'It was nice. I was a little busy, but it was good.',
          hint: 'Simple and natural daily response'
        },
        {
          id: 'd3',
          question: 'What did you do today?',
          answer: 'I went to work, then came home and relaxed.',
          hint: 'Past tense sequence'
        },
        {
          id: 'd4',
          question: 'What do you usually do in your free time?',
          answer: 'I like watching movies, listening to music, and hanging out with friends.',
          hint: 'List hobbies naturally'
        },
        {
          id: 'd5',
          question: 'Have you seen any good movies recently?',
          answer: 'Yes, I watched an amazing thriller last weekend that kept me on the edge of my seat.',
          hint: 'Descriptive and expressive'
        },
        {
          id: 'd6',
          question: 'What kind of music do you enjoy most?',
          answer: 'I mostly listen to acoustic and indie rock, especially when I am working or relaxing.',
          hint: 'Specific preference with context'
        },
        {
          id: 'd7',
          question: 'Do you have any plans for the weekend?',
          answer: "I'm planning to go hiking with some friends if the weather stays nice.",
          hint: 'Future intention with condition'
        },
        {
          id: 'd8',
          question: 'Where do you like to travel?',
          answer: 'I love exploring mountains and coastal towns because they are peaceful and beautiful.',
          hint: 'Travel preference with reason'
        },
        {
          id: 'd9',
          question: 'Do you prefer tea or coffee in the morning?',
          answer: 'I prefer coffee because it helps me feel more alert and ready to start the day.',
          hint: 'Simple preference with reason'
        },
        {
          id: 'd10',
          question: 'What is your favorite way to unwind after a long day?',
          answer: 'I like to read a book, take a short walk, or just sit quietly and listen to music.',
          hint: 'Relaxation habits'
        }
      ]
    },
    {
      id: 'ind-job-interview',
      title: 'Personal Job Interview Sprint',
      category: 'Career & Screening',
      target: 'Individual ("I")',
      description: 'The most asked screening questions in personal job interviews — practice your pitch.',
      dialogues: [
        {
          id: 'j1',
          question: 'Tell me about yourself and your professional background.',
          answer: 'I have over four years of experience building scalable web applications and leading cross-functional teams to deliver high-impact results.',
          hint: 'Present, past, future career narrative'
        },
        {
          id: 'j2',
          question: 'What is your greatest professional strength?',
          answer: 'My greatest strength is turning complex problems into clear, structured solutions that the whole team can execute effectively.',
          hint: 'Strength with evidence'
        },
        {
          id: 'j3',
          question: 'Can you describe a challenging situation and how you handled it?',
          answer: 'When a critical system went down in production, I immediately led the incident response, isolated the root cause, and restored service within fifteen minutes.',
          hint: 'STAR method: action and result'
        },
        {
          id: 'j4',
          question: 'Why do you want to work here?',
          answer: 'I genuinely admire your commitment to innovation, your engineering culture, and the scale of problems your team solves every day.',
          hint: 'Specific and genuine motivation'
        },
        {
          id: 'j5',
          question: 'Where do you see yourself in three to five years?',
          answer: 'I see myself growing into a senior technical leader, mentoring others, and driving impactful decisions at a larger scale.',
          hint: 'Ambitious but realistic vision'
        },
        {
          id: 'j6',
          question: 'What is an area you are actively working to improve?',
          answer: 'I have been working on becoming a better delegator, trusting my team more and creating space for them to grow and take ownership.',
          hint: 'Genuine weakness with active improvement'
        },
        {
          id: 'j7',
          question: 'How do you handle tight deadlines and high-pressure situations?',
          answer: 'I stay calm by breaking the problem into smaller tasks, communicating clearly with stakeholders, and focusing on what matters most first.',
          hint: 'Calm, structured, communicative approach'
        },
        {
          id: 'j8',
          question: 'Do you prefer working alone or in a team?',
          answer: 'I enjoy both. I am focused and productive when working independently, but I also thrive when collaborating and learning from others.',
          hint: 'Balanced and honest answer'
        }
      ]
    },
    {
      id: 'ind-self-intro',
      title: 'English Speaking Confidence Builder',
      category: 'Fluency & Pronunciation',
      target: 'Individual ("I")',
      description: 'Build pronunciation confidence with clear sentences on everyday personal topics.',
      dialogues: [
        {
          id: 'e1',
          question: 'Can you introduce yourself briefly?',
          answer: 'My name is Alex. I am a software developer with a passion for building clean and useful products.',
          hint: 'Clear self-introduction'
        },
        {
          id: 'e2',
          question: 'What do you do for a living?',
          answer: 'I work as a web developer at a technology company where I build interfaces and solve user problems.',
          hint: 'Simple job description'
        },
        {
          id: 'e3',
          question: 'What city do you live in?',
          answer: 'I currently live in Bangalore, which is a bustling and vibrant city with a great startup culture.',
          hint: 'Location with descriptive detail'
        },
        {
          id: 'e4',
          question: 'Do you enjoy your work?',
          answer: 'Yes, I really enjoy my work because every day brings new challenges that keep me curious and motivated.',
          hint: 'Positive and specific answer'
        },
        {
          id: 'e5',
          question: 'What are you currently learning or improving?',
          answer: 'Right now I am improving my system design skills and learning more about cloud infrastructure and scalability.',
          hint: 'Shows growth mindset'
        },
        {
          id: 'e6',
          question: 'Tell me something interesting about yourself.',
          answer: 'I love photography and hiking. Combining both lets me capture stunning landscapes that most people never get to see.',
          hint: 'Memorable personal detail'
        }
      ]
    },
    {
      id: 'ind-opinions',
      title: 'Opinions, Preferences & Discussion',
      category: 'Discussion & Opinion',
      target: 'Individual ("I")',
      description: 'Express opinions, give reasons, and discuss ideas clearly in everyday English.',
      dialogues: [
        {
          id: 'op1',
          question: 'What is your opinion on social media?',
          answer: 'I think social media can be useful for staying connected, but too much of it can be distracting and affect your mental health.',
          hint: 'Balanced opinion with reason'
        },
        {
          id: 'op2',
          question: 'Do you think working from home is better than working in an office?',
          answer: 'I believe it depends on the person. I personally prefer working from home because I am more focused and save a lot of commute time.',
          hint: 'Personal stance with justification'
        },
        {
          id: 'op3',
          question: 'Would you rather live in a big city or a small town?',
          answer: 'I would rather live in a big city because it offers more opportunities, better infrastructure, and a more vibrant lifestyle.',
          hint: 'Clear preference with multiple reasons'
        },
        {
          id: 'op4',
          question: 'What do you think is the most important quality in a good friend?',
          answer: 'I think honesty is the most important quality because a true friend should always tell you the truth even when it is difficult.',
          hint: 'Definite opinion with explanation'
        },
        {
          id: 'op5',
          question: 'If you could change one thing about your daily routine, what would it be?',
          answer: 'If I could change one thing, I would wake up earlier so I have more quiet time in the morning before the day gets busy.',
          hint: 'Conditional structure with reason'
        },
        {
          id: 'op6',
          question: 'How do you feel about technology changing so fast?',
          answer: 'I find it exciting but also a little overwhelming. I try to keep up with the most relevant changes and not worry about everything else.',
          hint: 'Mixed feelings expressed naturally'
        },
        {
          id: 'op7',
          question: 'Do you think reading books is still important in the digital age?',
          answer: 'Absolutely. Reading books improves your focus, vocabulary, and ability to think deeply, which you cannot easily get from scrolling through short content online.',
          hint: 'Strong opinion with contrast'
        },
        {
          id: 'op8',
          question: 'What is one skill you think everyone should learn?',
          answer: 'I think everyone should learn how to communicate effectively because it improves every area of life including work, relationships, and personal growth.',
          hint: 'Universal recommendation with broad reasoning'
        },
        {
          id: 'op9',
          question: 'Do you prefer spending money on experiences or on things?',
          answer: 'I definitely prefer spending on experiences because memories and moments last much longer and make me happier than any object I could buy.',
          hint: 'Clear preference with emotional reasoning'
        },
        {
          id: 'op10',
          question: 'How important is it to have a daily routine?',
          answer: 'I think routines are very important because they reduce decision fatigue, create a sense of stability, and help you use your time more intentionally.',
          hint: 'Multiple reasons, structured answer'
        }
      ]
    },
    {
      id: 'ind-situations',
      title: 'Real-Life Situations & Responses',
      category: 'Practical English',
      target: 'Individual ("I")',
      description: 'Practice speaking naturally in real scenarios: shops, offices, restaurants, travel.',
      dialogues: [
        {
          id: 's1',
          question: 'Excuse me, could you tell me how to get to the nearest metro station?',
          answer: 'Sure! Go straight down this road for about five minutes, then turn left at the traffic light. The station will be on your right.',
          hint: 'Clear, step-by-step directions'
        },
        {
          id: 's2',
          question: 'Hi, I would like to order. What do you recommend?',
          answer: 'Our grilled chicken sandwich is very popular, and I personally love the pasta with cream sauce. Both are excellent choices.',
          hint: 'Restaurant recommendation, warm and helpful'
        },
        {
          id: 's3',
          question: 'I am calling to check on the status of my order.',
          answer: 'Of course. Could you please provide me your order number? I will look it up right away and give you a full update.',
          hint: 'Professional and helpful phone response'
        },
        {
          id: 's4',
          question: 'I am not sure I understand the instructions. Could you explain again?',
          answer: 'Of course, no problem at all. Let me break it down step by step so it is completely clear.',
          hint: 'Patient and reassuring response'
        },
        {
          id: 's5',
          question: 'Sorry, I am running ten minutes late for the meeting.',
          answer: 'No worries at all. Take your time and drive safely. We will wait for you and begin once you arrive.',
          hint: 'Calm and reassuring reply'
        },
        {
          id: 's6',
          question: 'Could I ask you to review this document before the deadline?',
          answer: 'Of course, I would be happy to review it. Please send it to me by this afternoon and I will get back to you before end of day.',
          hint: 'Professional agreement with timeline'
        },
        {
          id: 's7',
          question: 'We are fully booked tonight, but we have a table available at eight thirty.',
          answer: 'Eight thirty works perfectly for us. I will book that time. Could I also request a quiet table away from the entrance?',
          hint: 'Polite acceptance with an additional request'
        },
        {
          id: 's8',
          question: 'I think there might be an error in this invoice.',
          answer: 'Thank you for pointing that out. Let me double check the figures and correct it immediately so you have the accurate version.',
          hint: 'Professional, calm, solution-focused'
        }
      ]
    }
  ],

  business: [
    {
      id: 'biz-behavioral',
      title: 'Executive Behavioral & STAR Leadership',
      category: 'Leadership & Strategy',
      target: 'Business',
      description: 'Senior management and executive-level behavioral scenarios for high-stakes interviews.',
      dialogues: [
        {
          id: 'b1',
          question: 'How do you handle conflict with a senior business stakeholder?',
          answer: 'I listen first to understand their core business drivers, align on our shared company objective, and then propose a data-backed compromise that works for both sides.',
          hint: 'Empathy, alignment, and objective solution'
        },
        {
          id: 'b2',
          question: 'How do you prioritize deliverables when every department claims top urgency?',
          answer: 'I apply an impact versus effort matrix tied directly to company OKRs, communicate the trade-offs openly to stakeholders, and focus team bandwidth on the highest business value first.',
          hint: 'Framework-driven prioritization'
        },
        {
          id: 'b3',
          question: 'Tell me about a time you delivered under highly ambiguous requirements.',
          answer: 'I conducted discovery sessions with key users to identify the real problem, established clear and testable hypotheses, and shipped a functional prototype within two weekly sprints.',
          hint: 'Customer discovery, hypothesis, iteration'
        },
        {
          id: 'b4',
          question: 'How do you lead cross-functional teams without direct authority?',
          answer: 'I align the initiative with each team\'s specific goals and metrics, take care of operational overhead myself, and maintain full transparency through shared documentation.',
          hint: 'Lateral leadership and empathy'
        },
        {
          id: 'b5',
          question: 'Describe a project where you drove measurable business impact.',
          answer: 'I led a complete checkout flow redesign that increased conversion by fourteen percent and generated over one million dollars in additional annual revenue.',
          hint: 'Quantified business results'
        },
        {
          id: 'b6',
          question: 'How do you handle a team member who is consistently underperforming?',
          answer: 'I first have a private one-on-one to understand their challenges, then co-create a clear performance improvement plan with weekly check-ins and honest, constructive feedback.',
          hint: 'Coaching, private feedback, structured plan'
        },
        {
          id: 'b7',
          question: 'How do you ensure alignment across remote or distributed teams?',
          answer: 'I establish clear async documentation, run focused synchronous meetings only when truly needed, and invest in building trust through regular one-on-one connections.',
          hint: 'Async-first, documentation, trust'
        },
        {
          id: 'b8',
          question: 'What is your approach to making high-stakes decisions with incomplete data?',
          answer: 'I identify the most critical unknowns, make explicit assumptions I can validate quickly, and design a reversible decision that limits downside risk while still moving forward.',
          hint: 'Assumptions, reversibility, structured risk'
        }
      ]
    },
    {
      id: 'biz-product-strategy',
      title: 'Product Strategy & Business Metrics',
      category: 'Product Management',
      target: 'Business',
      description: 'Metric triage, roadmap decisions, and revenue-focused product thinking scenarios.',
      dialogues: [
        {
          id: 'p1',
          question: 'Daily active users dropped by twelve percent this week. How do you investigate?',
          answer: 'First I verify the analytics pipeline is recording correctly, then segment the drop by platform, region, and user cohort to isolate whether it is a product bug, a tracking error, or a seasonal pattern.',
          hint: 'Data integrity first, then segmentation'
        },
        {
          id: 'p2',
          question: 'How do you decide what to cut from an MVP scope?',
          answer: 'I identify the single riskiest assumption the product must validate, keep only the minimum feature set that delivers the core user value, and defer everything else to the next iteration.',
          hint: 'Risk-first, minimum viable value'
        },
        {
          id: 'p3',
          question: 'How do you balance technical debt against new feature development?',
          answer: 'I allocate a fixed twenty percent of each sprint capacity to technical health, ensuring that the system remains scalable and maintainable while we still ship valuable features to users.',
          hint: 'Fixed capacity allocation'
        },
        {
          id: 'p4',
          question: 'Walk me through how you use data and user research together.',
          answer: 'Quantitative data tells me what is happening at scale, such as where users drop off. User interviews then explain why it is happening. Combining both gives me the full picture before making decisions.',
          hint: 'Quantitative plus qualitative synergy'
        },
        {
          id: 'p5',
          question: 'How do you build a product roadmap that gets buy-in from engineering and business?',
          answer: 'I use RICE scoring to prioritize objectively, allocate dedicated capacity for both commercial features and technical health, and run open roadmap reviews where every stakeholder can see the reasoning.',
          hint: 'RICE, capacity allocation, transparency'
        },
        {
          id: 'p6',
          question: 'How do you respond when engineering says your timeline is not achievable?',
          answer: 'I sit down with the technical lead, walk through the full estimate together, identify what is driving most of the complexity, and then negotiate a phased scope that delivers the critical eighty percent on time.',
          hint: 'Collaboration, diagnosis, phased scope'
        }
      ]
    },
    {
      id: 'biz-client-communication',
      title: 'Business Communication & Client Conversations',
      category: 'Client & Sales',
      target: 'Business',
      description: 'Professional spoken English for client meetings, pitches, and stakeholder updates.',
      dialogues: [
        {
          id: 'c1',
          question: 'Can you walk us through your company\'s core value proposition?',
          answer: 'We help growing businesses automate their most time-consuming workflows, cutting operational costs by up to forty percent and freeing their teams to focus on higher-value work.',
          hint: 'Problem, solution, quantified benefit'
        },
        {
          id: 'c2',
          question: 'How do you ensure client satisfaction throughout a project?',
          answer: 'We maintain weekly progress updates, create shared milestones that everyone agrees on upfront, and proactively surface risks the moment we identify them rather than waiting for a review.',
          hint: 'Transparency, milestones, proactive risk'
        },
        {
          id: 'c3',
          question: 'What sets your team apart from your competitors?',
          answer: 'We combine deep technical expertise with a genuine obsession for user outcomes, which means we do not just build what is asked, we build what actually solves the underlying problem.',
          hint: 'Technical depth plus user focus'
        },
        {
          id: 'c4',
          question: 'How do you handle a situation where a client is unhappy with the progress?',
          answer: 'I acknowledge their concern immediately, share a transparent status with what is working and what is not, and present a specific corrective action plan with realistic new timelines.',
          hint: 'Acknowledge, transparent status, action plan'
        },
        {
          id: 'c5',
          question: 'Can you describe your onboarding process for a new client?',
          answer: 'We start with a discovery workshop to deeply understand the business goals, then set clear success criteria, assign a dedicated account manager, and run weekly syncs through the first ninety days.',
          hint: 'Discovery, success criteria, dedicated support'
        }
      ]
    }
  ]
};

// ─── LocalStorage: Custom Quest CRUD ────────────────────────────────────────

const STORAGE_KEY = 'prepsphere_custom_quests_v2';

export function loadCustomQuests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

export function saveCustomQuest(quest) {
  const all = loadCustomQuests();
  const idx = all.findIndex(q => q.id === quest.id);
  if (idx >= 0) all[idx] = quest; else all.unshift(quest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function deleteCustomQuest(id) {
  const filtered = loadCustomQuests().filter(q => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}
