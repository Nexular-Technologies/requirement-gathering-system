import * as React from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

/* Records the response as webm/opus — the format the transcription step expects.
   Nothing is sent until the user confirms, so a bad take can be discarded. */
const WEBM_TYPES = ["audio/webm;codecs=opus", "audio/webm"];

const pickMimeType = () =>
  WEBM_TYPES.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));

export const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

interface Props {
  onSubmit: (blob: Blob, durationMs: number) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onSubmit, disabled }: Props) {
  const [state, setState] = React.useState<"idle" | "recording" | "review" | "sending">("idle");
  const [elapsed, setElapsed] = React.useState(0);
  const [take, setTake] = React.useState<{ blob: Blob; url: string; durationMs: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startedRef = React.useRef(0);
  const tickRef = React.useRef<number | null>(null);

  const stopTicking = () => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  React.useEffect(() => {
    return () => {
      stopTicking();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (take) URL.revokeObjectURL(take.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("This browser cannot record webm audio. Use Chrome, Edge or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationMs = Date.now() - startedRef.current;
        setTake({ blob, url: URL.createObjectURL(blob), durationMs });
        setState("review");
      };
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      recorder.start(250);
      setElapsed(0);
      setState("recording");
      tickRef.current = window.setInterval(() => setElapsed(Date.now() - startedRef.current), 200);
    } catch (err) {
      setError(err instanceof Error ? `Microphone unavailable: ${err.message}` : "Microphone unavailable");
    }
  };

  const stop = () => {
    stopTicking();
    recorderRef.current?.stop();
  };

  const discard = () => {
    if (take) URL.revokeObjectURL(take.url);
    setTake(null);
    setElapsed(0);
    setState("idle");
  };

  const send = async () => {
    if (!take) return;
    setState("sending");
    try {
      await onSubmit(take.blob, take.durationMs);
      discard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("review");
    }
  };

  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <Button type="button" size="sm" variant="outline" onClick={start} disabled={disabled}>
            <Mic className="h-3.5 w-3.5" /> Record audio response
          </Button>
        )}

        {state === "recording" && (
          <>
            <Button type="button" size="sm" onClick={stop}>
              <Square className="h-3 w-3" /> Stop
            </Button>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-crit">
              <span className="h-2 w-2 animate-pulse rounded-full bg-crit" />
              Recording {formatDuration(elapsed)}
            </span>
          </>
        )}

        {(state === "review" || state === "sending") && take && (
          <>
            <audio controls src={take.url} className="h-8 max-w-full flex-1" />
            <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
              {formatDuration(take.durationMs)} &middot; {(take.blob.size / 1024).toFixed(0)} KB &middot; webm
            </span>
            <Button type="button" size="sm" onClick={send} disabled={state === "sending"}>
              <Upload className="h-3.5 w-3.5" /> {state === "sending" ? "Uploading…" : "Attach to question"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={discard} disabled={state === "sending"}>
              <Trash2 className="h-3.5 w-3.5" /> Discard
            </Button>
          </>
        )}
      </div>
      {error && <div className="mt-2 text-[11.5px] text-crit">{error}</div>}
    </div>
  );
}
