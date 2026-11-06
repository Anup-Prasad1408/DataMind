import {
  GitBranch, Network, BookOpenText, PanelsTopLeft, Clock3,
  Table2, ListChecks, Layers3, FileText, Workflow,
  Workflow as DiagramIcon, Presentation,
} from 'lucide-react';

export const FORMATS = [
  { id: 'flowchart', label: 'Flowchart', description: 'Visualize a logical process', icon: GitBranch },
  { id: 'mindmap', label: 'Mind Map', description: 'Explore connected ideas', icon: Network },
  { id: 'structured_notes', label: 'Structured Notes', description: 'Organized headings and details', icon: BookOpenText },
  { id: 'infographic', label: 'Infographic', description: 'Key facts in visual cards', icon: PanelsTopLeft },
  { id: 'timeline', label: 'Timeline', description: 'See events in sequence', icon: Clock3 },
  { id: 'comparison_table', label: 'Comparison Table', description: 'Compare concepts side by side', icon: Table2 },
  { id: 'step_by_step', label: 'Step-by-Step Guide', description: 'Break work into clear steps', icon: ListChecks },
  { id: 'flashcards', label: 'Flashcards', description: 'Practice key questions', icon: Layers3 },
  { id: 'summary', label: 'Smart Summary', description: 'Capture the essential points', icon: FileText },
  { id: 'workflow', label: 'Workflow', description: 'Map stages and decisions', icon: Workflow },
  { id: 'mermaid', label: 'Mermaid Diagram', description: 'Generate editable diagram code', icon: DiagramIcon },
  { id: 'presentation', label: 'Presentation', description: 'Organize content into slides', icon: Presentation },
];

export const SAMPLE_TEXT = `A machine learning workflow starts by defining a problem, collecting data, cleaning and exploring the data, splitting it into training and testing sets, training a model, evaluating performance, and deploying the model. If performance is poor, tune the model and train again. After deployment, monitor results and retrain when the data or business requirements change.`;
