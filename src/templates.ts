export interface Template {
  name: string;
  type: string;
  code: string;
}

export const TEMPLATES: Template[] = [
  {
    name: "Flowchart",
    type: "flowchart",
    code: `graph TD
  A[Start] --> B{Is it working?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Debug]
  D --> A`,
  },
  {
    name: "Sequence Diagram",
    type: "sequence",
    code: `sequenceDiagram
  participant A as Alice
  participant J as John
  A->>J: Hello John, how are you?
  J-->>A: Great!
  A-)J: See you later!`,
  },
  {
    name: "Class Diagram",
    type: "class",
    code: `classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  class Cat {
    +purr() void
  }
  Animal <|-- Dog
  Animal <|-- Cat`,
  },
  {
    name: "State Diagram",
    type: "state",
    code: `stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Paused : pause
  Paused --> Running : resume
  Running --> [*] : stop`,
  },
  {
    name: "ER Diagram",
    type: "er",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER {
    string name
    string email
  }
  ORDER {
    int orderNumber
    string status
  }`,
  },
  {
    name: "Gantt Chart",
    type: "gantt",
    code: `gantt
  title Project Timeline
  dateFormat YYYY-MM-DD
  section Planning
    Research        :a1, 2024-01-01, 10d
    Design          :a2, after a1, 14d
  section Build
    Frontend        :b1, after a2, 20d
    Backend         :b2, after a2, 20d
    Integration     :b3, after b2, 7d`,
  },
  {
    name: "Pie Chart",
    type: "pie",
    code: `pie title Programming Languages
  "JavaScript" : 42
  "TypeScript" : 28
  "Python" : 20
  "Other" : 10`,
  },
  {
    name: "Journey",
    type: "journey",
    code: `journey
  title My Day
  section Morning
    Wake up: 5: Me
    Coffee: 4: Me
  section Work
    Meetings: 2: Me, Team
    Deep work: 4: Me`,
  },
  {
    name: "Git Graph",
    type: "git",
    code: `gitGraph
  commit id: "init"
  branch feature
  checkout feature
  commit id: "feat-a"
  checkout main
  commit id: "fix-b"
  merge feature`,
  },
  {
    name: "Mindmap",
    type: "mindmap",
    code: `mindmap
  root((Mermaid))
    Diagrams
      Flowchart
      Sequence
      Class
    Exports
      SVG
      PNG
      PDF`,
  },
  {
    name: "Timeline",
    type: "timeline",
    code: `timeline
  title History of Social Media
  2002 : LinkedIn
  2004 : Facebook
  2006 : Twitter
  2010 : Instagram`,
  },
];