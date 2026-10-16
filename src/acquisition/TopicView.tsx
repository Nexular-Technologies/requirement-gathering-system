import * as React from "react";
import { ArrowLeft, Check, Loader2, Pencil, Plus, Search, Target, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { api } from "./api";
import type { Question, TopicDetail, TopicStatus } from "./types";
import { statusVariant } from "./statusVariant";
import { QuestionNode } from "./QuestionNode";

interface Props {
  topicId: string;
  onBack: () => void;
}

/** Keeps a question if it or any of its descendants match; prunes children down to matching branches. */
function filterQuestions(questions: Question[], query: string): Question[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return questions;

  const walk = (q: Question): Question | null => {
    const children = q.children.map(walk).filter((c): c is Question => c !== null);
    const matches = q.body.toLowerCase().includes(needle);
    if (!matches && children.length === 0) return null;
    return { ...q, children };
  };

  return questions.map(walk).filter((q): q is Question => q !== null);
}

export function TopicView({ topicId, onBack }: Props) {
  const [topic, setTopic] = React.useState<TopicDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: "", objective: "", status: "open" as TopicStatus });
  const [newQuestion, setNewQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Who the entries are attributed to. Kept locally until WP-12 brings real sessions.
  const [author, setAuthor] = React.useState(() => localStorage.getItem("dsops-acq-author") ?? "");
  React.useEffect(() => localStorage.setItem("dsops-acq-author", author), [author]);

  const load = React.useCallback(() => {
    api
      .getTopic(topicId)
      .then((t) => {
        setTopic(t);
        setDraft({ title: t.title, objective: t.objective ?? "", status: t.status });
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [topicId]);

  React.useEffect(load, [load]);

  React.useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen]);

  const saveTopic = async () => {
    setBusy(true);
    try {
      await api.updateTopic(topicId, draft);
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save topic");
    } finally {
      setBusy(false);
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    setBusy(true);
    try {
      await api.createQuestion(topicId, { body: newQuestion.trim(), author: author || undefined });
      setNewQuestion("");
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add question");
    } finally {
      setBusy(false);
    }
  };

  const filteredQuestions = React.useMemo(
    () => (topic ? filterQuestions(topic.questions, searchQuery) : []),
    [topic, searchQuery]
  );

  if (!topic) {
    return (
      <div className="mt-4">
        <Button size="sm" variant="ghost" className="-ml-3" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to topics
        </Button>
        {error ? (
          <div className="mt-3 rounded-md border border-crit/30 bg-crit/10 px-3.5 py-2.5 text-xs text-crit">{error}</div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading topic&hellip;
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button size="sm" variant="ghost" className="-ml-3" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to topics
      </Button>

      <Card className="mt-2">
        <CardContent className="p-5">
          {editing ? (
            <div className="grid gap-3.5">
              <div>
                <Label htmlFor="e-title">Topic</Label>
                <Input id="e-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="e-obj">Objective</Label>
                <Textarea
                  id="e-obj"
                  value={draft.objective}
                  onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <Label htmlFor="e-status">Status</Label>
                  <Select
                    id="e-status"
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as TopicStatus })}
                  >
                    <option value="open">Open</option>
                    <option value="refining">Refining</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
                <Button size="sm" onClick={saveTopic} disabled={busy || !draft.title.trim()}>
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[18px] font-bold tracking-tight">{topic.title}</h2>
                  <Badge variant={statusVariant(topic.status)}>{topic.status}</Badge>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/25 bg-primary/5 px-3.5 py-2.5">
                  <Target className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Objective</div>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed">
                      {topic.objective || <span className="text-muted-foreground">No objective set yet.</span>}
                    </p>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mt-3 rounded-md border border-crit/30 bg-crit/10 px-3.5 py-2.5 text-xs text-crit">{error}</div>
      )}

      {topic.questions.length > 0 && (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions in this topic&hellip;"
            className="pl-9"
            aria-label="Search questions"
          />
        </div>
      )}

      {topic.questions.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No questions on this topic yet.
          </CardContent>
        </Card>
      ) : filteredQuestions.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No questions match &ldquo;{searchQuery}&rdquo;.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 grid gap-3">
          {filteredQuestions.map((q) => (
            <QuestionNode key={q.id} question={q} depth={0} author={author} onChanged={load} />
          ))}
        </div>
      )}

      <Button
        size="icon"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
        aria-label="Add question"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <Card className="w-full max-w-lg">
            <CardContent className="grid gap-3.5 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[15px] font-bold tracking-tight">New question</h3>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setModalOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div>
                <Label htmlFor="q-new">Question</Label>
                <Textarea
                  id="q-new"
                  autoFocus
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Ask something that refines or answers the objective above&hellip;"
                  className="min-h-[90px]"
                />
              </div>
              <div>
                <Label htmlFor="q-author">Attributed to</Label>
                <Input
                  id="q-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={addQuestion} disabled={busy || !newQuestion.trim()}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
