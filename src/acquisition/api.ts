import type { Answer, Project, ProjectDetail, Question, Topic, TopicDetail } from "./types";

/* Dev: Vite proxies /api to the acquisition API. Docker: nginx does the same. */
const BASE = import.meta.env.VITE_ACQ_API ?? "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>);
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  health: () => req<{ status: string; time: string }>("/health"),

  listProjects: () => req<Project[]>("/projects"),
  getProject: (id: string) => req<ProjectDetail>(`/projects/${id}`),
  createProject: (data: Partial<Project>) => req<Project>("/projects", { method: "POST", body: body(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    req<Project>(`/projects/${id}`, { method: "PATCH", body: body(data) }),
  deleteProject: (id: string) => req<void>(`/projects/${id}`, { method: "DELETE" }),

  listTopics: (projectId: string) => req<Topic[]>(`/projects/${projectId}/topics`),
  getTopic: (id: string) => req<TopicDetail>(`/topics/${id}`),
  createTopic: (projectId: string, data: Partial<Topic>) =>
    req<Topic>(`/projects/${projectId}/topics`, { method: "POST", body: body(data) }),
  updateTopic: (id: string, data: Partial<Topic>) =>
    req<Topic>(`/topics/${id}`, { method: "PATCH", body: body(data) }),
  deleteTopic: (id: string) => req<void>(`/topics/${id}`, { method: "DELETE" }),

  createQuestion: (topicId: string, data: { body: string; author?: string; parent_id?: string }) =>
    req<Question>(`/topics/${topicId}/questions`, { method: "POST", body: body(data) }),
  updateQuestion: (id: string, data: { body?: string; status?: string; author?: string }) =>
    req<Question>(`/questions/${id}`, { method: "PATCH", body: body(data) }),
  deleteQuestion: (id: string) => req<void>(`/questions/${id}`, { method: "DELETE" }),

  createTextAnswer: (questionId: string, data: { body_html: string; author?: string }) =>
    req<Answer>(`/questions/${questionId}/answers`, { method: "POST", body: body(data) }),
  createAudioAnswer: (questionId: string, blob: Blob, durationMs: number, author?: string) => {
    const form = new FormData();
    form.append("audio", blob, "response.webm");
    form.append("duration_ms", String(Math.round(durationMs)));
    if (author) form.append("author", author);
    return req<Answer>(`/questions/${questionId}/answers/audio`, { method: "POST", body: form });
  },
  deleteAnswer: (id: string) => req<void>(`/answers/${id}`, { method: "DELETE" }),
  audioUrl: (answerId: string) => `${BASE}/answers/${answerId}/audio`,
};
