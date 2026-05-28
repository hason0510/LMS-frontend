import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { EyeIcon } from "@heroicons/react/24/outline";
import {
  App, Button, Input, Select, Switch, InputNumber, Drawer, Checkbox,
  Spin, Dropdown, Tag, Radio, Modal,
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
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, List } from "lucide-react";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import { createQuiz, getQuizById, updateQuiz } from "../../api/quiz";
import { createStandaloneResource, deleteResource, uploadStandaloneResource } from "../../api/resource";
import { getQuestionBankById, getQuestionBanks, getTags } from "../../api/questionBank";
import { createClassContentItem, getCourseById } from "../../api/classSection";
import MediaAttachButton from "../../components/media/MediaAttachButton";
import ResourceRenderer from "../../components/media/ResourceRenderer";
import { parseClozeToItems } from "../../utils/cloze";
import {
  createContentItemTemplate,
  getQuizTemplateById,
  getTemplateById,
  createQuizTemplate,
  updateQuizTemplate,
} from "../../api/curriculumTemplate";
import { buildQuillModules, createQuillTableControl } from "../../utils/quillTable";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const QUESTION_TYPE_VALUES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MATCHING",
  "IMAGE_MATCHING",
  "SHORT_ANSWER",
  "CLOZE",
  "DRAG_ORDER",
  "ESSAY",
];

const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"];

const SELECTION_MODE_VALUES = ["ALL_MATCHED", "RANDOM"];
const TAG_MATCH_MODE_VALUES = ["ANY", "ALL"];

const QUILL_MODULES = buildQuillModules([
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [createQuillTableControl()],
  ["link", "image", "code-block"],
  ["clean"],
]);

/* ─────────────────────────────────────────────
   Helper functions
───────────────────────────────────────────── */
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const normalizeUploadedResource = (response, scopeType, scopeId) => {
  const payload = response ?? {};
  const id = payload.resourceId ?? payload.id ?? null;
  return {
    id,
    title: payload.title || null,
    fileUrl: payload.fileUrl || payload.url || null,
    hlsUrl: payload.hlsUrl || null,
    mimeType: payload.mimeType || null,
    fileSize: payload.fileSize || null,
    type: payload.type || null,
    source: "UPLOAD",
    scopeType: scopeType || null,
    scopeId: scopeId || null,
  };
};

const extractScopeParams = (mediaContext) =>
  mediaContext?.scopeType && mediaContext?.scopeId
    ? {
        scopeType: mediaContext.scopeType,
        scopeId: mediaContext.scopeId,
      }
    : {};

async function materializeDraftResource(resource, mediaContext, resolvedDrafts, createdResourceIds) {
  if (!resource) return null;
  if (!resource.__draftMedia) return resource;

  const draft = resource.__draftMedia;
  const draftId = draft.draftId;
  if (draftId && resolvedDrafts.has(draftId)) {
    return resolvedDrafts.get(draftId);
  }

  const scopedParams = Object.keys(extractScopeParams(mediaContext)).length > 0
    ? extractScopeParams(mediaContext)
    : (draft.scopedParams || {});

  let persisted;
  if (draft.kind === "file") {
    const uploaded = await uploadStandaloneResource(draft.file, scopedParams);
    persisted = normalizeUploadedResource(uploaded, scopedParams.scopeType, scopedParams.scopeId);
    if (draft.objectUrl) {
      URL.revokeObjectURL(draft.objectUrl);
    }
  } else {
    const created = await createStandaloneResource({
      ...(draft.payload || {}),
      ...scopedParams,
    });
    persisted = created;
  }

  if (persisted?.id != null) {
    createdResourceIds.push(persisted.id);
  }
  if (draftId) {
    resolvedDrafts.set(draftId, persisted);
  }
  return persisted;
}

async function materializeQuestionMedia(question, mediaContext, resolvedDrafts, createdResourceIds) {
  const nextQuestionResource = await materializeDraftResource(
    question.resource,
    mediaContext,
    resolvedDrafts,
    createdResourceIds
  );

  const nextAnswers = await Promise.all(
    (question.answers || []).map(async (answer) => {
      const nextResource = await materializeDraftResource(
        answer.resource,
        mediaContext,
        resolvedDrafts,
        createdResourceIds
      );
      return {
        ...answer,
        resource: nextResource,
        resourceId: nextResource?.id ?? null,
      };
    })
  );

  const nextItems = await Promise.all(
    (question.items || []).map(async (item) => {
      const nextResource = await materializeDraftResource(
        item.resource,
        mediaContext,
        resolvedDrafts,
        createdResourceIds
      );
      return {
        ...item,
        resource: nextResource,
        resourceId: nextResource?.id ?? null,
      };
    })
  );

  return {
    ...question,
    resource: nextQuestionResource,
    resourceId: nextQuestionResource?.id ?? null,
    answers: nextAnswers,
    items: nextItems,
  };
}

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
  tagIds: [],
  tagMatchMode: "ANY",
  selectionMode: "ALL_MATCHED",
  questionCount: null,
  difficultyLevel: null,
});

const getQuestionTypeOptions = (t) =>
  QUESTION_TYPE_VALUES.map((value) => ({
    value,
    label: t(`quizBuilder.types.${value}`),
  }));

const getDifficultyOptions = (t) =>
  DIFFICULTY_VALUES.map((value) => ({
    value,
    label: t(`quizBuilder.difficulties.${value}`),
  }));

const getSelectionModeOptions = (t) =>
  SELECTION_MODE_VALUES.map((value) => ({
    value,
    label: t(`quizEditor.selectionModes.${value}`),
  }));

const getTagMatchModeOptions = (t) =>
  TAG_MATCH_MODE_VALUES.map((value) => ({
    value,
    label: t(`quizEditor.tagMatchModes.${value}`),
  }));

const normalizeIdList = (ids = []) => [...new Set((ids || []).filter((id) => id != null))];

const groupBankSourcesForEditor = (sources = []) => {
  return (sources || []).map((source) => {
    const normalizedTagIds = normalizeIdList(
      source.tagIds || [],
    );
    return {
      localId: `bs-${uid()}`,
      id: source.id ?? null,
      questionBankId: source.questionBankId ?? null,
      tagIds: normalizedTagIds,
      tagMatchMode: source.tagMatchMode || "ANY",
      selectionMode: source.selectionMode === "RANDOM" ? "RANDOM" : "ALL_MATCHED",
      questionCount: source.questionCount ?? null,
      difficultyLevel: source.difficultyLevel ?? null,
    };
  });
};

const toBankSourcesPayload = (sources = []) =>
  (sources || [])
    .filter((source) => source.questionBankId)
    .map((source, idx) => ({
      id: source.id ?? null,
      questionBankId: source.questionBankId,
      tagIds: normalizeIdList(source.tagIds),
      tagMatchMode: source.tagMatchMode || "ANY",
      selectionMode: source.selectionMode,
      questionCount: source.selectionMode === "RANDOM" ? (source.questionCount ?? null) : null,
      difficultyLevel: source.difficultyLevel,
      orderIndex: idx + 1,
    }));

const getRuleMatchedQuestions = (source, bankDetailsMap) => {
  if (!source?.questionBankId) return [];

  const questions = bankDetailsMap[source.questionBankId]?.questions || [];
  const selectedTagIds = normalizeIdList(source.tagIds);
  const tagMatchMode = source.tagMatchMode || "ANY";

  return questions.filter((question) => {
    if (source.difficultyLevel && question.difficultyLevel !== source.difficultyLevel) {
      return false;
    }
    if (!selectedTagIds.length) {
      return true;
    }

    const questionTagIds = normalizeIdList((question.tags || []).map((tag) => tag?.id));
    return tagMatchMode === "ALL"
      ? selectedTagIds.every((tagId) => questionTagIds.includes(tagId))
      : selectedTagIds.some((tagId) => questionTagIds.includes(tagId));
  });
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
      resourceId: a.resource?.id ?? a.resourceId ?? null,
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
      resourceId: item.resource?.id ?? item.resourceId ?? null,
      resource: item.resource ?? null,
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
      resourceId: o.resource?.id ?? o.resourceId ?? null,
      resource: o.resource ?? null,
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
      resourceId: item.resource?.id ?? item.resourceId ?? null,
      resource: item.resource ?? null,
    })),
    clozeSyntax: "",
  };
  if (bq.type === "CLOZE") base.clozeSyntax = bq.content || "";
  return base;
};

const isImageResource = (resource) =>
  !!resource && (resource.type === "IMAGE" || resource.mimeType?.startsWith("image/"));

/* ─────────────────────────────────────────────
   Answer sub-components
───────────────────────────────────────────── */
function AnswerRow({
  answer,
  isSingle,
  onToggleCorrect,
  onChangeContent,
  onChangeExplanation,
  onChangeResource,
  onDelete,
  showDelete = true,
  mediaContext,
}) {
  const { t } = useTranslation();
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
          placeholder={t("quizBuilder.answerTextPlaceholder")}
        />
        {!showExp && (
          <button
            className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
            onClick={() => setShowExp(true)}
          >
            {answer.explanation ? t("quizBuilder.editExplanation") : t("quizBuilder.addExplanation")}
          </button>
        )}
        {showDelete && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1 rounded shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <span className="text-xs text-gray-500 shrink-0">{t("quizBuilder.correct")}</span>
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
              placeholder={t("quizBuilder.explanationPlaceholder")}
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
      {isImageResource(answer.resource) && (
        <div className="px-3 pb-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
            <ResourceRenderer resource={answer.resource} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function AddAnswerInput({ onAdd }) {
  const { t } = useTranslation();
  const [val, setVal] = useState("");
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(""); } };
  return (
    <div className="flex items-center gap-2 mt-2 border border-dashed border-gray-300 rounded-lg px-3 py-2">
      <Input
        className="flex-1 border-none shadow-none bg-transparent text-sm"
        placeholder={t("quizBuilder.addNewAnswer")}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onPressEnter={submit}
      />
      <button onClick={submit} className="text-blue-500 hover:text-blue-700 font-semibold text-sm">{t("quizBuilder.add")}</button>
    </div>
  );
}

function AnswerGridCard({
  answer,
  isSingle,
  mediaContext,
  onToggleCorrect,
  onChangeContent,
  onChangeExplanation,
  onChangeResource,
  onDelete,
  showDelete,
}) {
  const { t } = useTranslation();
  const [showExp, setShowExp] = useState(false);
  const [expVal, setExpVal] = useState(answer.explanation || "");
  useEffect(() => { setExpVal(answer.explanation || ""); }, [answer.explanation]);

  return (
    <div className={`rounded-xl border transition-colors flex flex-col overflow-hidden ${answer.isCorrect ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="cursor-grab text-gray-300 select-none text-sm">⋮⋮</span>
        <Input
          className="flex-1 border-none shadow-none bg-transparent text-sm"
          value={answer.content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder={t("quizBuilder.answerTextPlaceholder")}
        />
        <span className="text-xs text-gray-500 shrink-0">{t("quizBuilder.correct")}</span>
        {isSingle ? (
          <Radio checked={answer.isCorrect} onChange={onToggleCorrect} />
        ) : (
          <Checkbox checked={answer.isCorrect} onChange={onToggleCorrect} />
        )}
      </div>
      <div className="mx-3 mb-2">
        <MediaAttachButton
          allowedTypes={["IMAGE"]}
          resource={answer.resource}
          variant="answer-image-frame"
          previewImage
          mediaContext={mediaContext}
          deferUpload
          onChange={onChangeResource}
        />
      </div>
      {showExp && (
        <div className="px-3 pb-2 border-t border-gray-100">
          <div className="flex items-start gap-2 mt-2">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="text-sm"
              placeholder={t("quizBuilder.explanationPlaceholder")}
              value={expVal}
              onChange={(e) => setExpVal(e.target.value)}
              onBlur={() => { onChangeExplanation(expVal); if (!expVal) setShowExp(false); }}
              autoFocus
            />
            <button className="text-gray-400 hover:text-gray-600 mt-1 shrink-0" onClick={() => { setShowExp(false); setExpVal(answer.explanation || ""); }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
        {!showExp && (
          <button className="text-xs text-blue-500 hover:text-blue-700" onClick={() => setShowExp(true)}>
            {answer.explanation ? t("quizBuilder.editExplanation") : t("quizBuilder.addExplanation")}
          </button>
        )}
        {showDelete && (
          <button onClick={onDelete} className="ml-auto text-red-400 hover:text-red-600 p-1 rounded shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ChoiceAnswers({ question, onChange, mediaContext }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState(() =>
    question.answers?.some((answer) => isImageResource(answer.resource)) ? "image" : "text"
  );
  const isSingle = question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE";
  const { answers } = question;

  useEffect(() => {
    setViewMode(question.answers?.some((answer) => isImageResource(answer.resource)) ? "image" : "text");
  }, [question.localId, question.answers]);

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
  const switchMode = (nextMode) => {
    setViewMode(nextMode);
    if (nextMode === "text") {
      const hasAttachedImages = answers.some((answer) => !!(answer?.resourceId || answer?.resource));
      if (!hasAttachedImages) {
        return;
      }
      Modal.confirm({
        title: t("quizMedia.answerModeDetachTitle"),
        content: t("quizMedia.answerModeDetachMessage"),
        okText: t("quizMedia.detach"),
        cancelText: t("quizMedia.cancel"),
        okButtonProps: { danger: true },
        onOk: () => {
          onChange({
            answers: answers.map((answer) => ({
              ...answer,
              resourceId: null,
              resource: null,
            })),
          });
        },
        onCancel: () => setViewMode("image"),
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t("quizBuilder.answers")}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => switchMode("text")}
            className={`p-1.5 rounded transition-colors ${viewMode === "text" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
            title={t("quizMedia.answerModes.text")}
          >
            <List className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => switchMode("image")}
            className={`p-1.5 rounded transition-colors ${viewMode === "image" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
            title={t("quizMedia.answerModes.image")}
          >
            <ImageIcon className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      {viewMode === "image" ? (
        <div className="grid grid-cols-2 gap-3">
          {answers.map((a, idx) => (
            <AnswerGridCard
              key={a.localId}
              answer={a}
              isSingle={isSingle}
              mediaContext={mediaContext}
              onToggleCorrect={() => setCorrect(idx)}
              onChangeContent={(v) => update(idx, { content: v })}
              onChangeExplanation={(v) => update(idx, { explanation: v || null })}
              onChangeResource={(mediaPatch) => update(idx, mediaPatch)}
              onDelete={() => remove(idx)}
              showDelete={question.type !== "TRUE_FALSE"}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {answers.map((a, idx) => (
            <AnswerRow
              key={a.localId}
              answer={a}
              isSingle={isSingle}
              mediaContext={mediaContext}
              onToggleCorrect={() => setCorrect(idx)}
              onChangeContent={(v) => update(idx, { content: v })}
              onChangeExplanation={(v) => update(idx, { explanation: v || null })}
              onChangeResource={(mediaPatch) => update(idx, mediaPatch)}
              onDelete={() => remove(idx)}
              showDelete={question.type !== "TRUE_FALSE"}
            />
          ))}
        </div>
      )}
      {question.type !== "TRUE_FALSE" && <AddAnswerInput onAdd={addNew} />}
    </div>
  );
}

function MatchingPairs({ question, onChange, mediaContext }) {
  const { t } = useTranslation();
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
              <div className="text-xs text-gray-400 mb-1">{t("quizBuilder.question")}</div>
              {isImage ? (
                <div className="space-y-2">
                  {isImageResource(prompts[i]?.resource) ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <ResourceRenderer resource={prompts[i].resource} compact />
                    </div>
                  ) : null}
                  <div className="flex justify-center py-1">
                    <MediaAttachButton
                      allowedTypes={["IMAGE"]}
                      resource={prompts[i]?.resource}
                      variant="question-slot"
                      mediaContext={mediaContext}
                      deferUpload
                      onChange={(mediaPatch) => updatePrompt(prompts[i].localId, mediaPatch)}
                    />
                  </div>
                </div>
              ) : (
                <Input
                  value={prompts[i]?.content}
                  onChange={(e) => updatePrompt(prompts[i].localId, { content: e.target.value })}
                  placeholder={t("quizBuilder.enterQuestion")}
                  className="text-sm"
                />
              )}
            </div>
            <div className="border border-dashed border-gray-300 rounded-lg p-3 relative">
              <div className="text-xs text-gray-400 mb-1">{t("quizBuilder.answer")}</div>
              {isImage ? (
                <div className="space-y-2">
                  {isImageResource(matches[i]?.resource) ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <ResourceRenderer resource={matches[i].resource} compact />
                    </div>
                  ) : null}
                  <div className="flex justify-center py-1">
                    <MediaAttachButton
                      allowedTypes={["IMAGE"]}
                      resource={matches[i]?.resource}
                      variant="question-slot"
                      mediaContext={mediaContext}
                      deferUpload
                      onChange={(mediaPatch) => updateMatch(matches[i].localId, mediaPatch)}
                    />
                  </div>
                </div>
              ) : (
                <Input
                  value={matches[i]?.content}
                  onChange={(e) => updateMatch(matches[i].localId, { content: e.target.value })}
                  placeholder={t("quizBuilder.enterAnswer")}
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
        {t("quizBuilder.addNewAnswer")}
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
        <strong>Example:</strong> She was born in [[Paris]] and studied [[science|art|history]].
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

function AnswerSection({ question, onChange, mediaContext }) {
  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type))
    return <ChoiceAnswers question={question} onChange={onChange} mediaContext={mediaContext} />;
  if (question.type === "MATCHING" || question.type === "IMAGE_MATCHING")
    return <MatchingPairs question={question} onChange={onChange} mediaContext={mediaContext} />;
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
function MediaSquare({ resource, onChange, mediaContext }) {
  return (
    <div className="shrink-0">
      <MediaAttachButton
        resource={resource}
        allowedTypes={["IMAGE", "VIDEO", "AUDIO"]}
        variant="question-slot"
        previewImage
        mediaContext={mediaContext}
        deferUpload
        onChange={onChange}
      />
    </div>
  );
}

function QuestionCard({ question, index, mediaContext, onChange, onDelete, dragHandleProps }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const questionTypeOptions = getQuestionTypeOptions(t);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-3 py-3">
        {/* Left: media square */}
        <MediaSquare resource={question.resource} onChange={onChange} mediaContext={mediaContext} />

        {/* Center: content + sub-row */}
        <div className="flex-1 min-w-0">
          {!collapsed && (
            <>
              {question.type === "CLOZE" && (
                <div className="text-xs text-gray-500 mb-1">{t("quizBuilder.questionInstruction")}</div>
              )}
              <ReactQuill
                theme="snow"
                value={question.content}
                onChange={(v) => onChange({ content: v })}
                modules={QUILL_MODULES}
                placeholder={t("quizBuilder.enterQuestion")}
                className="quiz-quill"
              />
            </>
          )}
          {collapsed && (
            <div className="text-sm text-gray-500 italic py-1 truncate">
              {question.content?.replace(/<[^>]+>/g, "") || t("quizBuilder.enterQuestion")}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Select
              size="small"
              value={question.type}
              options={questionTypeOptions}
              showSearch
              optionFilterProp="label"
              onChange={(v) => {
                const fresh = makeQuestion(v);
                onChange({ type: v, answers: fresh.answers, items: fresh.items, clozeSyntax: "" });
              }}
              className="w-36"
              popupMatchSelectWidth={false}
            />
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{t("quizBuilder.points")}:</span>
              <InputNumber
                size="small"
                min={0}
                step={0.5}
                value={question.points}
                onChange={(v) => onChange({ points: v ?? 1 })}
                className="w-16"
              />
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <span className="cursor-grab text-gray-300 hover:text-gray-500 select-none p-1" {...dragHandleProps}>⋮⋮</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Answers */}
      {!collapsed && (
        <div className="px-3 pb-4 pt-1 border-t border-gray-100">
          <AnswerSection question={question} onChange={onChange} mediaContext={mediaContext} />
        </div>
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
function BankSourceRow({ source, banks, tagsMap, bankDetailsMap, onUpdate, onDelete, index }) {
  const { t } = useTranslation();
  const tags = tagsMap[source.questionBankId] || [];
  const difficultyOptions = getDifficultyOptions(t);
  const selectionModeOptions = getSelectionModeOptions(t);
  const tagMatchModeOptions = getTagMatchModeOptions(t);
  const matchingQuestions = getRuleMatchedQuestions(source, bankDetailsMap);
  const selectedTagIds = normalizeIdList(source.tagIds);
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const currentQuestionCount = source.selectionMode === "RANDOM"
    ? Math.min(source.questionCount || 0, matchingQuestions.length)
    : matchingQuestions.length;
  const summaryTone = source.selectionMode === "RANDOM" && (source.questionCount || 0) > matchingQuestions.length
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/90 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {t("quizEditor.bankRuleBadge")}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {t("quizEditor.ruleIndex", { index: index + 1 })}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {t("quizEditor.bankRuleHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title={t("quizEditor.removeRule")}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* Row 1: Bank & Tags */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("quizEditor.fields.bank")}
            </div>
            <Select
              placeholder={t("quizEditor.placeholders.selectBank")}
              value={source.questionBankId ?? undefined}
              options={banks.map((bank) => ({ value: bank.id, label: bank.name }))}
              onChange={(value) => onUpdate({ questionBankId: value, tagIds: [], tagMatchMode: "ANY" })}
              className="w-full"
              size="large"
              showSearch
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("quizEditor.fields.tags")}
            </div>
            <Select
              mode="multiple"
              placeholder={t("quizEditor.placeholders.allTags")}
              value={selectedTagIds}
              options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
              onChange={(value) => {
                const normalized = normalizeIdList(value);
                onUpdate({
                  tagIds: normalized,
                  tagMatchMode: normalized.length < 2 ? "ANY" : (source.tagMatchMode || "ANY"),
                });
              }}
              className="w-full"
              size="large"
              maxTagCount="responsive"
              disabled={!source.questionBankId}
              allowClear
              showSearch
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
            />
          </div>
        </div>

        {/* Row 2: Difficulty, Tag Condition, Selection Mode */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("quizEditor.fields.difficulty")}
            </div>
            <Select
              value={source.difficultyLevel ?? undefined}
              placeholder={t("quizEditor.placeholders.anyDifficulty")}
              options={difficultyOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => onUpdate({ difficultyLevel: value ?? null })}
              className="w-full"
              size="large"
              allowClear
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("quizEditor.fields.tagCondition")}
            </div>
            <Select
              value={source.tagMatchMode || "ANY"}
              options={tagMatchModeOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => onUpdate({ tagMatchMode: value })}
              className="w-full"
              size="large"
              disabled={selectedTagIds.length < 2}
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t("quizEditor.fields.mode")}
            </div>
            <Select
              value={source.selectionMode}
              options={selectionModeOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => onUpdate({
                selectionMode: value,
                questionCount: value === "RANDOM" ? source.questionCount : null,
              })}
              className="w-full"
              size="large"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {source.selectionMode === "RANDOM" && (
            <div className="w-full max-w-[220px]">
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("quizEditor.fields.count")}
              </div>
              <InputNumber
                min={1}
                value={source.questionCount}
                onChange={(value) => onUpdate({ questionCount: value ?? null })}
                className="w-full"
                size="large"
                placeholder={t("quizEditor.placeholders.randomCount")}
              />
            </div>
          )}

          <div className={`min-w-[220px] rounded-xl border px-4 py-3 ${summaryTone}`}>
            <div className="text-xs font-semibold uppercase tracking-wide">
              {t("quizEditor.matchSummary")}
            </div>
            <div className="mt-1 text-2xl font-semibold leading-none">
              {currentQuestionCount}
            </div>
            <div className="mt-1 text-xs">
              {source.selectionMode === "RANDOM"
                ? t("quizEditor.matchSummaryRandom", {
                    eligible: matchingQuestions.length,
                    count: source.questionCount || 0,
                  })
                : t("quizEditor.matchSummaryAll", { count: matchingQuestions.length })}
            </div>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-1 flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Tag key={tag.id} className="m-0 rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                  {tag.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LibraryDrawer
───────────────────────────────────────────── */
function LibraryDrawer({ open, onClose, onAddQuestions }) {
  const { t } = useTranslation();
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
      .catch(() => message.error(t("quizEditor.messages.loadBanksFailed")))
      .finally(() => setLoadingBanks(false));
  }, [open, t]);

  useEffect(() => {
    if (!selectedBankId) { setBankQuestions([]); return; }
    setLoadingQs(true);
    setSelected(new Set());
    getQuestionBankById(selectedBankId)
      .then((data) => {
        setBankQuestions(data?.questions || data?.content || []);
      })
      .catch(() => message.error(t("quizEditor.messages.loadBankQuestionsFailed")))
      .finally(() => setLoadingQs(false));
  }, [selectedBankId, t]);

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
          {t("quizEditor.libraryTitle")}
        </span>
      }
      placement="right"
      width={440}
      open={open}
      onClose={onClose}
      footer={
        selected.size > 0 ? (
          <Button type="primary" block size="large" onClick={handleAdd}>
            {t("quizEditor.messages.questionsAddedAction", { count: selected.size })}
          </Button>
        ) : null
      }
    >
      <div className="space-y-3">
        <Input
          prefix={<svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
          placeholder={t("quizEditor.placeholders.searchQuestions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          placeholder={t("quizEditor.placeholders.selectBank")}
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
              <span className="text-xs text-gray-500">{t("quizEditor.libraryQuestionCount", { count: filtered.length })}</span>
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
                      {t(`quizBuilder.types.${q.type}`, { defaultValue: q.type })}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : selectedBankId ? (
          <div className="text-center text-gray-400 py-8 text-sm">{t("quizEditor.emptyLibrary")}</div>
        ) : (
          <div className="text-center text-gray-400 py-8 text-sm">{t("quizEditor.pickBankToBrowse")}</div>
        )}
      </div>
    </Drawer>
  );
}

/* ─────────────────────────────────────────────
   SettingsPanel
───────────────────────────────────────────── */
function SettingsPanel({ settings, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("quizEditor.settings.descriptionLabel")}</label>
        <Input.TextArea
          rows={4}
          placeholder={t("quizEditor.settings.descriptionPlaceholder")}
          value={settings.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("quizEditor.settings.durationLabel")}</label>
          <InputNumber
            min={0}
            placeholder={t("quizEditor.settings.durationPlaceholder")}
            value={settings.timeLimitMinutes}
            onChange={(v) => onChange({ timeLimitMinutes: v || null })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("quizEditor.settings.attemptsLabel")}</label>
          <InputNumber
            min={1}
            value={settings.maxAttempts}
            onChange={(v) => onChange({ maxAttempts: v || 1 })}
            className="w-full"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("quizEditor.settings.displayModeLabel")}</label>
        <Select
          value={settings.displayMode}
          onChange={(v) => onChange({ displayMode: v })}
          className="w-72"
          showSearch
          optionFilterProp="label"
          options={[
            { value: "PAGINATION", label: t("quizEditor.displayModes.PAGINATION") },
            { value: "ONE_PAGE", label: t("quizEditor.displayModes.ONE_PAGE") },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-8">
        <div className="flex items-center gap-3">
          <Switch checked={settings.shuffleQuestions} onChange={(v) => onChange({ shuffleQuestions: v })} />
          <span className="text-sm text-gray-700">{t("quizEditor.settings.shuffleQuestions")}</span>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={settings.showCorrectAnswer} onChange={(v) => onChange({ showCorrectAnswer: v })} />
          <span className="text-sm text-gray-700">{t("quizEditor.settings.showCorrectAnswer")}</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("quizEditor.settings.passingGradeLabel")}</label>
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
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAdmin = location.pathname.startsWith("/admin");
  const isTemplateMode = !!templateId;
  const isEditMode = !!quizId;
  const chapterIdFromState = location.state?.chapterId || chapterId;
  const initialClassContentItemId = location.state?.classContentItemId || null;

  const [course, setCourse] = useState(null);
  const [title, setTitle] = useState(t("quizEditor.defaults.newQuizTitle"));
  const [questions, setQuestions] = useState([]);
  const [bankSources, setBankSources] = useState([]);
  const [questionSourceMode, setQuestionSourceMode] = useState("MANUAL");
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
  const [bankDetailsMap, setBankDetailsMap] = useState({});
  const [classContentItemId, setClassContentItemId] = useState(initialClassContentItemId);
  const questionTypeOptions = getQuestionTypeOptions(t);

  const sensors = useSensors(useSensor(PointerSensor));
  const quizMediaContext = useMemo(() => {
    if (!classSectionId || isTemplateMode) return null;
    return {
      scopeType: "CLASS_SECTION",
      scopeId: Number(classSectionId),
    };
  }, [classSectionId, isTemplateMode]);
  const activeChapter = useMemo(
    () =>
      (course?.chapters || []).find(
        (chapterItem) => Number(chapterItem?.id) === Number(chapterIdFromState)
      ) || null,
    [course, chapterIdFromState]
  );

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadContext = async () => {
      try {
        if (isTemplateMode && templateId) {
          const templateResponse = await getTemplateById(templateId);
          setCourse(templateResponse?.data ?? templateResponse);
          return;
        }
        if (classSectionId) {
          const classSectionResponse = await getCourseById(classSectionId);
          setCourse(classSectionResponse?.data ?? classSectionResponse);
          return;
        }
        setCourse(null);
      } catch (error) {
        console.error("Failed to load quiz context", error);
        setCourse(null);
      }
    };

    loadContext();
  }, [classSectionId, isTemplateMode, templateId]);

  // load quiz in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setLoading(true);
    const loader = isTemplateMode ? () => getQuizTemplateById(quizId) : () => getQuizById(quizId);
    loader()
      .then((quizResponse) => {
        const quiz = quizResponse?.data ?? quizResponse;
        setTitle(quiz?.title || t("quizEditor.defaults.untitledQuiz"));
        setClassContentItemId(quiz?.classContentItemId ?? initialClassContentItemId);
        setSettings({
          description: quiz?.description || "",
          timeLimitMinutes: quiz?.timeLimitMinutes || null,
          displayMode: quiz?.displayMode || "PAGINATION",
          shuffleQuestions: !!quiz?.shuffleQuestions,
          shuffleAnswers: !!quiz?.shuffleAnswers,
          showCorrectAnswer: !!quiz?.showCorrectAnswer,
          maxAttempts: quiz?.maxAttempts || 1,
          minPassScore: quiz?.minPassScore || 80,
        });
        setQuestions((quiz?.questions || []).map(transformApiQuestion));
        const loadedBankSources = groupBankSourcesForEditor(quiz?.bankSources || []);
        setBankSources(loadedBankSources);
        setQuestionSourceMode(loadedBankSources.length > 0 ? "BANK_RULE" : "MANUAL");
      })
      .catch(() => message.error(t("quizEditor.messages.loadQuizFailed")))
      .finally(() => setLoading(false));
  }, [quizId, isEditMode, isTemplateMode, initialClassContentItemId, t]);

  // load banks list for BankSourceRow
  useEffect(() => {
    getQuestionBanks()
      .then((data) => setBanks(Array.isArray(data) ? data : data?.content || []))
      .catch(() => {});
  }, []);

  // load tags and full bank questions when bankSources reference new banks
  useEffect(() => {
    const bankIds = [...new Set(bankSources.map((s) => s.questionBankId).filter(Boolean))];
    bankIds.forEach((bankId) => {
      if (!tagsMap[bankId]) {
        getTags(bankId)
          .then((data) => setTagsMap((prev) => ({ ...prev, [bankId]: Array.isArray(data) ? data : data?.content || [] })))
          .catch(() => {});
      }
      if (!bankDetailsMap[bankId]) {
        getQuestionBankById(bankId)
          .then((data) => setBankDetailsMap((prev) => ({ ...prev, [bankId]: data })))
          .catch(() => {});
      }
    });
  }, [bankSources, tagsMap, bankDetailsMap]);

  // question handlers
  const updateQuestion = useCallback((localId, patch) => {
    setQuestions((prev) => prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));
  }, []);
  const deleteQuestion = useCallback((localId) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  }, []);
  const addQuestion = (type) => {
    if (questionSourceMode !== "MANUAL") {
      message.warning("Vui lòng chuyển về chế độ tạo thủ công để thêm câu hỏi.");
      return;
    }
    setQuestions((prev) => [...prev, makeQuestion(type)]);
  };

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
  const addBankSource = () => {
    if (questionSourceMode !== "BANK_RULE") {
      message.warning("Vui lòng chuyển sang chế độ Question Bank Rule trước.");
      return;
    }
    setBankSources((prev) => [...prev, makeBankSource()]);
  };
  const updateBankSource = (localId, patch) =>
    setBankSources((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  const deleteBankSource = (localId) =>
    setBankSources((prev) => prev.filter((s) => s.localId !== localId));

  const handleSourceModeChange = (nextMode) => {
    if (nextMode === questionSourceMode) return;
    if (nextMode === "MANUAL") {
      if (bankSources.length > 0) {
        setBankSources([]);
        message.info("Đã xóa các question bank rule để chuyển sang tạo thủ công.");
      }
      setQuestionSourceMode("MANUAL");
      return;
    }
    if (questions.length > 0) {
      setQuestions([]);
      message.info("Đã xóa danh sách câu hỏi thủ công để chuyển sang question bank rule.");
    }
    setQuestionSourceMode("BANK_RULE");
  };

  // save
  const handleSave = async (previewAfter = false) => {
    if (!title.trim()) { message.warning(t("quizEditor.messages.titleRequired")); return; }
    setSaving(true);
    const createdResourceIds = [];
    try {
      const resolvedDrafts = new Map();
      const persistedQuestions = await Promise.all(
        questions.map((question) => materializeQuestionMedia(
          question,
          quizMediaContext,
          resolvedDrafts,
          createdResourceIds
        ))
      );

      const processedQuestions = persistedQuestions.map((q) => {
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

      const isBankRuleMode = questionSourceMode === "BANK_RULE";
      const processedBankSources = isBankRuleMode ? toBankSourcesPayload(bankSources) : [];
      if (isBankRuleMode && processedBankSources.length === 0) {
        message.warning("Vui lòng thêm ít nhất một rule question bank.");
        setSaving(false);
        return;
      }

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
        generateQuestionsPerAttempt: isBankRuleMode,
        questions: isBankRuleMode ? [] : processedQuestions,
        bankSources: isBankRuleMode ? processedBankSources : [],
        ...(isTemplateMode ? {} : {
          classSectionId: classSectionId ? Number(classSectionId) : null,
          classContentItemId: classContentItemId ? Number(classContentItemId) : null,
        }),
      };

      let savedQuiz;
      if (isEditMode) {
        if (isTemplateMode) {
          savedQuiz = await updateQuizTemplate(quizId, payload);
        } else {
          savedQuiz = await updateQuiz(quizId, payload);
        }
        setQuestions(persistedQuestions);
        message.success(t("quizEditor.messages.quizSaved"));
        if (previewAfter) {
          const basePath = isAdmin ? "/admin" : "/teacher";
          const previewUrl = isTemplateMode
            ? `${basePath}/curriculums/${templateId}/quizzes/${quizId}/preview`
            : `${basePath}/class-sections/${classSectionId}/quizzes/${quizId}/preview`;
          navigate(previewUrl);
          return;
        }
      } else {
        let savedQuizId;
        if (isTemplateMode) {
          savedQuiz = await createQuizTemplate(payload);
          savedQuizId = (savedQuiz?.data ?? savedQuiz)?.id;
          if (templateId && chapterIdFromState) {
            await createContentItemTemplate(templateId, chapterIdFromState, {
              title: title.trim(),
              itemType: "QUIZ",
              quizTemplateId: savedQuizId,
            });
          }
        } else {
          savedQuiz = await createQuiz(payload);
          savedQuizId = (savedQuiz?.data ?? savedQuiz)?.id;
          if (classSectionId && chapterIdFromState) {
            const createdContentItem = await createClassContentItem(classSectionId, chapterIdFromState, {
              title: title.trim(),
              itemType: "QUIZ",
              quizId: savedQuizId,
            });
            setClassContentItemId(createdContentItem?.id ?? null);
          }
        }
        setQuestions(persistedQuestions);
        message.success(t("quizEditor.messages.quizCreated"));
        const basePath = isAdmin ? "/admin" : "/teacher";
        if (previewAfter && savedQuizId) {
          const previewUrl = isTemplateMode
            ? `${basePath}/curriculums/${templateId}/quizzes/${savedQuizId}/preview`
            : `${basePath}/class-sections/${classSectionId}/quizzes/${savedQuizId}/preview`;
          navigate(previewUrl);
          return;
        }
        navigate(
          isTemplateMode
            ? `${basePath}/curriculums/${templateId}`
            : classSectionId
            ? `${basePath}/class-sections/${classSectionId}`
            : `${basePath}/quizzes/${savedQuizId}`
        );
      }
    } catch (err) {
      if (createdResourceIds.length > 0) {
        await Promise.allSettled(
          [...new Set(createdResourceIds)].map((resourceId) => deleteResource(resourceId))
        );
      }
      message.error(t("quizEditor.messages.saveQuizFailed"));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFromLibrary = (newQuestions) => {
    if (questionSourceMode !== "MANUAL") {
      message.warning("Chỉ có thể thêm từ Questions Library khi ở chế độ tạo thủ công.");
      return;
    }
    setQuestions((prev) => [...prev, ...newQuestions]);
    message.success(t("quizEditor.messages.questionsAdded", { count: newQuestions.length }));
  };

  const addQuestionMenuItems = questionTypeOptions.map((option) => ({
    key: option.value,
    label: option.label,
    onClick: () => addQuestion(option.value),
  }));

  const Sidebar = isAdmin ? AdminSidebar : TeacherSidebar;

  if (loading) {
    return (
      <div className="quiz-detail-page flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="quiz-detail-page flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TeacherHeader />

        {/* Top bar */}
        <div className={`bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0 mt-16 transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}>
          <div className="px-6 pt-4">
            <AppBreadcrumb
              className="mb-3"
              context={{
                classTitle: course?.title,
                templateName: course?.name,
                quizTitle: title || quiz?.title,
                chapterTitle: activeChapter?.title,
              }}
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full shrink-0">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {t("quizEditor.quizBadge")}
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-base font-semibold border-none shadow-none bg-transparent"
              placeholder={t("quizEditor.placeholders.quizTitle")}
            />

            <Button
              icon={<EyeIcon className="w-4 h-4" />}
              onClick={() => handleSave(true)}
              loading={saving}
              className="flex items-center gap-1.5 border-amber-400 text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30 shrink-0"
            >
              {t("quizEditor.actions.preview")}
            </Button>
            <Button type="primary" onClick={handleSave} loading={saving} className="bg-blue-600 hover:bg-blue-700 border-0 px-6 shrink-0">
              {t("quizEditor.actions.save")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex items-center px-6 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-64"
        }`}>
          {[
            {
              key: "questions",
              label: questions.length > 0
                ? t("quizEditor.tabs.questionsWithCount", { count: questions.length })
                : t("quizEditor.tabs.questions"),
            },
            { key: "settings", label: t("quizEditor.tabs.settings") },
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
            disabled={questionSourceMode !== "MANUAL"}
            className="ml-auto flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-300 hover:bg-blue-50 px-4 py-1.5 rounded-lg transition-colors mb-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {t("quizEditor.actions.openLibrary")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "questions" && (
            <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Nguồn câu hỏi</div>
                <Radio.Group
                  value={questionSourceMode}
                  onChange={(event) => handleSourceModeChange(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { value: "MANUAL", label: "Tạo thủ công" },
                    { value: "BANK_RULE", label: "Question Bank Rule" },
                  ]}
                />
              </div>

              {questionSourceMode === "MANUAL" && questions.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                  <SortableContext items={questions.map((q) => q.localId)} strategy={verticalListSortingStrategy}>
                    {questions.map((q, idx) => (
                      <SortableQuestionCard
                        key={q.localId}
                        question={q}
                        index={idx}
                        mediaContext={quizMediaContext}
                        onChange={(patch) => updateQuestion(q.localId, patch)}
                        onDelete={() => deleteQuestion(q.localId)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {questionSourceMode === "BANK_RULE" && bankSources.map((src) => (
                <BankSourceRow
                  key={src.localId}
                  source={src}
                  banks={banks}
                  tagsMap={tagsMap}
                  bankDetailsMap={bankDetailsMap}
                  onUpdate={(patch) => updateBankSource(src.localId, patch)}
                  onDelete={() => deleteBankSource(src.localId)}
                  index={bankSources.findIndex((item) => item.localId === src.localId)}
                />
              ))}

              {questionSourceMode === "MANUAL" && questions.length === 0 && (
                <div className="border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500 mb-4 bg-white dark:bg-slate-900 shadow-sm shadow-slate-200/50 dark:shadow-none">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-base font-semibold text-slate-700">{t("quizEditor.emptyStateTitle")}</p>
                  <p className="mt-2 text-sm text-slate-500">{t("quizEditor.emptyStateDescription")}</p>
                </div>
              )}

              {questionSourceMode === "BANK_RULE" && bankSources.length === 0 && (
                <div className="border border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500 mb-4 bg-white dark:bg-slate-900 shadow-sm shadow-slate-200/50 dark:shadow-none">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-base font-semibold text-slate-700">Chưa có question bank rule</p>
                  <p className="mt-2 text-sm text-slate-500">Thêm ít nhất một rule để sinh đề khác nhau cho từng lượt làm.</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 mt-4">
                <Dropdown menu={{ items: addQuestionMenuItems }} trigger={["click"]} disabled={questionSourceMode !== "MANUAL"}>
                  <Button type="primary" className="rounded-full px-5 bg-blue-600 hover:bg-blue-700 border-0 dark:bg-blue-600 dark:hover:bg-blue-500">
                    {t("quizEditor.actions.addQuestion")} ▾
                  </Button>
                </Dropdown>
                <Button
                  onClick={addBankSource}
                  disabled={questionSourceMode !== "BANK_RULE"}
                  className="rounded-full px-5 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  {t("quizEditor.actions.addQuestionBank")}
                </Button>
              </div>

              {((questionSourceMode === "MANUAL" && questions.length > 0)
                || (questionSourceMode === "BANK_RULE" && bankSources.length > 0)) && (
                <div className="flex justify-end mt-6">
                <Button type="primary" onClick={handleSave} loading={saving} size="large" className="bg-blue-600 hover:bg-blue-700 border-0 px-8 dark:bg-blue-600 dark:hover:bg-blue-500">
                  {t("quizEditor.actions.save")}
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
