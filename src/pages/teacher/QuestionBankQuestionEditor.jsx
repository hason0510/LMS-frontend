import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Checkbox,
  Input,
  Modal,
  Radio,
  Select,
  Spin,
} from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Image as ImageIcon, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import MediaAttachButton from "../../components/media/MediaAttachButton";
import ResourceRenderer from "../../components/media/ResourceRenderer";
import { isImageResource } from "../../utils/fileUtils";
import {
  createQuestion,
  getQuestionBankById,
  getTags,
  updateQuestion as updateBankQuestion,
} from "../../api/questionBank";
import {
  createStandaloneResource,
  deleteResource,
  uploadStandaloneResource,
} from "../../api/resource";
import { parseClozeToItems } from "../../utils/cloze";
import { escapeHtml } from "../../utils/sanitizeHtml";
import { buildQuillModules, createQuillTableControl } from "../../utils/quillTable";

const QUESTION_TYPE_VALUES = [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MATCHING",
  "IMAGE_MATCHING",
  "IMAGE_ANSWERING",
  "SHORT_ANSWER",
  "CLOZE",
  "DRAG_ORDER",
  "ESSAY",
];

const DIFFICULTY_VALUES = ["EASY", "MEDIUM", "HARD"];

const QUILL_MODULES = buildQuillModules([
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  [createQuillTableControl()],
  ["link", "image", "code-block"],
  ["clean"],
]);

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createAnswer = (content = "", isCorrect = false) => ({
  localId: `a-${uid()}`,
  id: null,
  content,
  isCorrect,
  explanation: null,
  resourceId: null,
  resource: null,
});

const createItem = (role, content = "", extra = {}) => ({
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
  resource: null,
  ...extra,
});

const createQuestionDraft = (type = "SINGLE_CHOICE") => {
  const question = {
    localId: `q-${uid()}`,
    id: null,
    content: "",
    type,
    resourceId: null,
    resource: null,
    answers: [],
    items: [],
    clozeSyntax: "",
  };
  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "IMAGE_ANSWERING"].includes(type)) {
    question.answers = [createAnswer("", true), createAnswer("", false)];
  } else if (type === "TRUE_FALSE") {
    question.answers = [createAnswer("True", true), createAnswer("False", false)];
  } else if (type === "MATCHING" || type === "IMAGE_MATCHING") {
    const matchKey = `k${uid()}`;
    question.items = [
      createItem("PROMPT", "", { correctMatchKey: matchKey }),
      createItem("MATCH", "", { itemKey: matchKey }),
    ];
  } else if (type === "DRAG_ORDER") {
    question.items = [createItem("ORDER_ITEM", ""), createItem("ORDER_ITEM", "")];
  } else if (type === "SHORT_ANSWER") {
    question.answers = [createAnswer("", true)];
  }
  return question;
};

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

const normalizeTagName = (value = "") => value.trim().toLowerCase();

const mergeTagNames = (...lists) => {
  const merged = new Set();
  lists.flat().forEach((value) => {
    if (typeof value !== "string") return;
    const normalized = normalizeTagName(value);
    if (normalized) merged.add(normalized);
  });
  return [...merged];
};

const buildTagOptions = (tagNames = []) =>
  mergeTagNames(tagNames).map((name) => ({ value: name, label: name }));

const isSingleSelectType = (questionType) =>
  ["SINGLE_CHOICE", "TRUE_FALSE", "IMAGE_ANSWERING"].includes(questionType);

const isInteractionType = (questionType) =>
  ["MATCHING", "IMAGE_MATCHING", "DRAG_ORDER", "CLOZE"].includes(questionType);

const transformBankQuestion = (question) => {
  const base = {
    localId: `q-${uid()}`,
    id: question.id,
    content: question.content || "",
    type: question.type,
    resourceId: question.resource?.id ?? null,
    resource: question.resource ?? null,
    answers: (question.options || []).map((option) => ({
      localId: `a-${uid()}`,
      id: option.id ?? null,
      content: option.content || "",
      isCorrect: !!option.isCorrect,
      explanation: option.explanation ?? null,
      resourceId: option.resource?.id ?? option.resourceId ?? null,
      resource: option.resource ?? null,
    })),
    items: (question.items || []).map((item) => ({
      localId: `item-${uid()}`,
      id: item.id ?? null,
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
  if (question.type === "CLOZE") {
    base.clozeSyntax = question.content || "";
  }
  return base;
};

const normalizeUploadedResource = (response, scopeType, scopeId) => {
  const payload = response ?? {};
  const id = payload.resourceId ?? payload.id ?? null;
  return {
    id,
    title: payload.title || null,
    fileUrl: payload.fileUrl || payload.url || null,
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
    ? { scopeType: mediaContext.scopeType, scopeId: mediaContext.scopeId }
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
    persisted = await createStandaloneResource({
      ...(draft.payload || {}),
      ...scopedParams,
    });
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

function AnswerRow({
  answer,
  isSingle,
  mediaContext,
  onToggleCorrect,
  onChangeContent,
  onChangeExplanation,
  onChangeResource,
  onDelete,
  showDelete = true,
}) {
  const { t } = useTranslation();
  const [showExp, setShowExp] = useState(false);
  const [expVal, setExpVal] = useState(answer.explanation || "");

  useEffect(() => {
    setExpVal(answer.explanation || "");
  }, [answer.explanation]);

  const handleSaveExplanation = () => {
    onChangeExplanation(expVal.trim() || null);
    setShowExp(false);
  };

  const handleCancelExplanation = () => {
    setExpVal(answer.explanation || "");
    setShowExp(false);
  };

  return (
    <div className={`rounded-lg border transition-colors ${answer.isCorrect ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          className="flex-1 border-none shadow-none bg-transparent text-sm"
          value={answer.content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder={t("quizBuilder.answerTextPlaceholder")}
        />
        {!showExp && (
          <button
            type="button"
            className="whitespace-nowrap text-xs text-blue-500 hover:text-blue-700"
            onClick={() => setShowExp(true)}
          >
            {answer.explanation ? t("quizBuilder.editExplanation") : t("quizBuilder.addExplanation")}
          </button>
        )}
        {showDelete && (
          <button type="button" onClick={onDelete} className="rounded p-1 text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{t("quizBuilder.correct")}</span>
        {isSingle ? (
          <Radio checked={answer.isCorrect} onChange={onToggleCorrect} />
        ) : (
          <Checkbox checked={answer.isCorrect} onChange={onToggleCorrect} />
        )}
      </div>
      {showExp && (
        <div className="border-t border-gray-100 px-3 pb-2 dark:border-slate-700">
          <div className="mt-2 flex items-start gap-2">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="text-sm"
              placeholder={t("quizBuilder.explanationPlaceholder")}
              value={expVal}
              onChange={(e) => setExpVal(e.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleSaveExplanation();
                }
              }}
              autoFocus
            />
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleSaveExplanation}
                title={t("common.luu", "Luu")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={handleCancelExplanation}
                title={t("common.huy", "Huy")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {isImageResource(answer.resource) && (
        <div className="max-w-xs px-3 pb-3">
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
      )}
    </div>
  );
}

function AddAnswerInput({ onAdd }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const text = value.trim();
    if (!text) return;
    onAdd(text);
    setValue("");
  };

  return (
    <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 dark:border-slate-700">
      <Input
        className="flex-1 border-none bg-transparent text-sm shadow-none"
        placeholder={t("quizBuilder.addNewAnswer")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={handleSubmit}
      />
      <button type="button" onClick={handleSubmit} className="text-sm font-semibold text-blue-500 hover:text-blue-700">
        {t("quizBuilder.add")}
      </button>
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

  useEffect(() => {
    setExpVal(answer.explanation || "");
  }, [answer.explanation]);

  const handleSaveExplanation = () => {
    onChangeExplanation(expVal.trim() || null);
    setShowExp(false);
  };

  const handleCancelExplanation = () => {
    setExpVal(answer.explanation || "");
    setShowExp(false);
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border transition-colors ${answer.isCorrect ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          className="flex-1 border-none bg-transparent text-sm shadow-none"
          value={answer.content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder={t("quizBuilder.answerTextPlaceholder")}
        />
        <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{t("quizBuilder.correct")}</span>
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
        <div className="border-t border-gray-100 px-3 pb-2 dark:border-slate-700">
          <div className="mt-2 flex items-start gap-2">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="text-sm"
              placeholder={t("quizBuilder.explanationPlaceholder")}
              value={expVal}
              onChange={(e) => setExpVal(e.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleSaveExplanation();
                }
              }}
              autoFocus
            />
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={handleSaveExplanation}
                title={t("common.luu", "Luu")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={handleCancelExplanation}
                title={t("common.huy", "Huy")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-gray-100 px-3 py-2 dark:border-slate-700">
        {!showExp && (
          <button type="button" className="text-xs text-blue-500 hover:text-blue-700" onClick={() => setShowExp(true)}>
            {answer.explanation ? t("quizBuilder.editExplanation") : t("quizBuilder.addExplanation")}
          </button>
        )}
        {showDelete && (
          <button type="button" onClick={onDelete} className="ml-auto rounded p-1 text-red-400 hover:text-red-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function ChoiceAnswers({ question, onChange, mediaContext }) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const [viewMode, setViewMode] = useState(() =>
    question.answers?.some((answer) => isImageResource(answer.resource)) || question.type === "IMAGE_ANSWERING"
      ? "image"
      : "text"
  );
  const isSingle = isSingleSelectType(question.type);
  const { answers } = question;

  useEffect(() => {
    setViewMode(
      question.answers?.some((answer) => isImageResource(answer.resource)) || question.type === "IMAGE_ANSWERING"
        ? "image"
        : "text"
    );
  }, [question.answers, question.localId, question.type]);

  const update = (idx, patch) =>
    onChange({ answers: answers.map((answer, index) => (index === idx ? { ...answer, ...patch } : answer)) });
  const remove = (idx) => onChange({ answers: answers.filter((_, index) => index !== idx) });
  const addNew = (content) => onChange({ answers: [...answers, createAnswer(content)] });
  const setCorrect = (idx) => {
    if (isSingle) {
      onChange({ answers: answers.map((answer, index) => ({ ...answer, isCorrect: index === idx })) });
      return;
    }
    onChange({
      answers: answers.map((answer, index) =>
        index === idx ? { ...answer, isCorrect: !answer.isCorrect } : answer
      ),
    });
  };
  const switchMode = (nextMode) => {
    setViewMode(nextMode);
    if (nextMode === "text") {
      const hasAttachedImages = answers.some((answer) => !!(answer?.resourceId || answer?.resource));
      if (!hasAttachedImages) return;
      modal.confirm({
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
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {t("quizBuilder.answers")}
        </div>
        {question.type !== "TRUE_FALSE" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => switchMode("text")}
              className={`rounded p-1.5 transition-colors ${viewMode === "text" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              title={t("quizMedia.answerModes.text")}
            >
              <List className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => switchMode("image")}
              className={`rounded p-1.5 transition-colors ${viewMode === "image" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              title={t("quizMedia.answerModes.image")}
            >
              <ImageIcon className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
      {viewMode === "image" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {answers.map((answer, idx) => (
            <AnswerGridCard
              key={answer.localId}
              answer={answer}
              isSingle={isSingle}
              mediaContext={mediaContext}
              onToggleCorrect={() => setCorrect(idx)}
              onChangeContent={(value) => update(idx, { content: value })}
              onChangeExplanation={(value) => update(idx, { explanation: value || null })}
              onChangeResource={(mediaPatch) => update(idx, mediaPatch)}
              onDelete={() => remove(idx)}
              showDelete={question.type !== "TRUE_FALSE"}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {answers.map((answer, idx) => (
            <AnswerRow
              key={answer.localId}
              answer={answer}
              isSingle={isSingle}
              mediaContext={mediaContext}
              onToggleCorrect={() => setCorrect(idx)}
              onChangeContent={(value) => update(idx, { content: value })}
              onChangeExplanation={(value) => update(idx, { explanation: value || null })}
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
  const prompts = items.filter((item) => item.role === "PROMPT");
  const matches = items.filter((item) => item.role === "MATCH");
  const pairCount = Math.min(prompts.length, matches.length);

  const updatePrompt = (promptLocalId, patch) =>
    onChange({ items: items.map((item) => (item.localId === promptLocalId ? { ...item, ...patch } : item)) });
  const updateMatch = (matchLocalId, patch) =>
    onChange({ items: items.map((item) => (item.localId === matchLocalId ? { ...item, ...patch } : item)) });
  const removePair = (matchKey) =>
    onChange({
      items: items.filter(
        (item) => !(item.role === "PROMPT" && item.correctMatchKey === matchKey)
          && !(item.role === "MATCH" && item.itemKey === matchKey)
      ),
    });
  const addPair = () => {
    const matchKey = `k${uid()}`;
    onChange({
      items: [
        ...items,
        createItem("PROMPT", "", { correctMatchKey: matchKey }),
        createItem("MATCH", "", { itemKey: matchKey }),
      ],
    });
  };

  return (
    <div>
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {t("quizBuilder.answers")}
      </div>
      <div className="space-y-3">
        {Array.from({ length: pairCount }, (_, index) => (
          <div key={prompts[index]?.localId} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-dashed border-gray-300 p-3 dark:border-slate-700">
              <div className="mb-1 text-xs text-gray-400">{t("quizBuilder.question")}</div>
              {isImage ? (
                <div className="space-y-2 py-1">
                  <MediaAttachButton
                    allowedTypes={["IMAGE"]}
                    resource={prompts[index]?.resource}
                    variant="answer-image-frame"
                    previewImage
                    mediaContext={mediaContext}
                    deferUpload
                    onChange={(mediaPatch) => updatePrompt(prompts[index].localId, mediaPatch)}
                  />
                  <Input
                    value={prompts[index]?.content}
                    onChange={(e) => updatePrompt(prompts[index].localId, { content: e.target.value })}
                    placeholder={t("questionBankEditor.imageCaptionPlaceholder")}
                    className="text-sm"
                  />
                </div>
              ) : (
                <Input
                  value={prompts[index]?.content}
                  onChange={(e) => updatePrompt(prompts[index].localId, { content: e.target.value })}
                  placeholder={t("quizBuilder.enterQuestion")}
                  className="text-sm"
                />
              )}
            </div>
            <div className="relative rounded-lg border border-dashed border-gray-300 p-3 dark:border-slate-700">
              <div className="mb-1 text-xs text-gray-400">{t("quizBuilder.answer")}</div>
              {isImage ? (
                <div className="space-y-2 py-1">
                  <MediaAttachButton
                    allowedTypes={["IMAGE"]}
                    resource={matches[index]?.resource}
                    variant="answer-image-frame"
                    previewImage
                    mediaContext={mediaContext}
                    deferUpload
                    onChange={(mediaPatch) => updateMatch(matches[index].localId, mediaPatch)}
                  />
                  <Input
                    value={matches[index]?.content}
                    onChange={(e) => updateMatch(matches[index].localId, { content: e.target.value })}
                    placeholder={t("questionBankEditor.imageCaptionPlaceholder")}
                    className="text-sm"
                  />
                </div>
              ) : (
                <Input
                  value={matches[index]?.content}
                  onChange={(e) => updateMatch(matches[index].localId, { content: e.target.value })}
                  placeholder={t("quizBuilder.enterAnswer")}
                  className="text-sm"
                />
              )}
              <button
                type="button"
                onClick={() => removePair(prompts[index]?.correctMatchKey || matches[index]?.itemKey)}
                className="absolute right-2 top-2 text-red-400 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addPair} className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t("quizBuilder.addNewAnswer")}
      </button>
    </div>
  );
}

function SortableOrderItem({ item, onChangeContent, onDelete }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="cursor-grab select-none text-gray-300" {...attributes} {...listeners}>⋮⋮</span>
      <Input
        className="flex-1 border-none bg-transparent text-sm shadow-none"
        value={item.content}
        onChange={(e) => onChangeContent(e.target.value)}
        placeholder={item.content ? "" : t("questionBank.themMuc")}
      />
      <button type="button" onClick={onDelete} className="rounded p-1 text-red-400 hover:text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function OrderingItems({ question, onChange }) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor));
  const { items } = question;
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.localId === active.id);
      const newIndex = items.findIndex((item) => item.localId === over.id);
      onChange({ items: arrayMove(items, oldIndex, newIndex) });
    }
  };
  const update = (index, content) =>
    onChange({ items: items.map((item, itemIndex) => (itemIndex === index ? { ...item, content } : item)) });
  const remove = (index) => onChange({ items: items.filter((_, itemIndex) => itemIndex !== index) });
  const add = () => onChange({ items: [...items, createItem("ORDER_ITEM", "")] });

  return (
    <div>
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {t("quizBuilder.answers")}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.localId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableOrderItem
                key={item.localId}
                item={item}
                onChangeContent={(value) => update(index, value)}
                onDelete={() => remove(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={add} className="mt-4 text-sm text-blue-500 hover:text-blue-700">
        + {t("quizBuilder.add")}
      </button>
    </div>
  );
}

function ShortAnswerSection({ question, onChange }) {
  const { t } = useTranslation();
  const { answers } = question;
  const update = (index, content) =>
    onChange({ answers: answers.map((answer, answerIndex) => (answerIndex === index ? { ...answer, content } : answer)) });
  const remove = (index) => onChange({ answers: answers.filter((_, answerIndex) => answerIndex !== index) });
  const add = () => onChange({ answers: [...answers, createAnswer("", true)] });

  return (
    <div>
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {t("quizBuilder.acceptedKeywords")}
      </div>
      <div className="space-y-2">
        {answers.map((answer, index) => (
          <div key={answer.localId} className="flex items-center gap-2">
            <Input
              className="flex-1 text-sm"
              value={answer.content}
              onChange={(e) => update(index, e.target.value)}
              placeholder={t("quizBuilder.keywordPlaceholder", { index: index + 1 })}
            />
            <button type="button" onClick={() => remove(index)} className="rounded p-1 text-red-400 hover:text-red-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-4 text-sm text-blue-500 hover:text-blue-700">
        + {t("quizBuilder.addKeyword")}
      </button>
    </div>
  );
}

function ClozeSection({ question, onChange }) {
  const { t } = useTranslation();
  // Escape the whole syntax first so any HTML the teacher typed (inside or outside
  // the [[...]] tokens) is rendered as text, not markup. The bracket replacement
  // then runs on the already-escaped string, so parts[0] is safe as-is.
  const preview = escapeHtml(question.clozeSyntax || "").replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const parts = inner.split("|");
    return `<span style="border-bottom:2px solid #9ca3af;min-width:3rem;display:inline-block;margin:0 4px;color:#2563eb;font-weight:600">${parts[0]}</span>`;
  });

  return (
    <div>
      <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {t("quizBuilder.answers")}
      </div>
      <Input.TextArea
        rows={6}
        className="font-mono text-sm"
        value={question.clozeSyntax}
        onChange={(e) => onChange({ clozeSyntax: e.target.value })}
        placeholder={t("questionBankEditor.clozePlaceholder")}
      />
      <div className="mt-2 rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
        <strong>Example:</strong> {t("questionBankEditor.clozeExample")}
      </div>
      {question.clozeSyntax && (
        <div className="mt-3">
          <div className="mb-1 text-xs text-gray-500 dark:text-slate-400">{t("questionBankEditor.preview")}</div>
          <div
            className="rounded bg-gray-50 p-3 text-sm leading-loose dark:bg-slate-950/60"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}
    </div>
  );
}

function AnswerSection({ question, onChange, mediaContext }) {
  const { t } = useTranslation();

  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "IMAGE_ANSWERING"].includes(question.type)) {
    return <ChoiceAnswers question={question} onChange={onChange} mediaContext={mediaContext} />;
  }
  if (question.type === "MATCHING" || question.type === "IMAGE_MATCHING") {
    return <MatchingPairs question={question} onChange={onChange} mediaContext={mediaContext} />;
  }
  if (question.type === "DRAG_ORDER") {
    return <OrderingItems question={question} onChange={onChange} />;
  }
  if (question.type === "SHORT_ANSWER") {
    return <ShortAnswerSection question={question} onChange={onChange} />;
  }
  if (question.type === "CLOZE") {
    return <ClozeSection question={question} onChange={onChange} />;
  }
  if (question.type === "ESSAY") {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-sm italic text-gray-500 dark:bg-slate-950/60 dark:text-slate-400">
        {t("questionBank.essayHint")}
      </div>
    );
  }
  return null;
}

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

function QuestionCard({ question, mediaContext, onChange }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const questionTypeOptions = getQuestionTypeOptions(t);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3 px-3 py-3">
        <MediaSquare resource={question.resource} onChange={onChange} mediaContext={mediaContext} />
        <div className="min-w-0 flex-1">
          {!collapsed && question.type !== "CLOZE" && (
            <ReactQuill
              theme="snow"
              value={question.content}
              onChange={(value) => onChange({ content: value })}
              modules={QUILL_MODULES}
              placeholder={t("quizBuilder.enterQuestion")}
              className="quiz-quill"
            />
          )}
          {!collapsed && question.type === "CLOZE" && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
              {t("questionBankEditor.clozeContentHint")}
            </div>
          )}
          {collapsed && (
            <div className="truncate py-1 text-sm italic text-gray-500 dark:text-slate-400">
              {(question.type === "CLOZE" ? question.clozeSyntax : question.content)?.replace(/<[^>]+>/g, "") || t("quizBuilder.enterQuestion")}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select
              size="small"
              value={question.type}
              options={questionTypeOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => {
                const fresh = createQuestionDraft(value);
                onChange({
                  type: value,
                  answers: fresh.answers,
                  items: fresh.items,
                  clozeSyntax: value === "CLOZE" ? question.clozeSyntax || "" : "",
                });
              }}
              className="w-64"
              popupMatchSelectWidth={false}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
        >
          <svg className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className="border-t border-gray-100 px-3 pb-4 pt-1 dark:border-slate-700">
          <AnswerSection question={question} onChange={onChange} mediaContext={mediaContext} />
        </div>
      )}
    </div>
  );
}

export default function QuestionBankQuestionEditor({ isAdmin = false }) {
  const { id, questionId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState(null);
  const [question, setQuestion] = useState(createQuestionDraft("SINGLE_CHOICE"));
  const [difficultyLevel, setDifficultyLevel] = useState("MEDIUM");
  const [tagNames, setTagNames] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [tagSearchLoading, setTagSearchLoading] = useState(false);

  const isEditMode = Boolean(questionId);
  const Sidebar = isAdmin ? AdminSidebar : TeacherSidebar;
  const difficultyOptions = useMemo(() => getDifficultyOptions(t), [t]);
  const mediaContext = useMemo(() => ({
    scopeType: "QUESTION_BANK",
    scopeId: Number(id),
  }), [id]);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadTagOptions = useCallback(async (search = "", seedTagNames = []) => {
    try {
      setTagSearchLoading(true);
      const response = await getTags(id, search.trim() ? { search: search.trim() } : undefined);
      const fetchedTagNames = (response || []).map((tag) => tag?.name).filter(Boolean);
      setTagOptions(buildTagOptions([...seedTagNames, ...fetchedTagNames]));
    } catch {
      setTagOptions(buildTagOptions(seedTagNames));
    } finally {
      setTagSearchLoading(false);
    }
  }, [id]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const bankResponse = await getQuestionBankById(id);
      setBank(bankResponse);

      if (questionId) {
        const matchedQuestion = (bankResponse?.questions || []).find(
          (item) => String(item.id) === String(questionId)
        );
        if (!matchedQuestion) {
          throw new Error(t("questionBankEditor.questionNotFound"));
        }
        const draft = transformBankQuestion(matchedQuestion);
        setQuestion(draft);
        setDifficultyLevel(matchedQuestion.difficultyLevel || "MEDIUM");
        const nextTagNames = (matchedQuestion.tags || []).map((tag) => tag.name).filter(Boolean);
        setTagNames(nextTagNames);
        await loadTagOptions("", nextTagNames);
      } else {
        setQuestion(createQuestionDraft("SINGLE_CHOICE"));
        setDifficultyLevel("MEDIUM");
        setTagNames([]);
        await loadTagOptions("", []);
      }
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || error.message || t("questionBank.loi"));
      navigate(isAdmin ? `/admin/question-banks/${id}` : `/teacher/question-banks/${id}`);
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, loadTagOptions, message, navigate, questionId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patchQuestion = (patch) => {
    setQuestion((prev) => ({ ...prev, ...patch }));
  };

  const validateQuestion = () => {
    if (question.type === "CLOZE") {
      const items = parseClozeToItems(question.clozeSyntax || "");
      if (items.length === 0) {
        message.warning(t("questionBank.vuiLongThemItNhatMotChoTrong"));
        return false;
      }
      return true;
    }

    if (question.type === "MATCHING" || question.type === "IMAGE_MATCHING") {
      const prompts = question.items.filter((item) => item.role === "PROMPT");
      const matches = question.items.filter((item) => item.role === "MATCH");
      if (
        prompts.length === 0
        || matches.length === 0
        || prompts.length !== matches.length
        || prompts.some((item) => !item.content?.trim() && !item.resource)
        || matches.some((item) => !item.content?.trim() && !item.resource)
      ) {
        message.warning(t("questionBank.vuiLongNhapDayDuCapGhep"));
        return false;
      }
      return true;
    }

    if (question.type === "DRAG_ORDER") {
      if (question.items.length < 2 || question.items.some((item) => !item.content?.trim())) {
        message.warning(t("questionBank.vuiLongNhapItNhatHaiMucSapXep"));
        return false;
      }
      return true;
    }

    if (question.type === "ESSAY") {
      return true;
    }

    if (question.answers.some((answer) => !answer.content?.trim() && !answer.resource)) {
      message.warning(t("questionBank.vuiLongNhapNoiDungTatCaDapAn"));
      return false;
    }

    if (question.type !== "SHORT_ANSWER" && !question.answers.some((answer) => answer.isCorrect)) {
      message.warning(t("questionBank.vuiLongChonItNhatMotDapAnDung"));
      return false;
    }

    return true;
  };

  const buildPayload = (persistedQuestion) => {
    const normalizedTags = mergeTagNames(tagNames, tagSearchValue ? [tagSearchValue] : []);
    const payload = {
      content: persistedQuestion.type === "CLOZE" ? persistedQuestion.clozeSyntax : persistedQuestion.content,
      explanation: null,
      resourceId: persistedQuestion.resourceId || null,
      type: persistedQuestion.type,
      difficultyLevel,
      defaultPoints: 1,
      tagNames: normalizedTags,
      options: [],
      items: [],
    };

    if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "IMAGE_ANSWERING"].includes(persistedQuestion.type)) {
      payload.options = persistedQuestion.answers.map((answer, index) => ({
        content: answer.content,
        isCorrect: persistedQuestion.type === "SHORT_ANSWER" ? true : !!answer.isCorrect,
        explanation: answer.explanation || null,
        resourceId: answer.resourceId || null,
        orderIndex: index + 1,
      }));
      return payload;
    }

    if (persistedQuestion.type === "CLOZE") {
      payload.items = parseClozeToItems(persistedQuestion.clozeSyntax || "");
      return payload;
    }

    if (persistedQuestion.type === "MATCHING" || persistedQuestion.type === "IMAGE_MATCHING") {
      payload.items = persistedQuestion.items.map((item, index) => ({
        role: item.role,
        content: item.content,
        itemKey: item.itemKey,
        correctMatchKey: item.correctMatchKey,
        resourceId: item.resourceId || null,
        orderIndex: index + 1,
      }));
      return payload;
    }

    if (persistedQuestion.type === "DRAG_ORDER") {
      payload.items = persistedQuestion.items.map((item, index) => ({
        role: "ORDER_ITEM",
        content: item.content,
        correctOrderIndex: index + 1,
        orderIndex: index + 1,
      }));
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateQuestion()) return;
    if (question.type !== "CLOZE" && !String(question.content || "").replace(/<[^>]+>/g, "").trim()) {
      message.warning(t("questionBankEditor.questionContentRequired"));
      return;
    }

    const createdResourceIds = [];
    try {
      setSaving(true);
      const persistedQuestion = await materializeQuestionMedia(
        question,
        mediaContext,
        new Map(),
        createdResourceIds
      );
      const payload = buildPayload(persistedQuestion);

      if (isEditMode) {
        await updateBankQuestion(questionId, payload);
        message.success(t("questionBank.capNhatCauHoiThanhCong"));
      } else {
        await createQuestion(id, payload);
        message.success(t("questionBank.themCauHoiThanhCong"));
      }

      navigate(isAdmin ? `/admin/question-banks/${id}` : `/teacher/question-banks/${id}`);
    } catch (error) {
      if (createdResourceIds.length > 0) {
        await Promise.allSettled(
          [...new Set(createdResourceIds)].map((resourceId) => deleteResource(resourceId))
        );
      }
      console.error(error);
      message.error(error?.response?.data?.message || t("questionBank.loi"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-[#111418] dark:bg-slate-900 dark:text-white">
      <TeacherHeader />
      <div className="flex">
        <Sidebar />
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb
              className="mb-6"
              context={{
                questionBankName: bank?.name,
                questionTitle: isEditMode ? t("questionBankEditor.editTitle") : t("questionBankEditor.createTitle"),
              }}
            />

            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {isEditMode ? t("questionBankEditor.editTitle") : t("questionBankEditor.createTitle")}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {bank?.name}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => navigate(isAdmin ? `/admin/question-banks/${id}` : `/teacher/question-banks/${id}`)}>
                  {t("questionBankEditor.cancel")}
                </Button>
                <Button type="primary" loading={saving} onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 border-0">
                  {t("questionBankEditor.save")}
                </Button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <QuestionCard
                  question={question}
                  mediaContext={mediaContext}
                  onChange={patchQuestion}
                />
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("questionBankEditor.metadata")}
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("quizBuilder.difficulty")}
                      </label>
                      <Select
                        value={difficultyLevel}
                        options={difficultyOptions}
                        onChange={setDifficultyLevel}
                        className="w-full"
                        optionFilterProp="label"
                        showSearch
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("questionBank.tags")}
                      </label>
                      <Select
                        mode="tags"
                        value={tagNames}
                        options={tagOptions}
                        className="w-full"
                        placeholder={t("questionBankEditor.tagsPlaceholder")}
                        onSearch={(value) => {
                          setTagSearchValue(value);
                          loadTagOptions(value, tagNames);
                        }}
                        onChange={(value) => {
                          setTagNames(mergeTagNames(value));
                          setTagSearchValue("");
                        }}
                        notFoundContent={tagSearchLoading ? <Spin size="small" /> : null}
                        tokenSeparators={[",", "\n"]}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("questionBankEditor.mediaScopeTitle")}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("questionBankEditor.mediaScopeDescription")}
                  </p>
                  {question.resource && (
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950/60">
                      <ResourceRenderer resource={question.resource} compact />
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
      <style>{`
        .quiz-quill .ql-container { border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; font-size: 14px; min-height: 80px; }
        .quiz-quill .ql-toolbar { border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .quiz-quill .ql-editor { min-height: 80px; }
      `}</style>
    </div>
  );
}
