import React from "react";
import { Button, Input, Select } from "antd";
import {
  PlusCircleIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

const { TextArea } = Input;

const BLOCK_TYPE_OPTIONS = [
  { value: "TEXT", label: "Văn bản" },
  { value: "RICH_TEXT", label: "Rich Text (HTML)" },
  { value: "CODE", label: "Code" },
  { value: "MATH", label: "Công thức toán" },
  { value: "TABLE", label: "Bảng" },
  { value: "MEDIA", label: "Ảnh / Audio / Video" },
  { value: "BLANK_REF", label: "Chỗ trống (CLOZE)" },
];

const CODE_LANG_OPTIONS = [
  "java", "python", "javascript", "typescript", "c", "cpp", "csharp",
  "sql", "html", "css", "json", "xml", "bash", "kotlin", "swift",
];

const createLocalId = () => `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const defaultBlock = (type = "TEXT") => ({
  _localId: createLocalId(),
  blockType: type,
  content: "",
  language: type === "CODE" ? "java" : undefined,
  blankKey: type === "BLANK_REF" ? "" : undefined,
  resourceId: undefined,
  orderIndex: 0,
});

/**
 * Block list editor for teacher / question bank form.
 *
 * Props:
 *   blocks      – array of block objects (local state managed by parent)
 *   onChange    – (newBlocks) => void
 */
export default function QuestionBlocksEditor({ blocks = [], onChange }) {
  const notify = (updated) => {
    onChange(
      updated.map((b, i) => ({ ...b, orderIndex: i + 1 }))
    );
  };

  const add = (type = "TEXT") => {
    notify([...blocks, defaultBlock(type)]);
  };

  const remove = (localId) => {
    notify(blocks.filter((b) => b._localId !== localId));
  };

  const move = (localId, dir) => {
    const idx = blocks.findIndex((b) => b._localId === localId);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    notify(copy);
  };

  const patch = (localId, patch) => {
    notify(blocks.map((b) => (b._localId === localId ? { ...b, ...patch } : b)));
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => (
        <BlockRow
          key={block._localId}
          block={block}
          isFirst={idx === 0}
          isLast={idx === blocks.length - 1}
          onRemove={() => remove(block._localId)}
          onMoveUp={() => move(block._localId, -1)}
          onMoveDown={() => move(block._localId, 1)}
          onPatch={(p) => patch(block._localId, p)}
        />
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        {BLOCK_TYPE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="small"
            icon={<PlusCircleIcon className="w-4 h-4" />}
            onClick={() => add(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockRow({ block, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onPatch }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2">
      <div className="flex items-center gap-2">
        <Select
          size="small"
          value={block.blockType}
          onChange={(v) => onPatch({ blockType: v })}
          options={BLOCK_TYPE_OPTIONS}
          className="w-44"
        />
        <div className="flex gap-1 ml-auto">
          <Button
            size="small"
            icon={<ArrowUpIcon className="w-3 h-3" />}
            disabled={isFirst}
            onClick={onMoveUp}
          />
          <Button
            size="small"
            icon={<ArrowDownIcon className="w-3 h-3" />}
            disabled={isLast}
            onClick={onMoveDown}
          />
          <Button
            size="small"
            danger
            icon={<TrashIcon className="w-3 h-3" />}
            onClick={onRemove}
          />
        </div>
      </div>

      <BlockContent block={block} onPatch={onPatch} />
    </div>
  );
}

function BlockContent({ block, onPatch }) {
  switch (block.blockType) {
    case "TEXT":
    case "RICH_TEXT":
      return (
        <TextArea
          rows={3}
          placeholder="Nhập nội dung..."
          value={block.content || ""}
          onChange={(e) => onPatch({ content: e.target.value })}
        />
      );

    case "CODE":
      return (
        <div className="space-y-2">
          <Select
            size="small"
            value={block.language || "java"}
            onChange={(v) => onPatch({ language: v })}
            options={CODE_LANG_OPTIONS.map((l) => ({ value: l, label: l }))}
            className="w-36"
          />
          <TextArea
            rows={5}
            placeholder="Nhập code..."
            value={block.content || ""}
            onChange={(e) => onPatch({ content: e.target.value })}
            className="font-mono text-sm"
          />
        </div>
      );

    case "MATH":
      return (
        <TextArea
          rows={2}
          placeholder="LaTeX: \int_0^1 x^2 \, dx"
          value={block.content || ""}
          onChange={(e) => onPatch({ content: e.target.value })}
          className="font-mono text-sm"
        />
      );

    case "TABLE":
      return (
        <TextArea
          rows={4}
          placeholder={"| Col1 | Col2 |\n|---|---|\n| a | b |"}
          value={block.content || ""}
          onChange={(e) => onPatch({ content: e.target.value })}
          className="font-mono text-sm"
        />
      );

    case "MEDIA":
      return (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Tải file lên trước qua{" "}
            <span className="font-medium">Resource</span>, sau đó nhập Resource ID:
          </p>
          <Input
            type="number"
            placeholder="Resource ID"
            value={block.resourceId || ""}
            onChange={(e) =>
              onPatch({ resourceId: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      );

    case "BLANK_REF":
      return (
        <Input
          placeholder="blank_key (ví dụ: b1) — phải khớp với itemKey của BLANK"
          value={block.blankKey || ""}
          onChange={(e) => onPatch({ blankKey: e.target.value })}
        />
      );

    default:
      return null;
  }
}
