import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Button, Input, Select, Switch, InputNumber, Drawer, Checkbox,
  Spin, Dropdown, Tag, Radio, message,
} from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { createQuiz, getQuizById, updateQuiz } from "../../api/quiz";
import { getQuestionBankById, getQuestionBanks, getTags } from "../../api/questionBank";
import { uploadStandaloneResource } from "../../api/resource";
import { createClassContentItem } from "../../api/classSection";
import {
  createContentItemTemplate,
  getQuizTemplateById,
  createQuizTemplate,
  updateQuizTemplate,
} from "../../api/curriculumTemplate";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const QUESTION_TYPE_OPTIONS = [
  { value: "SINGLE_CHOICE",   label: "Single choice" },
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "TRUE_FALSE",      label: "True-False" },
  { value: "MATCHING",        label: "Matching" },
  { value: "IMAGE_MATCHING",  label: "Image matching" },
  { value: "SHORT_ANSWER",    label: "Keywords" },
  { value: "CLOZE",           label: "Fill in the gap" },
  { value: "DRAG_ORDER",      label: "Ordering" },
  { value: "ESSAY",           label: "Essay" },
];

const DIFFICULTY_OPTIONS = [
  { value: "EASY",   label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD",   label: "Hard" },
];

const SELECTION_MODE_OPTIONS = [
  { value: "ALL_MATCHED", label: "All matched" },
  { value: "RANDOM",      label: "Random" },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image", "code-block"],
    ["clean"],
  ],
};

/* ─────────────────────────────────────────────
   Helper functions
───────────────────────────────────────────── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeAnswer = (content = "", isCorrect = false) => ({
  localId: `a-${uid()}`,
  id: null,
  content,
  isCorrect,
  explanation: null,
  resourceId: null,
  resource: null,
});

const makeItem = (role, content = "", extra = {}) => ({
  localId: `item-${uid()}`,
  id: null,
  role,
  content,
  itemKey: role === "PROMPT" ? `k${uid()}` : null,
  correctMatchKey: null,
  correctOrderIndex: null,
  blankIndex: null,
  blankType: "TEXT_INPUT",
  acceptedAnswers: [],
  blankOptions: null,
  resourceId: null,
  ...extra,
});

const makeQuestion = (type = "SINGLE_CHOICE") => {
  const q = {
    localId: `q-${uid()}`,
    id: null,
    content: "",
    type,
    points: 1,
    resourceId: null,
    resource: null,
    answers: [],
    items: [],
    clozeSyntax: "",
  };
  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    q.answers = [makeAnswer(), makeAnswer()];
  } else if (type === "TRUE_FALSE") {
    q.answers = [makeAnswer("True", true), makeAnswer("False", false)];
  } else if (type === "MATCHING" || type === "IMAGE_MATCHING") {
    const matchKey = `k${uid()}`;
    q.items = [
      makeItem("PROMPT", "", { correctMatchKey: matchKey }),
      makeItem("MATCH", "", { itemKey: matchKey }),
    ];
  } else if (type === "DRAG_ORDER") {
    q.items = [makeItem("ORDER_ITEM", ""), makeItem("ORDER_ITEM", "")];
  } else if (type === "SHORT_ANSWER") {
    q.answers = [makeAnswer()];
  }
  return q;
};

const makeBankSource = () => ({
  localId: `bs-${uid()}`,
  id: null,
  questionBankId: null,
  tagId: null,
  selectionMode: "ALL_MATCHED",
  questionCount: null,
  difficultyLevel: null,
  manualQuestionIds: [],
});

const parseClozeToItems = (syntax) => {
  const items = [];
  let blankIndex = 0;
  const regex = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = regex.exec(syntax)) !== null) {
    const parts = m[1].split("|");
    const correct = parts[0].trim();
    const isSelect = parts.length > 1;
    items.push({
      blankIndex,
      blankType: isSelect ? "SELECT" : "TEXT_INPUT",
      acceptedAnswers: [correct],
      blankOptions: isSelect ? JSON.stringify(parts.map((p) => p.trim())) : null,
      role: "BLANK",
      content: correct,
    });
    blankIndex++;
  }
  return items;
};

const transformApiQuestion = (q) => {
  const base = {
    localId: `q-${uid()}`,
    id: q.id,
    content: q.content || "",
    type: q.type,
    points: Number(q.points) || 1,
    resourceId: q.resource?.id ?? null,
    resource: q.resource ?? null,
    answers: (q.answers || []).map((a) => ({
      localId: `a-${uid()}`,
      id: a.id,
      content: a.content || "",
      isCorrect: !!a.isCorrect,
      explanation: a.explanation ?? null,
      resourceId: a.resourceId ?? null,
      resource: a.resource ?? null,
    })),
    items: (q.items || []).map((item) => ({
      localId: `item-${uid()}`,
      id: item.id,
      role: item.role,
      content: item.content || "",
      itemKey: item.itemKey,
      correctMatchKey: item.correctMatchKey,
      correctOrderIndex: item.correctOrderIndex,
      blankIndex: item.blankIndex,
      blankType: item.blankType || "TEXT_INPUT",
      acceptedAnswers: item.acceptedAnswers || [],
      blankOptions: item.blankOptions,
      resourceId: item.resourceId,
      orderIndex: item.orderIndex,
    })),
    clozeSyntax: "",
  };
  if (q.type === "CLOZE") base.clozeSyntax = q.content || "";
  return base;
};

const convertBankQToLocal = (bq) => {
  const base = {
    localId: `q-${uid()}`,
    id: null,
    content: bq.content || "",
    type: bq.type,
    points: Number(bq.defaultPoints) || 1,
    resourceId: bq.resource?.id ?? null,
    resource: bq.resource ?? null,
    answers: (bq.options || []).map((o) => ({
      localId: `a-${uid()}`,
      id: null,
      content: o.content || "",
      isCorrect: !!o.isCorrect,
      explanation: o.explanation ?? null,
      resourceId: o.resourceId ?? null,
      resource: null,
    })),
    items: (bq.items || []).map((item) => ({
      localId: `item-${uid()}`,
      id: null,
      role: item.role,
      content: item.content || "",
      itemKey: item.itemKey,
      correctMatchKey: item.correctMatchKey,
      correctOrderIndex: item.correctOrderIndex,
      blankIndex: item.blankIndex,
      blankType: item.blankType || "TEXT_INPUT",
      acceptedAnswers: item.acceptedAnswers || [],
      blankOptions: item.blankOptions,
      resourceId: item.resourceId,
    })),
    clozeSyntax: "",
  };
  if (bq.type === "CLOZE") base.clozeSyntax = bq.content || "";
  return base;
};

/* ─────────────────────────────────────────────
   Answer sub-components
───────────────────────────────────────────── */
function AnswerRow({ answer, isSingle, onToggleCorrect, onChangeContent, onChangeExplanation, onDelete, showDelete = true }) {
  const [showExp, setShowExp] = useState(false);
  const [expVal, setExpVal] = useState(answer.explanation || "");

  useEffect(() => { setExpVal(answer.explanation || ""); }, [answer.explanation]);

  return (
    <div className={`rounded-lg border transition-colors ${answer.isCorrect ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="cursor-grab text-gray-300 select-none text-sm">⋮⋮</span>
        <Input
          className="flex-1 border-none shadow-none bg-transparent text-sm"
          value={answer.content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder="Answer text..."
        />
        {!showExp && (
          <button
            className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
            onClick={() => setShowExp(true)}
          >
            {answer.explanation ? "Edit explanation" : "+ Add explanation"}
          </button>
        )}
        {showDelete && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1 rounded shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <span className="text-xs text-gray-500 shrink-0">Correct</span>
        {isSingle ? (
          <Radio checked={answer.isCorrect} onChange={onToggleCorrect} />
        ) : (
          <Checkbox checked={answer.isCorrect} onChange={onToggleCorrect} />
        )}
      </div>
      {showExp && (
        <div className="px-3 pb-2 border-t border-gray-100">
          <div className="flex items-start gap-2 mt-2">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="text-sm"
              placeholder="Explanation shown after submission..."
              value={expVal}
              onChange={(e) => setExpVal(e.target.value)}
              onBlur={() => {
                onChangeExplanation(expVal);
                if (!expVal) setShowExp(false);
              }}
              autoFocus
            />
            <button
              className="text-gray-400 hover:text-gray-600 mt-1 shrink-0"
              onClick={() => { setShowExp(false); setExpVal(answer.explanation || ""); }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddAnswerInput({ onAdd }) {
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div className="flex items-center gap-2 mt-2 border border-dashed border-gray-300 rounded-lg px-3 py-2">
      <Input
        className="flex-1 border-none shadow-none bg-transparent text-sm"
        placeholder="Add new answer"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={submit}
      />
      <button onClick={submit} className="text-blue-500 hover:text-blue-700 font-semibold text-sm">Add</button>
    </div>
  );
}

function ChoiceAnswers({ question, onChange }) {
  const isSingle = question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE";
  const { answers } = question;

  const update = (idx, patch) =>
    onChange({ answers: answers.map((a, i) => (i === idx ? { ...a, ...patch } : a)) });
  const remove = (idx) => onChange({ answers: answers.filter((_, i) => i !== idx) });
  const addNew = (content) => onChange({ answers: [...answers, makeAnswer(content)] });
  const setCorrect = (idx) => {
    if (isSingle) {
      onChange({ answers: answers.map((a, i) => ({ ...a, isCorrect: i === idx })) });
    } else {
      onChange({ answers: answers.map((a, i) => (i === idx ? { ...a, isCorrect: !a.isCorrect } : a)) });
    }
  };

  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Answer</div>
      <div className="space-y-2">
        {answers.map((a, idx) => (
          <AnswerRow
            key={a.localId}
            answer={a}
            isSingle={isSingle}
            onToggleCorrect={() => setCorrect(idx)}
            onChangeContent={(v) => update(idx, { content: v })}
            onChangeExplanation={(v) => update(idx, { explanation: v || null })}
            onDelete={() => remove(idx)}
            showDelete={question.type !== "TRUE_FALSE"}
          />
        ))}
      </div>
      {question.type !== "TRUE_FALSE" && <AddAnswerInput onAdd={addNew} />}
    </div>
  );
}

function ImageUploadCell({ resourceId, onUpload }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadStandaloneResource(file);
      onUpload(res.id || res.resourceId);
    } catch { message.error("Upload failed"); }
    finally { setUploading(false); }
  };
  if (resourceId) {
    return (
      <div className="relative">
        <img
          src={`${import.meta.env.VITE_BACKEND_URL}/api/v1/lms/resources/${resourceId}/view`}
          className="w-full h-28 object-contain rounded"
          alt=""
        />
        <button
          onClick={() => onUpload(null)}
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
        >×</button>
      </div>
    );
  }
  return (
    <div
      className="flex flex-col items-center justify-center h-28 cursor-pointer border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      {uploading ? <Spin size="small" /> : (
        <>
          <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-gray-400">Upload image</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

function MatchingPairs({ question, onChange }) {
  const isImage = question.type === "IMAGE_MATCHING";
  const { items } = question;
  const prompts = items.filter((i) => i.role === "PROMPT");
  const matches = items.filter((i) => i.role === "MATCH");

  const updatePrompt = (promptLocalId, patch) =>
    onChange({ items: items.map((item) => (item.localId === promptLocalId ? { ...item, ...patch } : item)) });

  const updateMatch = (matchLocalId, patch) =>
    onChange({ items: items.map((item) => (item.localId === matchLocalId ? { ...item, ...patch } : item)) });

  const removePair = (matchKey) => {
    onChange({
      items: items.filter(
        (item) => !(item.role === "PROMPT" && (item.correctMatchKey === matchKey || item.itemKey === matchKey)) &&
                  !(item.role === "MATCH" && (item.itemKey === matchKey || item.correctMatchKey === matchKey))
      ),
    });
  };

  const addPair = () => {
    const matchKey = `k${uid()}`;
    onChange({
      items: [
        ...items,
        makeItem("PROMPT", "", { correctMatchKey: matchKey }),
        makeItem("MATCH", "", { itemKey: matchKey }),
      ],
    });
  };

  const pairCount = Math.min(prompts.length, matches.length);

  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Questions & Answers</div>
      <div className="space-y-3">
        {Array.from({ length: pairCount }, (_, i) => (
          <div key={prompts[i]?.localId} className="grid grid-cols-2 gap-3 items-start">
            <div className="border border-dashed border-gray-300 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Question</div>
              {isImage ? (
                <ImageUploadCell
                  resourceId={prompts[i]?.resourceId}
                  onUpload={(id) => updatePrompt(prompts[i].localId, { resourceId: id })}
                />
              ) : (
                <Input
                  value={prompts[i]?.content}
                  onChange={(e) => updatePrompt(prompts[i].localId, { content: e.target.value })}
                  placeholder="Enter question"
                  className="text-sm"
                />
              )}
            </div>
            <div className="border border-dashed border-gray-300 rounded-lg p-3 relative">
              <div className="text-xs text-gray-400 mb-1">Answer</div>
              {isImage ? (
                <ImageUploadCell
                  resourceId={matches[i]?.resourceId}
                  onUpload={(id) => updateMatch(matches[i].localId, { resourceId: id })}
                />
              ) : (
                <Input
                  value={matches[i]?.content}
                  onChange={(e) => updateMatch(matches[i].localId, { content: e.target.value })}
                  placeholder="Enter answer"
                  className="text-sm"
                />
              )}
              <button
                onClick={() => removePair(prompts[i]?.correctMatchKey || matches[i]?.itemKey || prompts[i]?.itemKey)}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addPair} className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add new answer
      </button>
    </div>
  );
}

function SortableOrderItem({ item, onChangeContent, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white"
    >
      <span className="cursor-grab text-gray-300 select-none" {...attributes} {...listeners}>⋮⋮</span>
      <Input
        className="flex-1 border-none shadow-none bg-transparent text-sm"
        value={item.content}
        onChange={(e) => onChangeContent(e.target.value)}
        placeholder="Item text..."
      />
      <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function OrderingItems({ question, onChange }) {
  const { items } = question;
  const sensors = useSensors(useSensor(PointerSensor));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIdx = items.findIndex((i) => i.localId === active.id);
      const newIdx = items.findIndex((i) => i.localId === over.id);
      onChange({ items: arrayMove(items, oldIdx, newIdx) });
    }
  };
  const update = (idx, content) =>
    onChange({ items: items.map((item, i) => (i === idx ? { ...item, content } : item)) });
  const remove = (idx) => onChange({ items: items.filter((_, i) => i !== idx) });
  const add = () => onChange({ items: [...items, makeItem("ORDER_ITEM", "")] });

  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Answers <span className="text-xs font-normal text-gray-400">(drag to set correct order)</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.localId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <SortableOrderItem
                key={item.localId}
                item={item}
                onChangeContent={(v) => update(idx, v)}
                onDelete={() => remove(idx)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button onClick={add} className="mt-2 flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm">
        + Add item
      </button>
    </div>
  );
}

function ShortAnswerSection({ question, onChange }) {
  const { answers } = question;
  const update = (idx, content) =>
    onChange({ answers: answers.map((a, i) => (i === idx ? { ...a, content } : a)) });
  const remove = (idx) => onChange({ answers: answers.filter((_, i) => i !== idx) });
  const add = () => onChange({ answers: [...answers, makeAnswer()] });

  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Accepted Keywords</div>
      <div className="space-y-2">
        {answers.map((a, idx) => (
          <div key={a.localId} className="flex items-center gap-2">
            <Input
              className="flex-1 text-sm"
              value={a.content}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={`Keyword ${idx + 1}`}
            />
            <button onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-2 text-blue-500 hover:text-blue-700 text-sm">+ Add keyword</button>
    </div>
  );
}

function ClozeSection({ question, onChange }) {
  const preview = (question.clozeSyntax || "").replace(
    /\[\[([^\]]+)\]\]/g,
    (_, inner) => {
      const parts = inner.split("|");
      return `<span style="border-bottom:2px solid #9ca3af;min-width:3rem;display:inline-block;margin:0 4px;color:#2563eb;font-weight:600">${parts[0]}</span>`;
    }
  );
  return (
    <div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Answers</div>
      <Input.TextArea
        rows={5}
        className="font-mono text-sm"
        value={question.clozeSyntax}
        onChange={(e) => onChange({ clozeSyntax: e.target.value })}
        placeholder="Type text with [[answer]] for text input or [[correct|opt1|opt2]] for dropdown."
      />
      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
        <strong>Example:</strong> She was born in [[Paris]] and studied [[science|science|art|history]].
      </div>
      {question.clozeSyntax && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Preview:</div>
          <div
            className="p-3 bg-gray-50 rounded text-sm leading-loose"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}
    </div>
  );
}

function AnswerSection({ question, onChange }) {
  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type))
    return <ChoiceAnswers question={question} onChange={onChange} />;
  if (question.type === "MATCHING" || question.type === "IMAGE_MATCHING")
    return <MatchingPairs question={question} onChange={onChange} />;
  if (question.type === "DRAG_ORDER")
    return <OrderingItems question={question} onChange={onChange} />;
  if (question.type === "SHORT_ANSWER")
    return <ShortAnswerSection question={question} onChange={onChange} />;
  if (question.type === "CLOZE")
    return <ClozeSection question={question} onChange={onChange} />;
  if (question.type === "ESSAY")
    return (
      <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-4 text-center">
        Essay questions are manually graded by the teacher after submission.
      </div>
    );
  return null;
}

/* ─────────────────────────────────────────────
   QuestionCard
───────────────────────────────────────────── */
function QuestionCard({ question, index, onChange, onDelete, dragHandleProps }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="cursor-grab text-gray-300 hover:text-gray-500 select-none" {...dragHandleProps}>⋮⋮</span>
        <span className="text-sm font-semibold text-gray-400 w-6 shrink-0">{index + 1}.</span>
        <Select
          size="small"
          value={question.type}
          options={QUESTION_TYPE_OPTIONS}
          onChange={(v) => {
            const fresh = makeQuestion(v);
            onChange({ type: v, answers: fresh.answers, items: fresh.items, clozeSyntax: "" });
          }}
          className="w-36"
          popupMatchSelectWidth={false}
        />
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-500">Points:</span>
          <InputNumber
            size="small"
            min={0}
            step={0.5}
            value={question.points}
            onChange={(v) => onChange({ points: v ?? 1 })}
            className="w-16"
          />
        </div>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Editor */}
          <div className="px-4 pt-3">
            {question.type === "CLOZE" && (
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">Question instruction (optional)</div>
              </div>
            )}
            <ReactQuill
              theme="snow"
              value={question.content}
              onChange={(v) => onChange({ content: v })}
              modules={QUILL_MODULES}
              placeholder="Enter your question..."
              className="quiz-quill"
            />
          </div>
          {/* Answers */}
          <div className="px-4 pb-4 pt-3">
            <AnswerSection question={question} onChange={onChange} />
          </div>
        </>
      )}
    </div>
  );
}

function SortableQuestionCard({ question, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 100 : 0 }}
    >
      <QuestionCard {...props} question={question} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   BankSourceRow
───────────────────────────────────────────── */
function BankSourceRow({ source, banks, tagsMap, onUpdate, onDelete }) {
  const tags = tagsMap[source.questionBankId] || [];
  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-xs font-semibold text-teal-700 bg-teal-100 px-2 py-1 rounded shrink-0">
          Questions Bank
        </span>
        <Select
          placeholder="Select bank"
          value={source.questionBankId}
          options={banks.map((b) => ({ value: b.id, label: b.name }))}
          onChange={(v) => onUpdate({ questionBankId: v, tagId: null })}
          className="w-44"
          size="small"
          showSearch
          filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
        />
        <Select
          placeholder="Tag"
          value={source.tagId}
          options={[{ value: null, label: "All tags" }, ...tags.map((t) => ({ value: t.id, label: t.name }))]}
          onChange={(v) => onUpdate({ tagId: v })}
          className="w-32"
          size="small"
          disabled={!source.questionBankId}
        />
        <Select
          value={source.difficultyLevel}
          placeholder="Difficulty"
          options={[{ value: null, label: "Any" }, ...DIFFICULTY_OPTIONS]}
          onChange={(v) => onUpdate({ difficultyLevel: v })}
          className="w-28"
          size="small"
        />
        <Select
          value={source.selectionMode}
          options={SELECTION_MODE_OPTIONS}
          onChange={(v) => onUpdate({ selectionMode: v })}
          className="w-28"
          size="small"
        />
        {source.selectionMode === "RANDOM" && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Count:</span>
            <InputNumber
              size="small"
              min={1}
              value={source.questionCount}
              onChange={(v) => onUpdate({ questionCount: v })}
              className="w-16"
            />
          </div>
        )}
        <button
          onClick={onDelete}
          className="ml-auto text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2 text-xs text-teal-600">
        The Question Bank is sampled at attempt start. You can delete this rule or create a new one.
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LibraryDrawer
───────────────────────────────────────────── */
function LibraryDrawer({ open, onClose, onAddQuestions }) {
  const [banks, setBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [loadingQs, setLoadingQs] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingBanks(true);
    getQuestionBanks()
      .then((data) => setBanks(Array.isArray(data) ? data : data?.content || []))
      .catch(() => {})
      .finally(() => setLoadingBanks(false));
  }, [open]);

  useEffect(() => {
    if (!selectedBankId) { setBankQuestions([]); return; }
    setLoadingQs(true);
    setSelected(new Set());
    getQuestionBankById(selectedBankId)
      .then((data) => {
        setBankQuestions(data?.questions || data?.content || []);
      })
      .catch(() => {})
      .finally(() => setLoadingQs(false));
  }, [selectedBankId]);

  const filtered = bankQuestions.filter((q) =>
    !search.trim() || (q.content || "").replace(/<[^>]*>/g, " ").toLowerCase().includes(search.toLowerCase())
  );
  const allSelected = filtered.length > 0 && filtered.every((q) => selected.has(q.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked) =>
    setSelected(checked ? new Set(filtered.map((q) => q.id)) : new Set());
  const toggle = (id) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleAdd = () => {
    const toAdd = bankQuestions.filter((q) => selected.has(q.id));
    onAddQuestions(toAdd.map(convertBankQToLocal));
    setSelected(new Set());
    onClose();
  };

  const stripHtml = (html) => html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2 font-semibold">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Questions Library (search)
        </span>
      }
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      footer={
        selected.size > 0 ? (
          <Button type="primary" block size="large" onClick={handleAdd}>
            Add {selected.size} question{selected.size > 1 ? "s" : ""}
          </Button>
        ) : null
      }
    >
      <div className="space-y-3">
        <Input
          prefix={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          placeholder="Search questions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder="Select a question bank"
          value={selectedBankId}
          onChange={setSelectedBankId}
          className="w-full"
          loading={loadingBanks}
          options={banks.map((b) => ({ value: b.id, label: b.name }))}
          showSearch
          filterOption={(input, opt) => opt.label.toLowerCase().includes(input.toLowerCase())}
        />
        {loadingQs ? (
          <div className="flex justify-center py-8"><Spin /></div>
        ) : filtered.length > 0 ? (
          <>
            <div className="flex items-center gap-2 border-b pb-2">
              <Checkbox checked={allSelected} indeterminate={someSelected} onChange={(e) => toggleAll(e.target.checked)} />
              <span className="text-xs text-gray-500">{filtered.length} question{filtered.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              {filtered.map((q) => (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(q.id) ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                  onClick={() => toggle(q.id)}
                >
                  <Checkbox checked={selected.has(q.id)} onChange={() => toggle(q.id)} onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2">{stripHtml(q.content)}</p>
                    <Tag className="mt-1 text-xs" color="blue">
                      {QUESTION_TYPE_OPTIONS.find((t) => t.value === q.type)?.label || q.type}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : selectedBankId ? (
          <div className="text-center text-gray-400 py-8 text-sm">No questions found</div>
        ) : (
          <div className="text-center text-gray-400 py-8 text-sm">Select a bank to browse questions</div>
        )}
      </div>
    </Drawer>
  );
}

/* ─────────────────────────────────────────────
   SettingsPanel
───────────────────────────────────────────── */
function SettingsPanel({ settings, onChange }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Short description of the quiz</label>
        <Input.TextArea
          rows={4}
          placeholder="Quiz description"
          value={settings.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quiz duration (minutes, 0 = no limit)</label>
          <InputNumber
            min={0}
            placeholder="No limit"
            value={settings.timeLimitMinutes}
            onChange={(v) => onChange({ timeLimitMinutes: v || null })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Attempts</label>
          <InputNumber
            min={1}
            value={settings.maxAttempts}
            onChange={(v) => onChange({ maxAttempts: v || 1 })}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quiz style</label>
        <Select
          value={settings.displayMode}
          onChange={(v) => onChange({ displayMode: v })}
          className="w-72"
          options={[
            { value: "PAGINATION", label: "Pagination" },
            { value: "ONE_PAGE",   label: "One Page" },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-8">
        <div className="flex items-center gap-3">
          <Switch checked={settings.shuffleQuestions} onChange={(v) => onChange({ shuffleQuestions: v })} />
          <span className="text-sm text-gray-700">Randomize questions</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={settings.showCorrectAnswer} onChange={(v) => onChange({ showCorrectAnswer: v })} />
          <span className="text-sm text-gray-700">Show correct answer</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Passing grade (%)</label>
        <InputNumber
          min={0}
          max={100}
          value={settings.minPassScore}
          onChange={(v) => onChange({ minPassScore: v ?? 80 })}
          className="w-40"
          addonAfter="%"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main QuizDetail
───────────────────────────────────────────── */
export default function QuizDetail() {
  const { classSectionId, quizId, chapterId, templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isTemplateMode = !!templateId;
  const isEditMode = !!quizId;
  const chapterIdFromState = location.state?.chapterId || chapterId;

  const [title, setTitle] = useState("New Quiz");
  const [questions, setQuestions] = useState([]);
  const [bankSources, setBankSources] = useState([]);
  const [settings, setSettings] = useState({
    description: "",
    timeLimitMinutes: null,
    displayMode: "PAGINATION",
    shuffleQuestions: false,
    shuffleAnswers: false,
    showCorrectAnswer: false,
    maxAttempts: 1,
    minPassScore: 80,
  });
  const [activeTab, setActiveTab] = useState("questions");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState([]);
  const [tagsMap, setTagsMap] = useState({});

  const sensors = useSensors(useSensor(PointerSensor));

  // load quiz in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setLoading(true);
    const loader = isTemplateMode ? () => getQuizTemplateById(quizId) : () => getQuizById(quizId);
    loader()
      .then((quiz) => {
        setTitle(quiz.title || "Untitled Quiz");
        setSettings({
          description: quiz.description || "",
          timeLimitMinutes: quiz.timeLimitMinutes || null,
          displayMode: quiz.displayMode || "PAGINATION",
          shuffleQuestions: !!quiz.shuffleQuestions,
          shuffleAnswers: !!quiz.shuffleAnswers,
          showCorrectAnswer: !!quiz.showCorrectAnswer,
          maxAttempts: quiz.maxAttempts || 1,
          minPassScore: quiz.minPassScore || 80,
        });
        setQuestions((quiz.questions || []).map(transformApiQuestion));
        setBankSources(
          (quiz.bankSources || []).map((src) => ({
            localId: `bs-${uid()}`,
            id: src.id,
            questionBankId: src.questionBankId,
            tagId: src.tagId,
            selectionMode: src.selectionMode || "ALL_MATCHED",
            questionCount: src.questionCount,
            difficultyLevel: src.difficultyLevel,
            manualQuestionIds: src.manualQuestionIds || [],
          }))
        );
      })
      .catch(() => message.error("Failed to load quiz"))
      .finally(() => setLoading(false));
  }, [quizId, isEditMode, isTemplateMode]);

  // load banks list for BankSourceRow
  useEffect(() => {
    getQuestionBanks()
      .then((data) => setBanks(Array.isArray(data) ? data : data?.content || []))
      .catch(() => {});
  }, []);

  // load tags when bankSources reference new banks
  useEffect(() => {
    const bankIds = [...new Set(bankSources.map((s) => s.questionBankId).filter(Boolean))];
    bankIds.forEach((bankId) => {
      if (tagsMap[bankId]) return;
      getTags(bankId)
        .then((data) => setTagsMap((prev) => ({ ...prev, [bankId]: Array.isArray(data) ? data : data?.content || [] })))
        .catch(() => {});
    });
  }, [bankSources]);

  // question handlers
  const updateQuestion = useCallback((localId, patch) => {
    setQuestions((prev) => prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
  }, []);
  const deleteQuestion = useCallback((localId) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  }, []);
  const addQuestion = (type) => setQuestions((prev) => [...prev, makeQuestion(type)]);

  const handleQuestionDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setQuestions((prev) => {
        const oldIdx = prev.findIndex((q) => q.localId === active.id);
        const newIdx = prev.findIndex((q) => q.localId === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  // bank source handlers
  const addBankSource = () => setBankSources((prev) => [...prev, makeBankSource()]);
  const updateBankSource = (localId, patch) =>
    setBankSources((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  const deleteBankSource = (localId) =>
    setBankSources((prev) => prev.filter((s) => s.localId !== localId));

  // save
  const handleSave = async () => {
    if (!title.trim()) { message.warning("Quiz title is required"); return; }
    setSaving(true);
    try {
      const processedQuestions = questions.map((q) => {
        const base = {
          id: q.id,
          content: q.type === "CLOZE" ? q.clozeSyntax : q.content,
          type: q.type,
          points: q.points,
          resourceId: q.resourceId,
          answers: [],
          items: [],
        };
        if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"].includes(q.type)) {
          base.answers = q.answers.map((a) => ({
            id: a.id,
            content: a.content,
            isCorrect: !!a.isCorrect,
            explanation: a.explanation || null,
            resourceId: a.resourceId || null,
          }));
        } else if (q.type === "CLOZE") {
          base.items = parseClozeToItems(q.clozeSyntax || "");
        } else if (q.type === "MATCHING" || q.type === "IMAGE_MATCHING") {
          base.items = q.items.map((item) => ({
            id: item.id,
            role: item.role,
            content: item.content,
            itemKey: item.itemKey,
            correctMatchKey: item.correctMatchKey,
            resourceId: item.resourceId,
          }));
        } else if (q.type === "DRAG_ORDER") {
          base.items = q.items.map((item, i) => ({
            id: item.id,
            content: item.content,
            correctOrderIndex: i + 1,
            role: "ORDER_ITEM",
          }));
        }
        return base;
      });

      const processedBankSources = bankSources.map((src, idx) => ({
        id: src.id,
        questionBankId: src.questionBankId,
        tagId: src.tagId,
        selectionMode: src.selectionMode,
        questionCount: src.questionCount,
        difficultyLevel: src.difficultyLevel,
        orderIndex: idx,
        manualQuestionIds: src.manualQuestionIds,
      }));

      const payload = {
        title: title.trim(),
        description: settings.description,
        timeLimitMinutes: settings.timeLimitMinutes,
        displayMode: settings.displayMode,
        shuffleQuestions: settings.shuffleQuestions,
        shuffleAnswers: settings.shuffleAnswers,
        showCorrectAnswer: settings.showCorrectAnswer,
        maxAttempts: settings.maxAttempts,
        minPassScore: settings.minPassScore,
        questions: processedQuestions,
        bankSources: processedBankSources,
      };

      let savedQuiz;
      if (isEditMode) {
        if (isTemplateMode) {
          savedQuiz = await updateQuizTemplate(quizId, payload);
        } else {
          savedQuiz = await updateQuiz(quizId, payload);
        }
        message.success("Quiz saved");
      } else {
        if (isTemplateMode) {
          savedQuiz = await createQuizTemplate(templateId, payload);
          if (templateId && chapterIdFromState) {
            await createContentItemTemplate(templateId, chapterIdFromState, {
              title: title.trim(),
              quizId: savedQuiz.id,
            });
          }
        } else {
          savedQuiz = await createQuiz(payload);
          if (classSectionId && chapterIdFromState) {
            await createClassContentItem(classSectionId, chapterIdFromState, {
              title: title.trim(),
              quizId: savedQuiz.id,
            });
          }
        }
        message.success("Quiz created");
        const basePath = isAdmin ? "/admin" : "/teacher";
        navigate(
          classSectionId
            ? `${basePath}/class-sections/${classSectionId}`
            : `${basePath}/quizzes/${savedQuiz.id}`
        );
      }
    } catch (err) {
      message.error("Failed to save quiz");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFromLibrary = (newQuestions) => {
    setQuestions((prev) => [...prev, ...newQuestions]);
    message.success(`Added ${newQuestions.length} question${newQuestions.length > 1 ? "s" : ""}`);
  };

  const addQuestionMenuItems = QUESTION_TYPE_OPTIONS.map((t) => ({
    key: t.value,
    label: t.label,
    onClick: () => addQuestion(t.value),
  }));

  const Sidebar = isAdmin ? AdminSidebar : TeacherSidebar;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TeacherHeader />

        {/* Top bar */}
        <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0 mt-16">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full shrink-0">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Quiz
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 text-base font-semibold border-none shadow-none bg-transparent"
            placeholder="Quiz title..."
          />
          {isEditMode && quizId && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded font-mono whitespace-nowrap shrink-0">
              id = {quizId}
            </span>
          )}
          <Button type="primary" onClick={handleSave} loading={saving} className="bg-blue-600 hover:bg-blue-700 border-0 px-6 shrink-0">
            Save
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 bg-white border-b border-gray-200 shrink-0">
          {[
            { key: "questions", label: questions.length > 0 ? `Questions (${questions.length})` : "Questions" },
            { key: "settings", label: "Settings" },
            { key: "qa", label: "Q&A" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => setLibraryOpen(true)}
            className="ml-auto flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-300 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition-colors mb-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Questions library
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "questions" && (
            <div className="max-w-4xl mx-auto px-4 py-6">
              {questions.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                  <SortableContext items={questions.map((q) => q.localId)} strategy={verticalListSortingStrategy}>
                    {questions.map((q, idx) => (
                      <SortableQuestionCard
                        key={q.localId}
                        question={q}
                        index={idx}
                        onChange={(patch) => updateQuestion(q.localId, patch)}
                        onDelete={() => deleteQuestion(q.localId)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {bankSources.map((src) => (
                <BankSourceRow
                  key={src.localId}
                  source={src}
                  banks={banks}
                  tagsMap={tagsMap}
                  onUpdate={(patch) => updateBankSource(src.localId, patch)}
                  onDelete={() => deleteBankSource(src.localId)}
                />
              ))}

              {questions.length === 0 && bankSources.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No questions yet. Add questions or connect a question bank below.</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-4">
                <Dropdown menu={{ items: addQuestionMenuItems }} trigger={["click"]}>
                  <Button type="primary" className="rounded-full px-5 bg-blue-600 hover:bg-blue-700 border-0">
                    + Question ▾
                  </Button>
                </Dropdown>
                <Button
                  onClick={addBankSource}
                  className="rounded-full px-5 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                >
                  + Question Bank
                </Button>
              </div>

              {(questions.length > 0 || bankSources.length > 0) && (
                <div className="flex justify-end mt-6">
                  <Button type="primary" onClick={handleSave} loading={saving} size="large" className="bg-blue-600 hover:bg-blue-700 border-0 px-8">
                    Save
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="px-6 py-6">
              <SettingsPanel settings={settings} onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))} />
            </div>
          )}

          {activeTab === "qa" && (
            <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Q&A section will show student questions about this quiz.</p>
            </div>
          )}
        </div>
      </div>

      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onAddQuestions={handleAddFromLibrary}
      />

      <style>{`
        .quiz-quill .ql-container { border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; font-size: 14px; min-height: 80px; }
        .quiz-quill .ql-toolbar { border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .quiz-quill .ql-editor { min-height: 80px; }
      `}</style>
    </div>
  );
}
