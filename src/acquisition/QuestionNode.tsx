import * as React from "react";
import { CornerDownRight, FileAudio, HelpCircle, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { AudioRecorder, formatDuration } from "@/components/AudioRecorder";
import { api } from "./api";
import type { Answer, Question } from "./types";
import { statusVariant } from "./statusVariant";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });

/** Strips markup so rich text can be measured for emptiness. */
const isBlank = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() === "";

function AnswerCard({ answer, onDelete }: { answer: Answer; onDelete: () => void }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3.5 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {answer.kind === "audio" ? (
          <Badge variant="default" className="gap-1">
            <FileAudio className="h-3 w-3" /> audio
          </Badge>
        ) : (
          <Badge variant="outline">written</Badge>
        )}
        <span>{answer.author ?? "Unattributed"}</span>
        <span>&middot;</span>
        <span>{stamp(answer.created_at)}</span>
        <div className="flex-1" />
        <Button size="icon" variant="ghost" title="Delete response" onClick={onDelete} className="h-6 w-6">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {answer.kind === "text" ? (
        <div
          className="prose-reply text-[13.5px] leading-relaxed"
          // Written responses are stored as HTML from the in-app editor.
          dangerouslySetInnerHTML={{ __html: answer.body_html ?? "" }}
        />
      ) : (
        <div className="grid gap-2">
          <audio controls preload="none" src={api.audioUrl(answer.id)} className="h-8 w-full max-w-md" />
          <div className="font-mono text-[11px] text-muted-foreground">
            {answer.audio_duration_ms ? `${formatDuration(answer.audio_duration_ms)} · ` : ""}
            {answer.audio_bytes ? `${(answer.audio_bytes / 1024).toFixed(0)} KB · ` : ""}
            webm · transcript {answer.transcript_status}
          </div>
          {answer.transcript && (
            <div className="rounded border border-border bg-background px-3 py-2 text-[13px] leading-relaxed">
              {answer.transcript}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  question: Question;
  depth: number;
  author: string;
  onChanged: () => void;
}

export function QuestionNode({ question, depth, author, onChanged }: Props) {
  const [mode, setMode] = React.useState<"none" | "reply" | "counter">("none");
  const [html, setHtml] = React.useState("");
  const [counter, setCounter] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const submitText = () =>
    act(async () => {
      await api.createTextAnswer(question.id, { body_html: html, author: author || undefined });
      setHtml("");
      setMode("none");
    });

  const submitAudio = async (blob: Blob, durationMs: number) => {
    await api.createAudioAnswer(question.id, blob, durationMs, author || undefined);
    onChanged();
  };

  const submitCounter = () =>
    act(async () => {
      await api.createQuestion(question.topic_id, {
        body: counter,
        author: author || undefined,
        parent_id: question.id,
      });
      setCounter("");
      setMode("none");
    });

  const toggleStatus = () =>
    act(() =>
      api.updateQuestion(question.id, { status: question.status === "answered" ? "open" : "answered" })
    );

  const remove = () => {
    if (!window.confirm("Delete this question, its counter questions and their responses?")) return;
    act(() => api.deleteQuestion(question.id));
  };

  return (
    <div className={depth > 0 ? "border-l-2 border-border pl-4 sm:pl-5" : ""}>
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-2.5">
          {depth === 0 ? (
            <HelpCircle className="mt-0.5 h-4 w-4 flex-none text-primary" />
          ) : (
            <CornerDownRight className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug">{question.body}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {depth > 0 && <Badge variant="outline">counter question</Badge>}
              <button onClick={toggleStatus} disabled={busy} title="Toggle answered">
                <Badge variant={statusVariant(question.status)}>{question.status}</Badge>
              </button>
              <span>{question.author ?? "Unattributed"}</span>
              <span>&middot;</span>
              <span>{stamp(question.created_at)}</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" title="Delete question" onClick={remove} className="h-7 w-7">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        {question.answers.length > 0 && (
          <div className="mt-3 grid gap-2">
            {question.answers.map((a) => (
              <AnswerCard key={a.id} answer={a} onDelete={() => act(() => api.deleteAnswer(a.id))} />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={mode === "reply" ? "default" : "outline"} onClick={() => setMode(mode === "reply" ? "none" : "reply")}>
            Respond
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "counter" ? "none" : "counter")}>
            <MessageSquarePlus className="h-3.5 w-3.5" /> Counter question
          </Button>
        </div>

        {mode === "reply" && (
          <div className="mt-3 grid gap-2.5">
            <RichTextEditor value={html} onChange={setHtml} placeholder="Write the response&hellip;" />
            <div>
              <Button size="sm" onClick={submitText} disabled={busy || isBlank(html)}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save written response
              </Button>
            </div>
            <AudioRecorder onSubmit={submitAudio} disabled={busy} />
          </div>
        )}

        {mode === "counter" && (
          <div className="mt-3 grid gap-2.5">
            <Textarea
              autoFocus
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              placeholder="Ask a counter question against this one&hellip;"
            />
            <div>
              <Button size="sm" onClick={submitCounter} disabled={busy || !counter.trim()}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add counter question
              </Button>
            </div>
          </div>
        )}

        {error && <div className="mt-2 text-[11.5px] text-crit">{error}</div>}
      </div>

      {question.children.length > 0 && (
        <div className="mt-2.5 grid gap-2.5">
          {question.children.map((child) => (
            <QuestionNode key={child.id} question={child} depth={depth + 1} author={author} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
