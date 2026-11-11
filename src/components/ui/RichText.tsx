import { Fragment, type ReactNode } from "react";

/**
 * Text written in the admin, shown the way it was typed.
 *
 * The formatting is deliberately tiny, so it can be typed by hand as easily
 * as through the toolbar:
 *   - Enter starts a new line, a blank line starts a new paragraph
 *   - **two stars either side** makes it bold
 *
 * Everything is built from React nodes — nothing is ever set as HTML — so
 * whatever is typed in the admin can only ever come out as text.
 */
export default function RichText({
  text,
  className,
  paragraphClassName = "",
  inline = false,
}: {
  text: string | null | undefined;
  /** on the wrapper */
  className?: string;
  /** on each paragraph; the gap between paragraphs belongs here (e.g. "mt-4 first:mt-0") */
  paragraphClassName?: string;
  /** a span with line breaks only, for text that sits inside a sentence */
  inline?: boolean;
}) {
  const body = (text ?? "").replace(/\r\n?/g, "\n").trim();
  if (!body) return null;

  if (inline) return <span className={className}>{lines(body)}</span>;

  const paragraphs = body.split(/\n[ \t]*\n+/);
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className={paragraphClassName}>
          {lines(p.trim())}
        </p>
      ))}
    </div>
  );
}

function lines(block: string): ReactNode {
  return block.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {bold(line)}
    </Fragment>
  ));
}

/** `**word**` → <strong>; an unpaired `**` is left as typed */
function bold(line: string): ReactNode {
  const parts = line.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return line;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-silk">
        {part}
      </strong>
    ) : (
      part
    )
  );
}
