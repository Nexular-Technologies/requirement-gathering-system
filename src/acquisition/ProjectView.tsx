import * as React from "react";
import { ArrowLeft, ChevronRight, Download, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { api } from "./api";
import type { ProjectDetail, Topic, TopicStatus } from "./types";
import { statusVariant } from "./statusVariant";

interface Props {
  projectId: string;
  onBack: () => void;
  onOpenTopic: (id: string) => void;
}

export function ProjectView({ projectId, onBack, onOpenTopic }: Props) {
  const [project, setProject] = React.useState<ProjectDetail | null>(null);
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", objective: "", status: "open" as TopicStatus });

  const load = React.useCallback(() => {
    Promise.all([api.getProject(projectId), api.listTopics(projectId)])
      .then(([p, t]) => {
        setProject(p);
        setTopics(t);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [projectId]);

  React.useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.createTopic(projectId, form);
      setForm({ title: "", objective: "", status: "open" });
      setAdding(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create topic");
    } finally {
      setSaving(false);
    }
  };

  const removeTopic = async (topic: Topic) => {
    if (!window.confirm(`Delete topic "${topic.title}" and all its questions?`)) return;
    await api.deleteTopic(topic.id).catch((err: Error) => setError(err.message));
    load();
  };

  // The whole project, nested, is what gets handed to the LLM downstream.
  const exportBundle = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^\w.-]+/g, "-").toLowerCase()}-acquisition.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error && !project) {
    return (
      <div className="mt-4">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> All projects
        </Button>
        <div className="mt-3 rounded-md border border-crit/30 bg-crit/10 px-3.5 py-2.5 text-xs text-crit">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading project&hellip;
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button size="sm" variant="ghost" className="-ml-3" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" /> All projects
      </Button>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[19px] font-bold tracking-tight">{project.name}</h2>
            <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.client && <span className="font-semibold text-foreground">{project.client}</span>}
            {project.client && project.description ? " · " : ""}
            {project.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportBundle}
            title="Download the full project as JSON for LLM processing"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> New topic
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-crit/30 bg-crit/10 px-3.5 py-2.5 text-xs text-crit">{error}</div>
      )}

      {adding && (
        <Card className="mt-3">
          <CardContent className="p-5">
            <form onSubmit={submit} className="grid gap-3.5">
              <div>
                <Label htmlFor="t-title">Topic</Label>
                <Input
                  id="t-title"
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Rig-side data capture"
                />
              </div>
              <div>
                <Label htmlFor="t-obj">Objective</Label>
                <Textarea
                  id="t-obj"
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  placeholder="What this topic has to establish. Questions beneath it exist to refine or answer this."
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <Label htmlFor="t-status">Status</Label>
                  <Select
                    id="t-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TopicStatus })}
                  >
                    <option value="open">Open</option>
                    <option value="refining">Refining</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
                <Button type="submit" size="sm" disabled={saving || !form.title.trim()}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add topic
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {topics.length === 0 ? (
        <Card className="mt-3">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No topics yet. A topic carries an objective; its questions exist to refine or answer that objective.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 grid gap-2.5">
          {topics.map((t) => (
            <Card key={t.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-start gap-3 p-4">
                <button onClick={() => onOpenTopic(t.id)} className="group min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[14.5px] font-semibold">{t.title}</span>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </div>
                  {t.objective && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                      <Target className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                      <span>{t.objective}</span>
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-[11px] text-muted-foreground">
                    <span>{t.question_count ?? 0} questions</span>
                    <span>{t.answered_count ?? 0} with responses</span>
                  </div>
                </button>
                <div className="flex flex-none items-center gap-1">
                  <Button size="icon" variant="ghost" title="Delete topic" onClick={() => removeTopic(t)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" title="Open topic" onClick={() => onOpenTopic(t.id)}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
