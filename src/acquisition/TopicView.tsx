import * as React from "react";
import { ArrowLeft, Check, Loader2, Pencil, Plus, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { api } from "./api";
import type { TopicDetail, TopicStatus } from "./types";
import { statusVariant } from "./statusVariant";
import { QuestionNode } from "./QuestionNode";

interface Props {
  topicId: string;
  onBack: () => void;
}

export function TopicView({ topicId, onBack }: Props) {
  const [topic, setTopic] = React.useState<TopicDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: "", objective: "", status: "open" as TopicStatus });
  const [newQuestion, setNewQuestion] = React.useState("");
  const [busy, setBusy] = React.useState(false);

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
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add question");
    } finally {
      setBusy(false);
    }
  };

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

      <Card className="mt-3">
        <CardContent className="grid gap-2.5 p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <Label htmlFor="q-new">New question</Label>
              <Textarea
                id="q-new"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ask something that refines or answers the objective above&hellip;"
                className="min-h-[60px]"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="q-author">Attributed to</Label>
              <Input
                id="q-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <Button size="sm" onClick={addQuestion} disabled={busy || !newQuestion.trim()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {topic.questions.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No questions on this topic yet.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 grid gap-3">
          {topic.questions.map((q) => (
            <QuestionNode key={q.id} question={q} depth={0} author={author} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
