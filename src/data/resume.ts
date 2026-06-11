export const profile = {
  name: 'Chang Hao Jie',
  title: 'Fullstack Developer · Frontend Team Lead',
  location: 'Kuala Lumpur, Malaysia',
  email: 'hjie30@hotmail.com',
  phone: '+60 17-823 3278',
  whatsapp: 'https://wa.me/60178233278',
  linkedin: 'https://linkedin.com/in/hao-jie-chang',
  github: 'https://github.com/MarcusCody',
  summary:
    'Frontend-heavy Fullstack Engineer and Frontend Team Lead with experience building enterprise SaaS products for a US-based PropTech platform. Strong in React, TypeScript, Apollo GraphQL, MUI/JoyUI, .NET/C#, SQL Server, Azure, and API integration. Delivered platform architecture improvements, admin operations systems, Stripe billing lifecycle, QuickBooks Online OAuth integration, and reusable component patterns in an agile product environment.',
}

export interface SkillGroup {
  title: string
  skills: string[]
}

export const skillGroups: SkillGroup[] = [
  {
    title: 'Frontend Engineering',
    skills: [
      'React',
      'TypeScript',
      'MUI',
      'JoyUI',
      'Apollo GraphQL',
      'Frontend Architecture',
      'Performance Optimization',
    ],
  },
  {
    title: 'Fullstack / Backend',
    skills: [
      '.NET / C#',
      'ABP Framework',
      'REST APIs',
      'GraphQL APIs',
      'SQL Server',
      'Redis',
      'Layered Architecture',
    ],
  },
  {
    title: 'SaaS & Integrations',
    skills: [
      'Multi-tenant SaaS',
      'Stripe Billing Lifecycle',
      'QuickBooks Online OAuth',
      'Subscription Workflows',
      'Financial Workflows',
    ],
  },
  {
    title: 'Cloud & Delivery',
    skills: [
      'Microsoft Azure',
      'AWS',
      'Webpack v4 → v5 Migration',
      'CI/CD',
      'SCRUM & JIRA',
      'Technical Mentoring',
    ],
  },
]

export interface Experience {
  company: string
  role: string
  period: string
  location: string
  highlights: string[]
}

export const experiences: Experience[] = [
  {
    company: 'SimpleTruss',
    role: 'Fullstack Developer (Frontend Team Lead)',
    period: 'Dec 2023 – Present',
    location: 'Kuala Lumpur, Malaysia',
    highlights: [
      'Led frontend engineering delivery for Lessen Pro, an enterprise SaaS platform for Lessen, a US-based PropTech company supporting nationwide field service operations.',
      'Architected and delivered Pro Success Hub, an internal admin platform for operations management, vendor oversight, workflow orchestration, and SaaS ecosystem support.',
      'Designed scalable React and TypeScript UI architecture using MUI, JoyUI, Apollo GraphQL, reusable component systems, and domain-driven frontend structures.',
      'Re-architected the frontend platform by removing Qiankun micro-frontends and upgrading Webpack v4 to v5, improving maintainability, build reliability, and developer experience.',
      'Took ownership of backend delivery using .NET/C# and ABP Framework, implementing layered architecture across BFF, Domain, and Integration Agent services.',
      'Integrated Stripe billing lifecycle workflows and QuickBooks Online OAuth sync for subscription management, payment operations, invoice/payment reconciliation, and financial workflow automation.',
      'Led SCRUM delivery with JIRA, mentored frontend engineers, reviewed technical designs, and established coding standards across frontend and backend codebases.',
      'Championed AI-assisted development practices using Cursor and OpenAI-based tools to improve engineering productivity while maintaining code quality standards.',
    ],
  },
  {
    company: 'Axflix Technologies (Subsidiary of ARB Berhad)',
    role: 'Software Developer',
    period: 'Jul 2023 – Nov 2023',
    location: 'Kuala Lumpur, Malaysia',
    highlights: [
      'Developed ERP-related web application features using React, focusing on frontend implementation, data-heavy business workflows, and responsive UI behavior.',
      'Collaborated directly with clients to gather, clarify, and refine requirements, then translated business needs into frontend implementation tasks.',
      'Coordinated with backend developers to integrate APIs, validate data flows, and deliver end-to-end features for inventory, sales, invoice, return order, and delivery workflows.',
    ],
  },
  {
    company: 'Fusionex',
    role: 'Fullstack Engineer (Intern)',
    period: 'Oct 2022 – Jan 2023',
    location: 'Petaling Jaya, Malaysia',
    highlights: [
      'Built Angular-based web application features and contributed to ASP.NET Core Web API development during internship placement.',
      'Conducted research and development in Robotic Process Automation (RPA) and supported internal engineering exploration work.',
    ],
  },
]

export interface Project {
  name: string
  description: string
  tags: string[]
}

export const projects: Project[] = [
  {
    name: 'Lessen360 & LessenPro',
    description:
      'PropTech SaaS platforms for Lessen — ClientSaaS (Lessen360) and VendorSaaS (LessenPro). Contributed to Lessen360 development and led the frontend team for LessenPro and the Pro Success Hub admin panel.',
    tags: ['React', 'TypeScript', 'Apollo GraphQL', '.NET', 'Multi-tenant SaaS'],
  },
  {
    name: 'PasarayaKu Inventory Management System',
    description:
      'ERP and inventory management features integrated with POS and membership systems, including frontend document generation for sales orders, invoices, return orders, and delivery order forms.',
    tags: ['React', 'ERP', 'POS Integration', 'Document Generation'],
  },
  {
    name: 'Automotive Parts Inventory Management',
    description:
      'Inventory management system for automotive parts: a web app for CRUD operations and a mobile app with stock updates, product details, and QR code scanning, linked to a custom storage prototype.',
    tags: ['Web App', 'Mobile App', 'QR Scanning', 'IoT Prototype'],
  },
]

export interface Education {
  institution: string
  qualification: string
  period: string
  detail?: string
}

export const education: Education[] = [
  {
    institution: 'Universiti Tunku Abdul Rahman',
    qualification: 'Bachelor of Science (Honours) Software Engineering',
    period: 'May 2020 – May 2023',
    detail: 'CGPA: 3.54 / 4.00',
  },
  {
    institution: 'Universiti Tunku Abdul Rahman',
    qualification: 'Foundation in Science',
    period: 'May 2019 – May 2020',
  },
]

export interface Award {
  title: string
  issuer: string
  date: string
  description?: string
}

export const awards: Award[] = [
  {
    title: 'Excellent Performance Award 2024',
    issuer: 'SimpleTruss',
    date: 'Jan 2025',
    description:
      'Recognition of outstanding contributions as a Frontend Developer on the Lessen360 and LessenPro projects.',
  },
  {
    title: 'Letter of Recognition and Appreciation',
    issuer: 'SimpleTruss',
    date: 'Aug 2024',
    description:
      'Awarded for exceptional contributions to the Lessen360 and LessenPro projects, recognizing outstanding performance with a special incentive.',
  },
  {
    title: "Dean's List",
    issuer: 'Universiti Tunku Abdul Rahman',
    date: 'Oct 2020 & Jun 2022',
  },
]
