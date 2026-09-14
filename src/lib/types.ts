export type PresentationStatus = 'draft' | 'active' | 'ended';

export type QuestionType =
  | 'multiple_choice'
  | 'word_cloud'
  | 'open_text'
  | 'rating'
  | 'quiz';

export type ChartLayout =
  | 'bars'             // Colonnes verticales (default for multiple_choice)
  | 'horizontal_bars'  // Barres horizontales
  | 'donut'            // Camembert anneau
  | 'cards'            // Grille de cartes glassmorphism
  | 'word_cloud'       // Nuage de mots organique
  | 'bubbles'          // Bulles flottantes
  | 'ranking'          // Top classement
  | 'stars'            // Répartition étoiles
  | 'gauge'            // Jauge circulaire speedometer
  | 'wall'             // Mur de post-its
  | 'spotlight'        // Réponse par réponse en grand
  | 'list';            // Liste chronologique épurée

export type ThemeId = 'midnight' | 'sunset' | 'emerald' | 'cyberpunk' | 'minimal';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bgGradient: string;
  cardBg: string;
  cardBorder: string;
  accent: string;
  textColor: string;
  textMuted: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Blanc Studio (Menti)',
    bgGradient: 'from-white via-slate-50/60 to-white',
    cardBg: 'bg-white shadow-lg border border-slate-200/90',
    cardBorder: 'border-slate-200',
    accent: 'teal',
    textColor: 'text-slate-900',
    textMuted: 'text-slate-500',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Pro',
    bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    cardBg: 'bg-slate-900/80 backdrop-blur-xl',
    cardBorder: 'border-slate-800',
    accent: 'teal',
    textColor: 'text-white',
    textMuted: 'text-slate-400',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    bgGradient: 'from-purple-950 via-slate-900 to-rose-950',
    cardBg: 'bg-slate-900/80 backdrop-blur-xl',
    cardBorder: 'border-purple-800/40',
    accent: 'rose',
    textColor: 'text-white',
    textMuted: 'text-rose-200/70',
  },
  emerald: {
    id: 'emerald',
    name: 'Ocean Emerald',
    bgGradient: 'from-cyan-950 via-slate-900 to-emerald-950',
    cardBg: 'bg-slate-900/80 backdrop-blur-xl',
    cardBorder: 'border-emerald-800/40',
    accent: 'emerald',
    textColor: 'text-white',
    textMuted: 'text-emerald-200/70',
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    bgGradient: 'from-black via-zinc-950 to-purple-950',
    cardBg: 'bg-zinc-950/80 backdrop-blur-xl',
    cardBorder: 'border-fuchsia-500/30',
    accent: 'fuchsia',
    textColor: 'text-white',
    textMuted: 'text-zinc-400',
  },
};

export const MENTI_COLORS = [
  { bg: 'bg-cyan-500', from: 'from-cyan-500', to: 'to-cyan-400', text: 'text-cyan-400', hex: '#06b6d4' },
  { bg: 'bg-purple-500', from: 'from-purple-500', to: 'to-purple-400', text: 'text-purple-400', hex: '#a855f7' },
  { bg: 'bg-pink-500', from: 'from-pink-500', to: 'to-pink-400', text: 'text-pink-400', hex: '#ec4899' },
  { bg: 'bg-amber-500', from: 'from-amber-500', to: 'to-amber-400', text: 'text-amber-400', hex: '#f59e0b' },
  { bg: 'bg-emerald-500', from: 'from-emerald-500', to: 'to-emerald-400', text: 'text-emerald-400', hex: '#10b981' },
  { bg: 'bg-blue-500', from: 'from-blue-500', to: 'to-blue-400', text: 'text-blue-400', hex: '#3b82f6' },
  { bg: 'bg-rose-500', from: 'from-rose-500', to: 'to-rose-400', text: 'text-rose-400', hex: '#f43f5e' },
  { bg: 'bg-indigo-500', from: 'from-indigo-500', to: 'to-indigo-400', text: 'text-indigo-400', hex: '#6366f1' },
];

export interface QuestionConfig {
  choices: string[];
  layout: ChartLayout;
}

export function parseQuestionConfig(question: Question | null): QuestionConfig {
  if (!question) return { choices: [], layout: 'bars' };
  const raw = question.options as any;

  let choices: string[] = [];
  let layout: ChartLayout = getDefaultLayout(question.type);

  if (Array.isArray(raw)) {
    choices = raw;
  } else if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.choices)) choices = raw.choices;
    if (raw.layout) layout = raw.layout as ChartLayout;
  }

  return { choices, layout };
}

export function getDefaultLayout(type: QuestionType): ChartLayout {
  switch (type) {
    case 'multiple_choice':
      return 'bars';
    case 'quiz':
      return 'cards';
    case 'word_cloud':
      return 'word_cloud';
    case 'rating':
      return 'stars';
    case 'open_text':
      return 'wall';
    default:
      return 'bars';
  }
}

export interface Presentation {
  id: string;
  title: string;
  join_code: string;
  status: PresentationStatus;
  current_question_id: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  presentation_id: string;
  type: QuestionType;
  title: string;
  options: any;
  correct_option: number | null;
  position: number;
  created_at: string;
}

export interface Response {
  id: string;
  question_id: string;
  participant_id: string;
  participant_name: string | null;
  answer: string;
  created_at: string;
}

export interface Participant {
  id: string;
  presentation_id: string;
  name: string | null;
  joined_at: string;
}

export interface QuestionResult {
  answer: string;
  count: number;
}

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: string; description: string }[] = [
  { value: 'multiple_choice', label: 'Choix multiple', icon: 'list', description: 'Colonnes, barres, donut ou cartes' },
  { value: 'quiz', label: 'Quiz avec réponse', icon: 'help-circle', description: 'Révélation suspense et confettis' },
  { value: 'word_cloud', label: 'Nuage de mots', icon: 'cloud', description: 'Nuage dynamique, bulles ou classement' },
  { value: 'rating', label: 'Évaluation', icon: 'star', description: 'Étoiles, jauge ou barres de score' },
  { value: 'open_text', label: 'Texte libre', icon: 'edit', description: 'Mur de post-its, spotlight ou liste' },
];

export const LAYOUT_OPTIONS: Record<QuestionType, { id: ChartLayout; label: string; icon: string }[]> = {
  multiple_choice: [
    { id: 'bars', label: 'Colonnes', icon: 'BarChart3' },
    { id: 'horizontal_bars', label: 'Barres', icon: 'AlignLeft' },
    { id: 'donut', label: 'Donut', icon: 'PieChart' },
    { id: 'cards', label: 'Cartes', icon: 'LayoutGrid' },
  ],
  quiz: [
    { id: 'cards', label: 'Cartes Quiz', icon: 'LayoutGrid' },
    { id: 'bars', label: 'Colonnes', icon: 'BarChart3' },
    { id: 'horizontal_bars', label: 'Barres', icon: 'AlignLeft' },
  ],
  word_cloud: [
    { id: 'word_cloud', label: 'Nuage Menti', icon: 'Cloud' },
    { id: 'bubbles', label: 'Bulles', icon: 'CircleDot' },
    { id: 'ranking', label: 'Top Classement', icon: 'Trophy' },
  ],
  rating: [
    { id: 'stars', label: 'Étoiles & Barres', icon: 'Star' },
    { id: 'gauge', label: 'Jauge Circulaire', icon: 'Gauge' },
  ],
  open_text: [
    { id: 'wall', label: 'Mur de Cartes', icon: 'LayoutGrid' },
    { id: 'spotlight', label: 'Spotlight (1 par 1)', icon: 'Tv' },
    { id: 'list', label: 'Liste Moderne', icon: 'List' },
  ],
};
