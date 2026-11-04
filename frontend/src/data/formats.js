import {
  GitBranch, Network, NotebookText, PanelsTopLeft, Clock3, Table2,
  ListOrdered, Layers3, AlignLeft, Workflow, Code2, Presentation,
} from 'lucide-react';

export const FORMATS = [
  { id: 'flowchart', label: 'Flowchart', description: 'Visualize a logical process', icon: GitBranch, visual: true },
  { id: 'mindmap', label: 'Mind Map', description: 'Explore connected ideas', icon: Network, visual: true },
  { id: 'structured_notes', label: 'Structured Notes', description: 'Organized headings and details', icon: NotebookText },
  { id: 'infographic', label: 'Infographic', description: 'Key facts in visual cards', icon: PanelsTopLeft, visual: true },
  { id: 'timeline', label: 'Timeline', description: 'See events in sequence', icon: Clock3, visual: true },
  { id: 'comparison_table', label: 'Comparison Table', description: 'Compare concepts side by side', icon: Table2 },
  { id: 'step_by_step', label: 'Step-by-Step Guide', description: 'Break work into clear steps', icon: ListOrdered },
  { id: 'flashcards', label: 'Flashcards', description: 'Practice key questions', icon: Layers3 },
  { id: 'summary', label: 'Summary', description: 'Get the essential points', icon: AlignLeft },
  { id: 'workflow', label: 'Workflow Diagram', description: 'Map actions and decisions', icon: Workflow, visual: true },
  { id: 'mermaid', label: 'Mermaid Diagram', description: 'Generate editable Mermaid code', icon: Code2, visual: true },
  { id: 'presentation', label: 'Presentation Outline', description: 'Turn content into slide sections', icon: Presentation },
];

export const TEMPLATES = [
  { title: 'Artificial Intelligence', category: 'Technology', format: 'mindmap', prompt: 'Artificial Intelligence includes machine learning, deep learning, natural language processing, computer vision, and robotics. Machine learning includes supervised, unsupervised, and reinforcement learning.' },
  { title: 'Software Development Life Cycle', category: 'Computer Science', format: 'flowchart', prompt: 'The software development life cycle includes planning, requirement analysis, design, development, testing, deployment, and maintenance. Feedback from users can lead to another iteration.' },
  { title: 'Machine Learning Workflow', category: 'Technology', format: 'workflow', prompt: 'A machine learning workflow starts by defining a problem, collecting data, cleaning data, exploring features, splitting the dataset, training a model, evaluating performance, and deploying the model. If performance is poor, tune the model and train again.' },
  { title: 'Research Process', category: 'Research', format: 'step_by_step', prompt: 'A research project begins with selecting a topic, defining a research question, reviewing literature, choosing a methodology, collecting data, analysing results, drawing conclusions, and communicating findings.' },
  { title: 'Project Management', category: 'Business', format: 'timeline', prompt: 'A typical project moves through initiation, planning, execution, monitoring and controlling, and closing. Each phase has deliverables, owners, and review points.' },
  { title: 'Data Structures', category: 'Computer Science', format: 'structured_notes', prompt: 'Data structures organize data for efficient access and modification. Linear structures include arrays, linked lists, stacks, and queues. Non-linear structures include trees and graphs. Hash tables store key-value pairs.' },
  { title: 'Business Model Comparison', category: 'Business', format: 'comparison_table', prompt: 'A subscription business charges customers on a recurring basis and can provide predictable revenue. A one-time purchase model charges once per transaction and may require continual customer acquisition. A freemium model offers a basic product for free and charges for premium features.' },
  { title: 'History Study Cards', category: 'Education', format: 'flashcards', prompt: 'The Industrial Revolution began in Britain in the late 18th century. It introduced mechanized production, expanded factories, changed transportation, and accelerated urbanization.' },
];
