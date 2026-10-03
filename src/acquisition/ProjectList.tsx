import * as React from "react";
import { FolderPlus, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { api } from "./api";
import type { Project, ProjectStatus } from "./types";
import { statusVariant } from "./statusVariant";

export function ProjectList({ onOpen }: { onOpen: (id: string) => void }) {
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", client: "", description: "", status: "active" as ProjectStatus });

  const load = React.useCallback(() => {
    api
      .listProjects()
      .then((rows) => {
        setProjects(rows);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  React.useEffect(load, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await api.createProject(form);
      setForm({ name: "", client: "", description: "", status: "active" });
      setAdding(false);
      load();
      onOpen(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[17px] font-bold tracking-tight">Acquisition projects</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each project groups the topics being explored for one engagement.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <FolderPlus className="h-3.5 w-3.5" /> New project
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-crit/30 bg-crit/10 px-3.5 py-2.5 text-xs text-crit">
          {error} &mdash; is the acquisition API running on port 4000?
        </div>
      )}

      {adding && (
        <Card className="mt-3">
          <CardContent className="p-5">
            <form onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="p-name">Project name</Label>
                <Input
                  id="p-name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="DSOPS — Gamsberg rollout"
                />
              </div>
              <div>
                <Label htmlFor="p-client">Client</Label>
                <Input
                  id="p-client"
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value })}
                  placeholder="Nsimbi Mining"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-desc">Description</Label>
                <Textarea
                  id="p-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this engagement needs to establish."
                />
              </div>
              <div>
                <Label htmlFor="p-status">Status</Label>
                <Select
                  id="p-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On hold</option>
                  <option value="closed">Closed</option>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create project
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projects === null && !error && (
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…
        </div>
      )}

      {projects?.length === 0 && (
        <Card className="mt-3">
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            No projects yet. Create one to start capturing topics and questions.
          </CardContent>
        </Card>
      )}

      <div className="mt-3 grid gap-2.5">
        {projects?.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[14.5px] font-semibold">{p.name}</span>
                <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                {p.client && <span className="text-[11.5px] text-muted-foreground">{p.client}</span>}
              </div>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span>{p.topic_count ?? 0} topics</span>
                <span>{p.question_count ?? 0} questions</span>
                <span>{p.answer_count ?? 0} responses</span>
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 flex-none text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
