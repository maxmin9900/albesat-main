"use client";

import { useRef, useState } from "react";
import { Bold, Eye, PenLine } from "lucide-react";
import RichText from "@/components/ui/RichText";

/**
 * A textarea for text that is shown on the site with its line breaks and
 * bold kept (see RichText for the format).
 *
 * The B button — or Ctrl/⌘+B — wraps the selection in `**`, and Preview
 * shows the text as the site will render it. Works both as an ordinary form
 * field (`name` + `defaultValue`) and controlled (`value` + `onChange`).
 */
export default function RichTextArea({
  name,
  defaultValue,
  value,
  onChange,
  rows = 5,
  placeholder,
  className = "",
}: {
  name?: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [own, setOwn] = useState(defaultValue ?? "");
  const text = controlled ? value : own;
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const update = (next: string) => {
    if (!controlled) setOwn(next);
    onChange?.(next);
  };

  const toggleBold = () => {
    const el = ref.current;
    if (!el) return;
    let start = el.selectionStart;
    let end = el.selectionEnd;
    // nothing selected: take the word under the cursor
    if (start === end) {
      while (start > 0 && /\S/.test(text[start - 1])) start--;
      while (end < text.length && /\S/.test(text[end])) end++;
    }
    const before = text.slice(0, start);
    const chosen = text.slice(start, end);
    const after = text.slice(end);

    let next: string;
    let selStart: number;
    let selEnd: number;
    if (chosen.startsWith("**") && chosen.endsWith("**") && chosen.length >= 4) {
      // already bold, selected with its stars
      next = before + chosen.slice(2, -2) + after;
      selStart = start;
      selEnd = end - 4;
    } else if (before.endsWith("**") && after.startsWith("**")) {
      // already bold, selected inside its stars
      next = before.slice(0, -2) + chosen + after.slice(2);
      selStart = start - 2;
      selEnd = end - 2;
    } else {
      // bold never spans lines, so each selected line gets its own pair
      const wrapped = chosen
        .split("\n")
        .map((l) => (l.trim() ? `**${l}**` : l))
        .join("\n");
      const insert = chosen ? wrapped : "****";
      next = before + insert + after;
      selStart = start + 2;
      selEnd = start + insert.length - 2;
    }
    update(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const tabCls = (on: boolean) =>
    `flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
      on ? "bg-gold/15 text-gold-light" : "text-muted hover:text-cream"
    }`;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={toggleBold}
          disabled={preview}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          className="flex h-7 w-7 items-center justify-center rounded border border-border text-cream/80 transition-colors hover:border-gold/60 hover:text-gold-light disabled:opacity-40"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" onClick={() => setPreview(false)} className={tabCls(!preview)}>
          <PenLine className="h-3 w-3" /> Write
        </button>
        <button type="button" onClick={() => setPreview(true)} className={tabCls(preview)}>
          <Eye className="h-3 w-3" /> Preview
        </button>
        <span className="ms-auto text-[11px] text-muted">
          Enter = new line · empty line = new paragraph
        </span>
      </div>

      {/* the field stays mounted (only hidden) so the form still submits it */}
      <textarea
        ref={ref}
        name={name}
        value={text}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            toggleBold();
          }
        }}
        rows={rows}
        placeholder={placeholder}
        className={`${className} resize-y ${preview ? "hidden" : ""}`}
      />
      {preview && (
        <div
          className={`${className} min-h-[6rem] text-sm leading-relaxed text-cream/80`}
        >
          {text.trim() ? (
            <RichText text={text} paragraphClassName="mt-3 first:mt-0" />
          ) : (
            <span className="text-muted">Nothing written yet.</span>
          )}
        </div>
      )}
    </div>
  );
}
