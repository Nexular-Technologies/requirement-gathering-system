export type ProjectStatus = "active" | "on-hold" | "closed";
export type TopicStatus = "open" | "refining" | "resolved";
export type QuestionStatus = "open" | "answered" | "parked";

export interface Project {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  topic_count?: number;
  question_count?: number;
  answer_count?: number;
}

export interface Topic {
  id: string;
  project_id: string;
  title: string;
  objective: string | null;
  status: TopicStatus;
  position: number;
  created_at: string;
  updated_at: string;
  question_count?: number;
  answered_count?: number;
}

export interface Answer {
  id: string;
  question_id: string;
  kind: "text" | "audio";
  body_html: string | null;
  audio_file: string | null;
  audio_mime: string | null;
  audio_bytes: number | null;
  audio_duration_ms: number | null;
  transcript: string | null;
  transcript_status: "none" | "pending" | "done" | "failed";
  author: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  topic_id: string;
  parent_id: string | null;
  body: string;
  author: string | null;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
  answers: Answer[];
  children: Question[];
}

export interface TopicDetail extends Topic {
  questions: Question[];
}

export interface ProjectDetail extends Project {
  topics: (Topic & { questions: Question[] })[];
}
