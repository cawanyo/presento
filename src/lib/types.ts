export type PresentationStatus = 'draft' | 'active' | 'ended';

export type QuestionType =
  | 'multiple_choice'
  | 'word_cloud'
  | 'open_text'
  | 'rating'
  | 'quiz';

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
  options: string[] | null;
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

export const QUESTION_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: 'multiple_choice', label: 'Choix multiple', icon: 'list' },
  { value: 'quiz', label: 'Quiz', icon: 'help-circle' },
  { value: 'word_cloud', label: 'Nuage de mots', icon: 'cloud' },
  { value: 'open_text', label: 'Texte libre', icon: 'edit' },
  { value: 'rating', label: 'Évaluation', icon: 'star' },
];
