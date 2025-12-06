export const SKILL_PRIORITY: Record<string, number> = {

    // ----------------------
    // 0. Fundamental Computer Skills
    // ----------------------
    "Computer Basics": 1,
    "Internet Basics": 2,
    "Operating Systems": 3,
    "Networking Basics": 4,
    "Problem Solving": 5,

    // ----------------------
    // 1. CS Foundations
    // ----------------------
    "Data Structures": 10,
    "Algorithms": 11,

    // ----------------------
    // 2. Web Frontend Foundations (HTML/CSS FIRST)
    // ----------------------
    "HTML": 20,
    "CSS": 21,
    "Responsive Design": 22,
    "CSS Flexbox": 23,
    "CSS Grid": 24,
    "Bootstrap": 25,
    "Tailwind CSS": 26,
    "SASS": 27,
    "LESS": 28,

    // ----------------------
    // 3. Core Programming Languages (AFTER HTML/CSS)
    // ----------------------
    "JavaScript": 40,
    "TypeScript": 41,
    "Python": 42,
    "Java": 43,
    "C": 44,
    "C++": 45,
    "C#": 46,
    "Go": 47,
    "Rust": 48,
    "PHP": 49,
    "Ruby": 50,
    "Kotlin": 51,
    "Swift": 52,
    "Scala": 53,
    "Dart": 54,
    "R": 55,

    // ----------------------
    // 4. Version Control
    // ----------------------
    "Git": 70,
    "GitHub": 71,
    "GitLab": 72,
    "Bitbucket": 73,
    "SVN": 74,

    // ----------------------
    // 5. Frontend Frameworks (DEPEND on JS/TS)
    // ----------------------
    "DOM Manipulation": 80,
    "State Management Basics": 81,

    // React ecosystem
    "React": 90,
    "Redux": 91,
    "Zustand": 92,
    "Next.js": 93,

    // Angular ecosystem
    "Angular": 100,

    // Vue ecosystem
    "Vue": 110,
    "Nuxt.js": 111,

    // Svelte ecosystem
    "Svelte": 120,
    "SvelteKit": 121,

    // UI/UX
    "UI/UX Design": 130,
    "Figma": 131,
    "Adobe XD": 132,

    // ----------------------
    // 6. Backend Foundations
    // ----------------------
    "HTTP": 150,
    "REST API": 151,
    "GraphQL": 152,

    // Node backend
    "Node.js": 160,
    "Express.js": 161,
    "NestJS": 162,

    // Python backend
    "Flask": 170,
    "FastAPI": 171,
    "Django": 172,

    // Java backend
    "Spring Boot": 180,

    // PHP backend
    "Laravel": 190,

    // Ruby backend
    "Ruby on Rails": 200,

    // .NET backend
    "ASP.NET": 210,
    ".NET": 211,

    // ----------------------
    // 7. Databases (correct order)
    // ----------------------
    "SQL": 250,
    "MySQL": 251,
    "PostgreSQL": 252,
    "SQLite": 253,

    "NoSQL": 260,
    "MongoDB": 261,
    "Firebase": 262,
    "Firestore": 263,
    "Redis": 264,

    "Elasticsearch": 270,
    "Cassandra": 271,
    "DynamoDB": 272,
    "Neo4j": 273,

    // ORM & DB Tools
    "Prisma": 280,
    "Supabase": 281,

    // ----------------------
    // 8. DevOps (in correct order)
    // ----------------------
    "Linux": 300,
    "Shell Scripting": 301,

    "Nginx": 310,
    "Apache": 311,

    "Docker": 320,
    "CI/CD": 321,
    "GitHub Actions": 322,
    "GitLab CI": 323,
    "Jenkins": 324,

    "Kubernetes": 330,
    "Helm": 331,
    "Terraform": 332,
    "Ansible": 333,

    "Prometheus": 340,
    "Grafana": 341,

    // ----------------------
    // 9. Cloud (after DevOps basics)
    // ----------------------
    "Cloud Computing": 360,
    "AWS": 361,
    "Azure": 362,
    "GCP": 363,

    "Serverless": 370,
    "Lambda": 371,

    // ----------------------
    // 10. AI / ML (in dependency order)
    // ----------------------
    "Math for ML": 400,
    "NumPy": 401,
    "Pandas": 402,
    "Scikit-Learn": 403,
    "Machine Learning": 404,
    "Deep Learning": 405,
    "TensorFlow": 406,
    "PyTorch": 407,

    "LLMs": 420,
    "Prompt Engineering": 421,
    "RAG": 422,
    "Vector Databases": 423,
    "Pinecone": 424,
    "Weaviate": 425,
    "LangChain": 426,
    "OpenAI APIs": 427,
    "HuggingFace": 428,

    // ----------------------
    // 11. Mobile App Development
    // ----------------------
    "Android": 450,
    "Kotlin Android": 451,
    "Java Android": 452,

    "iOS": 460,
    "SwiftUI": 461,

    "Flutter": 470,
    "React Native": 471,

    // ----------------------
    // 12. Testing
    // ----------------------
    "Unit Testing": 500,
    "Jest": 501,
    "Mocha": 502,
    "Chai": 503,
    "Cypress": 504,
    "Selenium": 505,
    "Playwright": 506,

    // ----------------------
    // 13. System Design
    // ----------------------
    "System Design": 550,
    "Monolithic Architecture": 551,
    "Microservices": 552,
    "Distributed Systems": 553,
    "Caching": 554,
    "Load Balancing": 555,
    "Message Queues": 556,
    "RabbitMQ": 557,
    "Kafka": 558,
    "Event-Driven Architecture": 559,
    "API Security": 560,
    "OAuth": 561,
    "JWT": 562,

    // ----------------------
    // 14. Soft Skills
    // ----------------------
    "Agile": 600,
    "Scrum": 601,
    "Kanban": 602,
    "Project Management": 603,
    "Team Leadership": 604,
    "Communication": 605,
    "Time Management": 606,

    // fallback
    "default": 9999
};

export const commonSkills = [

    // Computer + CS Basics
    "Computer Basics", "Internet Basics", "Operating Systems", "Networking Basics",
    "Problem Solving", "Data Structures", "Algorithms",

    // Web Foundations
    "HTML", "CSS", "Responsive Design", "CSS Flexbox", "CSS Grid", "Tailwind CSS",
    "SASS", "LESS", "Bootstrap",

    // Core Languages
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "C", "Go", "Rust",
    "PHP", "Ruby", "Kotlin", "Swift", "Scala", "Dart", "R",

    // Version Control
    "Git", "GitHub", "GitLab", "Bitbucket", "SVN",

    // Frontend
    "React", "Next.js", "Redux", "State Management", "Zustand", "MobX",
    "Angular", "Vue", "Nuxt.js", "Svelte", "SvelteKit", "Web Components",

    // UI/UX
    "UI/UX Design", "Figma", "Adobe XD", "Sketch", "Wireframing", "Prototyping",

    // Backend
    "Node.js", "Express.js", "NestJS", "REST API", "GraphQL", "Apollo",
    "FastAPI", "Flask", "Django", "Spring Boot", "Laravel", "Ruby on Rails",
    ".NET", ".NET Core", "ASP.NET", "Microservices", "Monolithic Architecture",

    // Databases
    "SQL", "MySQL", "PostgreSQL", "SQLite", "NoSQL", "MongoDB", "Firebase",
    "Firestore", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Neo4j",
    "MariaDB", "Supabase", "Prisma",

    // DevOps
    "Linux", "Shell Scripting", "Bash", "Nginx", "Apache", "Docker", "CI/CD",
    "Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD", "Helm",
    "Kubernetes", "Terraform", "Ansible", "Prometheus", "Grafana",
    "DevOps", "SRE", "Cloud Security",

    // Cloud
    "AWS", "Azure", "GCP", "Cloud Computing", "Serverless",
    "Lambda", "API Gateway", "CloudFront", "S3", "EC2", "ECS", "EKS",

    // Mobile
    "Android", "Kotlin Android", "Java Android", "Jetpack Compose",
    "iOS", "Swift", "SwiftUI", "React Native", "Flutter", "Dart",

    // AI / ML / Data
    "AI", "Machine Learning", "Deep Learning", "Data Science",
    "Pandas", "NumPy", "TensorFlow", "PyTorch", "Scikit-Learn",
    "LLMs", "Prompt Engineering", "RAG", "Vector Databases",
    "Pinecone", "Weaviate", "LangChain", "OpenAI APIs", "HuggingFace",

    // Testing
    "Unit Testing", "Integration Testing", "E2E Testing",
    "Jest", "Mocha", "Chai", "Cypress", "Selenium", "Playwright",

    // System Design
    "System Design", "Distributed Systems", "Caching", "Load Balancing",
    "Message Queues", "RabbitMQ", "Kafka", "Event-Driven Architecture",
    "API Security", "OAuth", "JWT",

    // Soft skills
    "Agile", "Scrum", "Kanban", "Project Management",
    "Team Leadership", "Communication", "Time Management"
];
