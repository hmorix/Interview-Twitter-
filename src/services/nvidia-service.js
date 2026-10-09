/**
 * NVIDIA NIM AI Service
 * Connects to NVIDIA's AI endpoints using free Llama 3.2 NIM models
 * to analyze candidate resumes, generate targeted interview rounds,
 * and provide real-time coaching & answer evaluation.
 */

// Read from Vercel/Vite environment variable if set, otherwise use the default free-tier key.
// To protect your key on Vercel: set VITE_NVIDIA_API_KEY in your Vercel project settings.
const DEFAULT_NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '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';

const STORAGE_KEY_API = 'prepsphere_nvidia_api_key';
const STORAGE_KEY_MODEL = 'prepsphere_nvidia_model';

export const AVAILABLE_MODELS = [
  { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Instruct (Fast & Accurate)', recommended: true },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (High Reasoning Depth)' },
];

export class NvidiaService {
  constructor() {
    this.apiKey = localStorage.getItem(STORAGE_KEY_API) || DEFAULT_NVIDIA_API_KEY;
    this.model = localStorage.getItem(STORAGE_KEY_MODEL) || 'meta/llama-3.2-11b-vision-instruct';
    this.baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  }

  getApiKey() {
    return this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim() || DEFAULT_NVIDIA_API_KEY;
    localStorage.setItem(STORAGE_KEY_API, this.apiKey);
  }

  resetApiKey() {
    this.apiKey = DEFAULT_NVIDIA_API_KEY;
    localStorage.removeItem(STORAGE_KEY_API);
  }

  getModel() {
    return this.model;
  }

  setModel(modelId) {
    this.model = modelId;
    localStorage.setItem(STORAGE_KEY_MODEL, modelId);
  }

  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'Respond with OK.' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Helper to call NVIDIA Chat Completions with automatic model fallback
   */
  async _callChatCompletion(messages, { temperature = 0.2, maxTokens = 1500 } = {}) {
    const modelsToTry = [
      this.model,
      'meta/llama-3.2-11b-vision-instruct',
      'openai/gpt-oss-20b'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastError = null;

    for (const modelToUse of modelsToTry) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages,
            temperature,
            max_tokens: maxTokens
          })
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(`NVIDIA model ${modelToUse} returned status ${response.status}:`, errBody);
          lastError = new Error(`NVIDIA API Error (${response.status}): ${errBody}`);
          continue; // Try next model
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content;
        }
      } catch (err) {
        console.warn(`Fetch error with model ${modelToUse}:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to communicate with NVIDIA NIM API.');
  }

  /**
   * Parse candidate profile from resume text
   */
  async analyzeProfile(resumeText) {
    const prompt = `Analyze this resume text and extract candidate profile details.
Return STRICTLY valid JSON with no markdown wrapping, no introductory text, no comments:
{
  "name": "Candidate Full Name or 'Candidate'",
  "role": "Current or detected target role (e.g., Senior Full-Stack Engineer)",
  "experienceYears": "e.g., 4+ years",
  "skills": ["Skill1", "Skill2", "Skill3", "Skill4", "Skill5", "Skill6"],
  "projects": ["Project or Key Achievement 1", "Project or Key Achievement 2"],
  "summary": "2-sentence executive summary of the candidate's background."
}

Resume text:
${resumeText.slice(0, 4000)}`;

    try {
      const raw = await this._callChatCompletion([
        { role: 'system', content: 'You are an executive talent assessment AI. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.1, maxTokens: 600 });

      return this._cleanAndParseJson(raw);
    } catch (err) {
      console.warn('Profile analysis fallback:', err);
      return this._heuristicProfileExtraction(resumeText);
    }
  }

  /**
   * Generate targeted interview questions for a specific round
   */
  async generateInterviewRound({
    resumeText,
    roundType, // 'hr', 'technical', 'project', 'situational', 'mixed'
    targetRole = '',
    difficulty = 'Mid-Senior',
    questionCount = 5
  }) {
    const roundDescriptions = {
      hr: 'HR & Cultural Round. Focus on: Introduction, career story, teamwork, conflict resolution, work ethic, motivation, handling constructive criticism, cultural fit, and behavioral STAR method.',
      technical: 'Technical & Architecture Round. Focus on: Deep dive into the candidate\'s specific programming languages, frameworks, system design patterns, debugging, performance optimization, concurrency, security, and architectural trade-offs mentioned in their resume.',
      project: 'Project Deep-Dive Round. Focus on: In-depth examination of the actual applications, systems, and metrics highlighted on their resume. Ask why specific tech stacks were chosen, what major engineering hurdles occurred, how they measured impact, and what they would re-architect today.',
      situational: 'Situational & Leadership Round. Focus on: Real-world high-pressure scenarios, handling production outages, managing tight stakeholder deadlines, resolving cross-team disagreements, mentoring junior engineers, and driving engineering quality.',
      mixed: 'Comprehensive Full Mock Interview. A realistic full-loop interview containing 1 HR opener, 2 deep technical & system questions, 1 project architectural review, and 1 situational/behavioral closing question.'
    };

    const roundInstructions = roundDescriptions[roundType] || roundDescriptions.technical;

    const systemPrompt = `You are an elite Principal Technical Interviewer and Hiring Bar Raiser at a top technology company.
Your goal is to conduct an authentic, high-caliber interview that closely tests the candidate's real capabilities based on their resume.
You MUST output ONLY a valid JSON object matching the exact specification below, with NO markdown backticks, NO commentary, NO preamble.`;

    const userPrompt = `Target Role: ${targetRole || 'Software Engineer'}
Target Round: ${roundInstructions}
Difficulty Level: ${difficulty}
Total Questions Needed: ${questionCount}

Resume Text:
"""
${resumeText.slice(0, 4500)}
"""

Generate exactly ${questionCount} realistic, rigorous, interview questions tailored directly to the details found in this candidate's resume.
For each question, provide:
- "question": The exact question spoken aloud by the interviewer.
- "answer": An exemplary, high-scoring model answer (using STAR framework for behavioral, deep technical explanation for technical questions) that the candidate should practice speaking out loud.
- "hint": A brief, high-impact coaching tip on what interviewers look for (1-2 sentences).
- "keyPoints": An array of 3-4 bullet points the answer must cover.

Return JSON format:
{
  "roundTitle": "Title of the Round",
  "roundSummary": "Brief overview of what this round assesses",
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "answer": "...",
      "hint": "...",
      "keyPoints": ["...", "...", "..."]
    }
  ]
}`;

    try {
      const raw = await this._callChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.25, maxTokens: 2500 });

      const parsed = this._cleanAndParseJson(raw);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed;
      }
      throw new Error('AI returned an invalid question format.');
    } catch (err) {
      console.warn('NVIDIA API call failed, using intelligent local generator:', err);
      return this._generateIntelligentFallbackQuestions({ resumeText, roundType, targetRole, questionCount });
    }
  }

  /**
   * Evaluate candidate's verbal or typed response in real-time
   */
  async evaluateAnswer({ question, modelAnswer, userAnswer, roundType = 'technical' }) {
    if (!userAnswer || userAnswer.trim().length < 5) {
      return {
        score: 0,
        verdict: 'Incomplete Answer',
        strengths: 'No response detected.',
        missedPoints: 'Please speak or type a complete response to receive feedback.',
        coachingTip: 'Structure your answer with a clear opening, details, and conclusion.',
        improvedAnswer: modelAnswer
      };
    }

    const systemPrompt = `You are a strict yet constructive interview coach. Analyze the candidate's response against the question and expected model answer. Output ONLY a valid JSON object.`;

    const userPrompt = `Interview Round: ${roundType}
Question: "${question}"
Model Answer / Benchmark: "${modelAnswer}"
Candidate's Spoken / Typed Response: "${userAnswer}"

Evaluate the candidate's answer. Return strictly this JSON:
{
  "score": 8.5,
  "verdict": "Strong Answer / Needs More Depth / Excellent / Vague",
  "strengths": "1-2 sentences highlighting what was well explained.",
  "missedPoints": "1-2 sentences explaining what key metrics, details, or depth were missing.",
  "coachingTip": "Actionable advice on how to deliver this answer better in a real interview.",
  "improvedAnswer": "A polished 2-3 sentence version of what the candidate could say."
}`;

    try {
      const raw = await this._callChatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.2, maxTokens: 800 });

      const parsed = this._cleanAndParseJson(raw);
      if (parsed && typeof parsed.score === 'number') {
        return parsed;
      }
      throw new Error('Failed to parse AI evaluation.');
    } catch (err) {
      console.warn('Real-time evaluation fallback:', err);
      return this._heuristicAnswerEvaluation(userAnswer, modelAnswer);
    }
  }

  // ─── UTILITIES & PARSING ──────────────────────────────────────────────────

  _cleanAndParseJson(text) {
    if (!text) throw new Error('Empty AI response');
    let cleaned = text.trim();

    // Strip markdown codeblocks ```json ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
      const endIdx = cleaned.lastIndexOf('```');
      if (endIdx !== -1) {
        cleaned = cleaned.substring(0, endIdx).trim();
      }
    }

    // Find first { or [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = 0;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) cleaned = cleaned.substring(startIdx, lastBrace + 1);
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      const lastBracket = cleaned.lastIndexOf(']');
      if (lastBracket !== -1) cleaned = cleaned.substring(startIdx, lastBracket + 1);
    }

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Fix potential unescaped newlines or trailing commas
      const relaxed = cleaned
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/\n/g, ' ');
      return JSON.parse(relaxed);
    }
  }

  _heuristicProfileExtraction(resumeText) {
    const text = resumeText || '';
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const candidateName = lines[0]?.slice(0, 40) || 'Candidate';

    const techKeywords = [
      'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
      'Python', 'Django', 'FastAPI', 'Java', 'Spring', 'Go', 'Golang', 'Rust', 'C++',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'Docker', 'Kubernetes',
      'AWS', 'Azure', 'GCP', 'GraphQL', 'REST', 'CI/CD', 'Git', 'Next.js'
    ];

    const lowerText = text.toLowerCase();
    const isWordChar = (c) => /[a-z0-9_]/.test(c);

    const detectedSkills = techKeywords.filter(k => {
      const lk = k.toLowerCase();
      let pos = 0;
      while ((pos = lowerText.indexOf(lk, pos)) !== -1) {
        const before = pos === 0 ? ' ' : lowerText[pos - 1];
        const after = pos + lk.length >= lowerText.length ? ' ' : lowerText[pos + lk.length];
        if (!isWordChar(before) && !isWordChar(after)) {
          return true;
        }
        pos += lk.length;
      }
      return false;
    }).slice(0, 8);

    return {
      name: candidateName,
      role: 'Software Engineer',
      experienceYears: '3+ years',
      skills: detectedSkills.length ? detectedSkills : ['Full-Stack Development', 'Problem Solving', 'System Design'],
      projects: ['Full-Stack Application Development', 'API Architecture & Optimization'],
      summary: 'Experienced engineer with demonstrated background in designing, developing, and deploying software systems.'
    };
  }

  _generateIntelligentFallbackQuestions({ resumeText, roundType, targetRole, questionCount = 5 }) {
    const profile = this._heuristicProfileExtraction(resumeText);
    const skills = profile.skills;
    const s1 = skills[0] || 'your core language';
    const s2 = skills[1] || 'your primary framework';
    const s3 = skills[2] || 'relational databases';

    const roundDataMap = {
      hr: {
        roundTitle: 'HR & Behavioral Culture Round',
        roundSummary: 'Assessing your background, communication clarity, conflict resolution, and teamwork using the STAR method.',
        questions: [
          {
            id: 'q1',
            question: `Could you walk me through your background and the most impactful project you've worked on recently?`,
            answer: `Certainly. Over the past few years as a ${targetRole || profile.role}, I have focused on building scalable, reliable applications. In my recent work, I spearheaded the development of a core system that served thousands of users, where I was responsible for end-to-end architecture from frontend components to backend APIs. I love tackling complex technical challenges and collaborating across cross-functional teams to deliver measurable business impact.`,
            hint: 'Structure using Present, Past, and Future fit for the role.',
            keyPoints: ['Overview of career journey', 'Highlight a specific project outcome', 'Express enthusiasm for the target role']
          },
          {
            id: 'q2',
            question: `Tell me about a time you had a technical disagreement with a teammate or lead. How did you resolve it?`,
            answer: `On a previous project, a teammate and I disagreed on whether to use client-side state caching versus server-driven updates. Rather than debating opinions, I proposed running a lightweight spike and measuring the memory overhead and latency under realistic network constraints. The data demonstrated that our approach kept payload sizes minimal while maintaining freshness. We agreed on the data-backed solution, documented the design rationale, and delivered the feature on schedule.`,
            hint: 'Use STAR: Situation, Task, Action (data-driven/respectful), Result.',
            keyPoints: ['Depersonalize the disagreement', 'Focus on data and user experience', 'Demonstrate collaborative alignment']
          },
          {
            id: 'q3',
            question: `Describe a situation where a project deadline was at risk. What steps did you take to manage it?`,
            answer: `When an unexpected third-party integration delay threatened our release sprint, I immediately alerted my product manager with an impact assessment. I proposed separating the deliverables into a core MVP with high-priority user journeys and deferring secondary non-critical enhancements. By ruthlessly prioritizing and aligning with stakeholders early, we released the core feature on time with zero regressions.`,
            hint: 'Emphasize proactive communication, scope negotiation, and ownership.',
            keyPoints: ['Early transparent communication', 'Scope triage and MVP definition', 'Delivered without sacrificing quality']
          },
          {
            id: 'q4',
            question: `How do you stay up to date with rapidly evolving technologies and best practices?`,
            answer: `I maintain continuous learning through reading engineering blogs like Uber, Netflix, and GitHub engineering posts, experimenting with new libraries in personal prototypes, and participating in code reviews where our team shares patterns. When an emerging tool solves an active bottleneck in our stack, I build a small proof-of-concept before recommending team adoption.`,
            hint: 'Demonstrate curiosity, structured learning, and practical evaluation.',
            keyPoints: ['Specific trusted learning sources', 'Hands-on experimentation', 'Translating learning into team value']
          },
          {
            id: 'q5',
            question: `What are you looking for in your next role, and why are you interested in joining us?`,
            answer: `I am looking for an environment where engineering excellence, high ownership, and user empathy are prioritized. In my next position, I want to take on challenging distributed systems problems, collaborate with driven peers, and help scale products that deliver genuine value to users. Your team's mission and engineering standards closely match where I want to grow my career.`,
            hint: 'Connect your personal growth goals to the company’s mission.',
            keyPoints: ['Clarity on career ambitions', 'Alignment with team culture', 'Focus on making meaningful impact']
          }
        ]
      },
      technical: {
        roundTitle: 'Technical & System Architecture Round',
        roundSummary: 'Testing your engineering depth, technology stack internals, and architecture choices based on your resume.',
        questions: [
          {
            id: 'q1',
            question: `On your resume you highlighted experience with ${s1} and ${s2}. How do you ensure high performance and prevent bottlenecks in production?`,
            answer: `To maximize performance, I optimize across three primary layers: execution efficiency, network latency, and memory management. In ${s1}, I ensure async workflows avoid blocking the main thread, leverage connection pooling for databases, and implement Redis caching for expensive queries. On the client side with ${s2}, I utilize code splitting, memoization for costly calculations, and monitor Core Web Vitals to keep time-to-interactive under two seconds.`,
            hint: 'Break down by frontend, backend, caching, and observability.',
            keyPoints: ['Layered optimization strategy', 'Concurrency and non-blocking I/O', 'Caching and metric observability']
          },
          {
            id: 'q2',
            question: `How do you design a robust error handling and resilience strategy for distributed API calls?`,
            answer: `I implement defensive error handling with structured status codes, exponential backoff with jitter for retries, and circuit breakers using libraries like Resilience4j or Opossum to prevent cascading failures. For state-changing mutations, I enforce idempotency keys to ensure retried requests never cause duplicate records. All unexpected exceptions are structured in JSON and logged to centralized APM like Datadog with distributed trace IDs.`,
            hint: 'Mention exponential backoff, circuit breakers, idempotency, and tracing.',
            keyPoints: ['Circuit breaker and backoff', 'Idempotent API mutations', 'Distributed tracing and logging']
          },
          {
            id: 'q3',
            question: `When working with ${s3}, how do you approach database schema design, indexing, and slow query optimization?`,
            answer: `I start with clean normalization for data integrity and selectively denormalize only for read-heavy hotspots. When queries degrade, I analyze execution plans using EXPLAIN ANALYZE to detect sequential table scans and missing composite indexes. I ensure high-cardinality columns in WHERE and JOIN clauses are indexed appropriately, while avoiding over-indexing which penalizes write throughput.`,
            hint: 'Explain EXPLAIN ANALYZE, composite indexes, read/write trade-offs.',
            keyPoints: ['EXPLAIN ANALYZE inspection', 'Strategic indexing balance', 'Connection pooling and pagination']
          },
          {
            id: 'q4',
            question: `Can you explain the trade-offs between monolithic architecture versus microservices based on your experience?`,
            answer: `A modular monolith offers simple deployments, transactional consistency via single database ACID transactions, and zero network serialization overhead, making it ideal for fast development and early stage systems. Microservices decouple deploy cycles and allow independent scaling across teams, but introduce network latency, distributed transactions, eventual consistency challenges, and infrastructure complexity. I advocate starting modular and splitting services only along clear domain boundaries.`,
            hint: 'Discuss operational overhead, latency, transactions, and domain boundaries.',
            keyPoints: ['Modularity before microservices', 'Distributed transaction complexity', 'Independent scaling and deployment boundaries']
          },
          {
            id: 'q5',
            question: `How do you approach automated testing to maintain velocity without sacrificing quality?`,
            answer: `I adhere to a pragmatic testing pyramid: a comprehensive base of fast unit tests for business logic, integration tests for API routes and database transactions using containerized test environments, and a focused suite of end-to-end smoke tests for critical user journeys. In CI/CD pipelines, tests run automatically on every pull request with linting and coverage gates before merging to main.`,
            hint: 'Reference testing pyramid, mock boundaries, and CI/CD gating.',
            keyPoints: ['Unit vs integration vs E2E balance', 'Dockerized test databases', 'Automated CI/CD pull request gates']
          }
        ]
      },
      project: {
        roundTitle: 'Project Deep-Dive Round',
        roundSummary: 'Drilling down into the architectural choices, scalability hurdles, and outcomes of your resume projects.',
        questions: [
          {
            id: 'q1',
            question: `Walk me through the architecture of the most technically challenging project on your resume. What was the high-level data flow?`,
            answer: `In that project, we designed a distributed client-server architecture. The frontend consumed REST and GraphQL endpoints backed by an API gateway. The gateway routed traffic to decoupled micro-services connected to a PostgreSQL cluster with Redis caching for read acceleration. Asynchronous events were ingested into a message queue to decouple long-running jobs from synchronous user requests.`,
            hint: 'Outline ingress, gateway, services, persistence, and async pipelines.',
            keyPoints: ['Clear system components', 'Synchronous vs asynchronous separation', 'Caching and data persistence layer']
          },
          {
            id: 'q2',
            question: `What was the biggest technical roadblock or bug you encountered during that project, and how did you diagnose it?`,
            answer: `During load testing before our launch, we noticed sporadic response timeouts under high concurrent load. By profiling application metrics and analyzing thread dumps, I traced the bottleneck to database connection exhaustion caused by unclosed connections in an error-handling block. I refactored the connection lifecycle using connection pooling with strict timeouts and added automated health checks, which stabilized latency under three times our target traffic.`,
            hint: 'Frame as: Symptom, Diagnostics/Profiling, Root cause, Fix, Verification.',
            keyPoints: ['Systematic diagnostic approach', 'Identified root cause rather than treating symptoms', 'Verified with stress testing']
          },
          {
            id: 'q3',
            question: `If you had to rebuild that project today with what you know now, what architectural decision would you change?`,
            answer: `If rebuilding today, I would invest earlier in strict API schema contracts using TypeScript and OpenAPI from day one, rather than retrofitting them later. I would also establish structured logging and OpenTelemetry tracing right from the initial sprint, which would have saved dozens of hours debugging distributed latency across microservices.`,
            hint: 'Shows humility, engineering maturity, and continuous reflection.',
            keyPoints: ['Specific technical improvement', 'Reflects on developer productivity', 'Focuses on observability and contracts']
          }
        ]
      },
      situational: {
        roundTitle: 'Situational & Leadership Round',
        roundSummary: 'Evaluating your decision making, crisis response, prioritization, and technical leadership.',
        questions: [
          {
            id: 'q1',
            question: `A critical production outage occurs after a Friday afternoon deployment. What is your immediate incident response process?`,
            answer: `My immediate priority is containment and customer impact mitigation, not assigning blame. First, I trigger our standard rollback procedure to restore the last known healthy release. Once traffic is stabilized, I update the status page and stakeholders with clear timelines. Afterward, I lead a blameless post-mortem to analyze the root cause, identifying automated tests and monitoring alerts needed to prevent recurrence.`,
            hint: 'Prioritize rollback/containment over debugging on live production.',
            keyPoints: ['Mitigation before root cause analysis', 'Transparent stakeholder communication', 'Blameless post-mortem and permanent fixes']
          },
          {
            id: 'q2',
            question: `How do you handle technical debt when product managers are pushing strictly for new feature deliverables?`,
            answer: `I translate technical debt into business language: quantifying how unaddressed debt increases bug count, slows sprint velocity, and risks customer churn. I negotiate a continuous cadence, allocating roughly twenty percent of every sprint toward maintenance and refactoring. By pairing debt remediation with upcoming feature initiatives, we improve stability while continuing to ship value.`,
            hint: 'Frame tech debt as business risk and velocity impact.',
            keyPoints: ['Quantify business impact', 'Continuous sprint allocation (15-20%)', 'Align refactoring with feature roadmaps']
          }
        ]
      },
      mixed: {
        roundTitle: 'Comprehensive Mock Interview',
        roundSummary: 'Holistic real-world interview loop covering background, technical depth, project review, and situational handling.',
        questions: [
          {
            id: 'q1',
            question: `Tell me about yourself and what distinguishes your engineering work from other candidates.`,
            answer: `I am a software engineer focused on building robust, high-performance web applications. What distinguishes my work is an obsession with both clean architectural fundamentals and actual user outcomes. I take full ownership from database design to frontend polish, ensuring our systems scale reliably while delivering an intuitive user experience.`,
            hint: 'Crisp summary highlighting craft, ownership, and product impact.',
            keyPoints: ['Strong opening', 'Engineering craft and ownership', 'Track record of delivery']
          },
          {
            id: 'q2',
            question: `How do you architect an application to gracefully handle high traffic spikes and sudden concurrency surges?`,
            answer: `I apply horizontal scaling behind load balancers with health checks, move expensive operations into asynchronous message queues like RabbitMQ or Kafka, and utilize multi-tier caching with Redis and CDN edge caching for static and semi-static assets. Additionally, I implement rate limiting at the API gateway to protect downstream databases from cascading failures.`,
            hint: 'Address horizontal scaling, queuing, caching, and rate limiting.',
            keyPoints: ['Asynchronous decoupling', 'Multi-tier caching', 'Load balancing and rate limiting']
          },
          {
            id: 'q3',
            question: `Looking at your resume projects, what was the most satisfying optimization you implemented?`,
            answer: `In my previous project, we had a reporting dashboard with multi-second load times. By analyzing slow query logs, restructuring the queries with compound indexes, and adding server-side Redis caching with a five-minute TTL, we reduced p95 response time from three point four seconds down to under one hundred and eighty milliseconds.`,
            hint: 'State initial metric, the diagnostic technique, the solution, and final metric.',
            keyPoints: ['Clear baseline metric', 'Data-driven diagnosis', 'Massive measurable improvement']
          },
          {
            id: 'q4',
            question: `How do you ensure strong code quality and security across pull requests within your engineering team?`,
            answer: `We enforce automated CI/CD linting, static analysis, unit test coverage gates, and dependency vulnerability scans before PR review. During peer code reviews, I check for edge cases, SQL/XSS injection vulnerabilities, proper authorization checks, and maintainability. I keep feedback constructive and focused on architectural patterns rather than stylistic preferences.`,
            hint: 'Combine automated tooling with thoughtful peer code reviews.',
            keyPoints: ['Automated CI gating', 'Security vulnerability mindfulness', 'Constructive culture in code reviews']
          }
        ]
      }
    };

    const selected = roundDataMap[roundType] || roundDataMap.technical;
    return {
      roundTitle: selected.roundTitle,
      roundSummary: selected.roundSummary,
      questions: selected.questions.slice(0, questionCount)
    };
  }

  _heuristicAnswerEvaluation(userAnswer, modelAnswer) {
    const userWords = (userAnswer || '').trim().split(/\s+/).filter(Boolean);
    const count = userWords.length;

    let score = 5.0;
    let verdict = 'Fair Answer';

    if (count > 50) {
      score = 8.5;
      verdict = 'Strong & Comprehensive';
    } else if (count > 25) {
      score = 7.0;
      verdict = 'Good Foundation';
    } else if (count > 10) {
      score = 5.5;
      verdict = 'Needs More Detail';
    } else {
      score = 3.5;
      verdict = 'Too Brief';
    }

    return {
      score,
      verdict,
      strengths: 'Good attempt addressing the question directly. Your response shows foundational understanding of the core concept.',
      missedPoints: 'Could expand further by including specific technical terms, quantifiable metrics, and real-world project context.',
      coachingTip: 'Use the STAR method (Situation, Task, Action, Result) to make your verbal answer more compelling and memorable.',
      improvedAnswer: modelAnswer
    };
  }
}
