import React from "react";
import { Input } from "antd";

/**
 * Renders an ordered list of content blocks for a quiz question.
 *
 * Props:
 *   blocks          – array of QuestionContentBlockResponse
 *   blanks          – { [itemId]: string } – current cloze answers (student mode)
 *   onBlankChange   – (blankKey, value) => void – called when student types in a blank
 *   showBlanks      – bool – true in student attempt mode
 */
export default function QuestionBlocksRenderer({
  blocks = [],
  blanks = {},
  onBlankChange,
  showBlanks = false,
}) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      {[...blocks]
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((block) => (
          <BlockNode
            key={block.id ?? block.orderIndex}
            block={block}
            blanks={blanks}
            onBlankChange={onBlankChange}
            showBlanks={showBlanks}
          />
        ))}
    </div>
  );
}

function BlockNode({ block, blanks, onBlankChange, showBlanks }) {
  switch (block.blockType) {
    case "TEXT":
      return <p className="text-sm text-gray-800 whitespace-pre-wrap">{block.content}</p>;

    case "RICH_TEXT":
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content || "" }}
        />
      );

    case "CODE":
      return (
        <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-sm overflow-x-auto font-mono">
          <code>{block.content}</code>
        </pre>
      );

    case "MATH":
      return (
        <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm font-mono text-blue-900">
          {block.content}
        </div>
      );

    case "TABLE":
      return <MarkdownTable raw={block.content} />;

    case "MEDIA":
      return <MediaBlock resource={block.resource} />;

    case "BLANK_REF":
      if (!showBlanks) return null;
      return (
        <Input
          className="inline-block w-48"
          placeholder={block.blankKey || "..."}
          value={blanks[block.blankKey] || ""}
          onChange={(e) => onBlankChange && onBlankChange(block.blankKey, e.target.value)}
        />
      );

    default:
      return null;
  }
}

function MediaBlock({ resource }) {
  if (!resource) return null;
  const { fileUrl, embedUrl, mimeType, hlsUrl, type } = resource;

  if (type === "LINK" && embedUrl) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200">
        <iframe
          src={embedUrl}
          className="w-full aspect-video"
          allowFullScreen
          title="embed"
        />
      </div>
    );
  }

  if (mimeType?.startsWith("audio/") || type === "AUDIO") {
    return (
      <audio controls className="w-full rounded-lg" src={fileUrl}>
        <track kind="captions" />
      </audio>
    );
  }

  if (mimeType?.startsWith("video/") || type === "VIDEO") {
    return (
      <video controls className="w-full rounded-lg max-h-72" src={hlsUrl || fileUrl}>
        <track kind="captions" />
      </video>
    );
  }

  if (mimeType?.startsWith("image/") || type === "IMAGE") {
    return (
      <img
        src={fileUrl}
        alt=""
        className="max-w-full rounded-lg border border-gray-200"
        style={{ maxHeight: 360 }}
      />
    );
  }

  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">
      {resource.title || fileUrl}
    </a>
  );
}

function MarkdownTable({ raw = "" }) {
  const lines = raw.trim().split("\n").filter((l) => !l.match(/^[\s|:-]+$/));
  if (lines.length < 2) return <pre className="text-sm">{raw}</pre>;

  const parseRow = (line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="border border-gray-300 px-3 py-1 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="even:bg-gray-50">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-300 px-3 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
