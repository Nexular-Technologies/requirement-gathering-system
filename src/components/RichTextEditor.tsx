import * as React from "react";
import { Bold, Italic, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

/* Minimal contentEditable editor. Enough formatting for a written requirement
   (bold, italic, lists, quote) without pulling in an editor dependency. */
const tools = [
  { cmd: "bold", icon: Bold, title: "Bold" },
  { cmd: "italic", icon: Italic, title: "Italic" },
  { cmd: "insertUnorderedList", icon: List, title: "Bullet list" },
  { cmd: "insertOrderedList", icon: ListOrdered, title: "Numbered list" },
  { cmd: "formatBlock:blockquote", icon: Quote, title: "Quote" },
] as const;

export interface RichTextEditorHandle {
  clear: () => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, Props>(
  ({ value, onChange, placeholder = "Write a response…", className }, ref) => {
    const elRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
      clear: () => {
        if (elRef.current) elRef.current.innerHTML = "";
        onChange("");
      },
      focus: () => elRef.current?.focus(),
    }));

    // Only push `value` in when it diverges, so the caret is not reset on every keystroke.
    React.useEffect(() => {
      const el = elRef.current;
      if (el && value !== el.innerHTML) el.innerHTML = value;
    }, [value]);

    const run = (cmd: string) => {
      elRef.current?.focus();
      const [name, arg] = cmd.split(":");
      document.execCommand(name, false, arg);
      onChange(elRef.current?.innerHTML ?? "");
    };

    const empty = !value || value === "<br>";

    return (
      <div className={cn("rounded-md border border-border bg-background", className)}>
        <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
          {tools.map(({ cmd, icon: Icon, title }) => (
            <button
              key={cmd}
              type="button"
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(cmd)}
              className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="relative">
          {empty && (
            <div className="pointer-events-none absolute left-3 top-2.5 text-[13.5px] text-muted-foreground/70">
              {placeholder}
            </div>
          )}
          <div
            ref={elRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
            className="prose-reply min-h-[88px] px-3 py-2.5 text-[13.5px] leading-relaxed focus-visible:outline-none"
          />
        </div>
      </div>
    );
  }
);
RichTextEditor.displayName = "RichTextEditor";
