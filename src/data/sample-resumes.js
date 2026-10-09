/**
 * Sample Resumes for instant 1-click testing
 */

export const SAMPLE_RESUMES = [
  {
    id: 'fullstack-senior',
    title: 'Senior Full-Stack Engineer',
    role: 'Senior Full-Stack Engineer',
    badge: 'React & Node.js',
    text: `ALEX RIVERA
San Francisco, CA | alex.rivera@example.com | linkedin.com/in/alexrivera-dev | github.com/alexrivera

SUMMARY
Results-driven Senior Full-Stack Engineer with 5+ years of experience architecting resilient distributed web applications. Expert in React, TypeScript, Node.js, GraphQL, PostgreSQL, and AWS cloud infrastructure. Passionate about web performance, developer experience, and building fault-tolerant scalable systems.

EXPERIENCE
Lead Full-Stack Engineer | Apex Cloud Solutions (2022 - Present)
- Architected enterprise multi-tenant analytics dashboard serving 120,000+ daily active users using React 18, Next.js, and Node.js microservices.
- Reduced p95 API response times by 45% (from 420ms to 230ms) through Redis distributed caching, database connection pooling, and SQL indexing optimization.
- Led migration of legacy monolithic payment workflow to event-driven microservices architecture using Apache Kafka and Docker/Kubernetes on AWS EKS.
- Mentored 6 junior and mid-level engineers, implemented strict automated CI/CD testing pipelines (Jest, Playwright) achieving 88% test coverage.

Software Engineer | FinTech Dynamics (2019 - 2022)
- Built high-concurrency transaction processing API processing $15M+ in monthly transfers with zero security incidents.
- Implemented real-time fraud alert notification system with WebSockets and Redis pub/sub.
- Created reusable internal UI design system component library in TypeScript, cutting front-end feature delivery time by 30%.

TECHNICAL SKILLS
Languages & Frameworks: TypeScript, JavaScript (ESNext), Python, React, Next.js, Node.js, Express, Fastify, HTML5/CSS3.
Databases & Caching: PostgreSQL, MySQL, Redis, MongoDB, Prisma ORM.
Cloud & DevOps: AWS (EC2, S3, RDS, Lambda, CloudFront), Docker, Kubernetes, CI/CD (GitHub Actions), Terraform.
Architecture: Microservices, RESTful APIs, GraphQL, Event-Driven Systems, System Design, OWASP Security.

EDUCATION
B.S. in Computer Science | University of California, Berkeley`
  },
  {
    id: 'frontend-lead',
    title: 'Staff Frontend Engineer & UI Architect',
    role: 'Staff Frontend Engineer',
    badge: 'Next.js & Performance',
    text: `SARAH CHEN
New York, NY | sarah.chen@example.com | github.com/sarahchen-ui

PROFESSIONAL SUMMARY
Staff Frontend Engineer with 7 years of specialized expertise in modern frontend engineering, complex single-page applications, design systems, and web performance optimization. Deep knowledge of React internals, browser rendering pipelines, and Core Web Vitals.

WORK EXPERIENCE
Staff Frontend Engineer | Lumina Digital (2021 - Present)
- Spearheaded frontend architecture of flagship SaaS platform, modernizing codebase from legacy Webpack to Vite and Next.js App Router.
- Improved Core Web Vitals across the platform, driving Largest Contentful Paint (LCP) from 3.8s to 1.1s and boosting conversion by 18%.
- Designed and authored accessible design system (WCAG 2.1 AA compliant) adopted across 8 distributed product teams.
- Instituted automated visual regression testing and bundle size monitoring gates on GitHub Actions.

Senior Frontend Developer | Horizon Interactive (2018 - 2021)
- Built rich interactive data visualization dashboards using D3.js and Canvas rendering millions of live data points at 60 FPS.
- Implemented robust offline-first PWA caching with Service Workers and IndexedDB.

SKILLS
Frontend: React, TypeScript, Next.js, Vue.js, Tailwind CSS, Sass, CSS Modules, WebGL/Three.js, D3.js, Redux Toolkit, Zustand.
Performance & Tooling: Vite, Webpack, Lighthouse, Core Web Vitals, Profiling, Playwright, Jest, Storybook.
Design & Architecture: Design Systems, Figma tokens, Micro-frontends, Responsive & Accessible Web Standards.`
  },
  {
    id: 'backend-cloud',
    title: 'Cloud & Distributed Systems Engineer',
    role: 'Senior Backend Engineer',
    badge: 'Go, Python & AWS',
    text: `MARCUS VANCE
Seattle, WA | marcus.vance@example.com

OVERVIEW
Backend Systems Engineer with 6 years experience building high-throughput, low-latency microservices, distributed queues, and resilient database infrastructure.

EXPERIENCE
Senior Backend Engineer | DataStream Networks (2021 - Present)
- Engineered high-throughput real-time streaming ingestion engine in Golang processing 85,000 requests/sec with sub-50ms latency.
- Designed database sharding and partitioning strategy for 4TB+ PostgreSQL time-series cluster, reducing query degradation during peak hours.
- Built disaster recovery automation and zero-downtime database failover with AWS Aurora and Terraform.

Systems Engineer | CloudCore Technologies (2018 - 2021)
- Developed REST and gRPC internal services using Go and Python/FastAPI.
- Managed Kubernetes clusters on GCP with Helm, Prometheus, and Grafana monitoring alerts.

CORE COMPETENCIES
Languages: Go (Golang), Python, SQL, Bash.
Systems: gRPC, Protobuf, Kafka, RabbitMQ, Redis, Elasticsearch, PostgreSQL.
Cloud & Infrastructure: Kubernetes, Docker, Helm, AWS, GCP, Terraform, Linux internals, Distributed Consensus.`
  }
];
