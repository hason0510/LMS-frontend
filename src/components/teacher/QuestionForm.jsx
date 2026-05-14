import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Form, Input, Select, Button, Checkbox, Radio, Spin } from "antd";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getTags as getQuestionBankTags } from "../../api/questionBank";
import MediaAttachButton from "../media/MediaAttachButton";
import ResourceRenderer from "../media/ResourceRenderer";
import { parseClozeToItems } from "../../utils/cloze";

const { TextArea } = Input;

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "image", "code-block"],
    ["clean"],
  ],
};

const createLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createMatchingPair = (prompt = "", match = "") => ({
  id: createLocalId(),
  prompt,
  match,
});

const createDragItem = (content = "") => ({
  id: createLocalId(),
  content,
});

const sortByOrder = (items = []) =>
  [...items].sort((left, right) => (left.orderIndex || 0) - (right.orderIndex || 0));

const buildMatchingPairsFromItems = (items = []) => {
  const prompts = sortByOrder(items.filter((item) => item.role === "PROMPT"));
  const matchesByKey = new Map(
    items
      .filter((item) => item.role === "MATCH")
      .map((item) => [item.itemKey, item])
  );
  const pairs = prompts.map((prompt) =>
    createMatchingPair(prompt.content || "", matchesByKey.get(prompt.correctMatchKey)?.content || "")
  );
  return pairs.length > 0 ? pairs : [createMatchingPair(), createMatchingPair()];
};

const buildDragItemsFromItems = (items = []) => {
  const orderItems = [...items]
    .filter((item) => item.role === "ORDER_ITEM")
    .sort((left, right) => (left.correctOrderIndex || 0) - (right.correctOrderIndex || 0))
    .map((item) => createDragItem(item.content || ""));
  return orderItems.length > 0 ? orderItems : [createDragItem(), createDragItem()];
};

const isInteractionType = (questionType) =>
  ["MATCHING", "DRAG_ORDER", "CLOZE"].includes(questionType);

const isSingleSelectType = (questionType) =>
  ["SINGLE_CHOICE", "TRUE_FALSE", "IMAGE_ANSWERING"].includes(questionType);

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

const buildClozePreview = (syntax = "") =>
  syntax.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
    const parts = inner.split("|");
    return `<span style="border-bottom:2px solid #9ca3af;min-width:3rem;display:inline-block;margin:0 4px;color:#2563eb;font-weight:600">${parts[0]}</span>`;
  });

/* ─── Answer Option Row ─── */
function OptionRow({ option, index, type, onChangeContent, onChangeResource, onToggleCorrect, onDelete, onChangeExplanation }) {
  const { t } = useTranslation();
  const [showExp, setShowExp] = useState(false);
  const [expVal, setExpVal] = useState(option.explanation || "");

  useEffect(() => { setExpVal(option.explanation || ""); }, [option.explanation]);

  const isSingle = isSingleSelectType(type);

  return (
    <div className={`rounded-lg border transition-colors ${option.isCorrect ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Input
          className="flex-1 border-none shadow-none bg-transparent text-sm"
          placeholder={`${t("quizBuilder.option")} ${index + 1}`}
          value={option.content}
          onChange={(e) => onChangeContent(e.target.value)}
        />
        {!showExp && (
          <button
            type="button"
            className="text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap shrink-0"
            onClick={() => setShowExp(true)}
          >
            {option.explanation ? t("quizBuilder.editExplanation") : t("quizBuilder.addExplanation")}
          </button>
        )}
        <MediaAttachButton
          compact
          resource={option.resource}
          allowedTypes={["IMAGE"]}
          onChange={onChangeResource}
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 p-1 rounded shrink-0"
          disabled={type === "TRUE_FALSE"}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-500 shrink-0">{t("quizBuilder.correct")}</span>
        {isSingle ? (
          <Radio checked={option.isCorrect} onChange={() => onToggleCorrect(index)} />
        ) : (
          <Checkbox checked={option.isCorrect} onChange={() => onToggleCorrect(index)} />
        )}
      </div>
      {showExp && (
        <div className="px-3 pb-2 border-t border-gray-100">
          <div className="flex items-start gap-2 mt-2">
            <TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="text-sm"
              placeholder={t("quizBuilder.explanationPlaceholder")}
              value={expVal}
              onChange={(e) => setExpVal(e.target.value)}
              onBlur={() => { onChangeExplanation(expVal); if (!expVal) setShowExp(false); }}
              autoFocus
            />
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 mt-1 shrink-0"
              onClick={() => { setShowExp(false); setExpVal(option.explanation || ""); }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {option.resource && (
        <div className="px-3 pb-3">
          <div className="relative rounded-lg bg-slate-50 p-2">
            <ResourceRenderer resource={option.resource} compact />
            <button
              type="button"
              onClick={() => onChangeResource({ resourceId: null, resource: null })}
              className="absolute right-3 top-3 rounded bg-slate-900/80 px-2 py-1 text-xs text-white hover:bg-slate-900"
            >
              {t("quizMedia.remove")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sortable Drag Item ─── */
function SortableDragItem({ item, index, onChangeContent, onDelete, disableDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white"
    >
      <span className="cursor-grab text-gray-300 select-none" {...attributes} {...listeners}>⋮⋮</span>
      <span className="text-xs text-gray-400 w-5 shrink-0">{index + 1}.</span>
      <Input
        className="flex-1 border-none shadow-none bg-transparent text-sm"
        placeholder={`Mục ${index + 1}`}
        value={item.content}
        onChange={(e) => onChangeContent(e.target.value)}
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={disableDelete}
        className="text-red-400 hover:text-red-600 p-1 disabled:opacity-30"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function QuestionForm({
  initialValues,
  onFinish,
  loading,
  existingTags = [],
  questionBankId,
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [type, setType] = useState(initialValues?.type || "SINGLE_CHOICE");
  const [questionResource, setQuestionResource] = useState(initialValues?.resource || null);
  const [options, setOptions] = useState(initialValues?.options || [
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
  ]);
  const [matchingPairs, setMatchingPairs] = useState([createMatchingPair(), createMatchingPair()]);
  const [dragItems, setDragItems] = useState([createDragItem(), createDragItem()]);
  const [tagOptions, setTagOptions] = useState(buildTagOptions((existingTags || []).map((tag) => tag.name)));
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [newOptionText, setNewOptionText] = useState("");
  const [clozeContent, setClozeContent] = useState("");
  const tagSearchRequestIdRef = useRef(0);

  const dndSensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        content: initialValues.content,
        explanation: initialValues.explanation,
        difficultyLevel: initialValues.difficultyLevel || "MEDIUM",
        defaultPoints: initialValues.defaultPoints || 1,
        resourceId: initialValues.resource?.id || initialValues.resourceId || null,
        tagNames: (initialValues.tags || []).map((t) => t.name),
      });
      setQuestionResource(initialValues.resource || null);
      setType(initialValues.type || "SINGLE_CHOICE");
      setOptions(initialValues.options || [
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
      setMatchingPairs(buildMatchingPairsFromItems(initialValues.items || []));
      setDragItems(buildDragItemsFromItems(initialValues.items || []));
      if (initialValues.type === "CLOZE") setClozeContent(initialValues.content || "");
    }
  }, [initialValues, form]);

  useEffect(() => {
    const selectedTagNames = form.getFieldValue("tagNames") || [];
    setTagOptions(buildTagOptions([
      ...selectedTagNames,
      ...(existingTags || []).map((tag) => tag.name),
      ...((initialValues?.tags || []).map((tag) => tag.name)),
    ]));
  }, [existingTags, initialValues?.tags, form]);

  const loadTagOptions = useCallback(async (searchValue = "") => {
    if (!questionBankId) return;
    const requestId = ++tagSearchRequestIdRef.current;
    setTagSearchLoading(true);
    try {
      const response = await getQuestionBankTags(
        questionBankId,
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );
      if (requestId !== tagSearchRequestIdRef.current) return;
      const fetchedTags = (response || []).map((tag) => tag?.name).filter(Boolean);
      const selectedTags = form.getFieldValue("tagNames") || [];
      setTagOptions(buildTagOptions([
        ...selectedTags,
        ...(existingTags || []).map((tag) => tag.name),
        ...fetchedTags,
      ]));
    } catch {
      // keep local options usable
    } finally {
      if (requestId === tagSearchRequestIdRef.current) setTagSearchLoading(false);
    }
  }, [existingTags, form, questionBankId]);

  useEffect(() => {
    if (questionBankId) {
      loadTagOptions("");
    }
  }, [questionBankId, loadTagOptions]);

  const commitPendingTagSearch = () => {
    const pendingTag = normalizeTagName(tagSearchValue);
    if (!pendingTag) return;
    const selectedTags = form.getFieldValue("tagNames") || [];
    const nextTagNames = mergeTagNames(selectedTags, [pendingTag]);
    form.setFieldValue("tagNames", nextTagNames);
    setTagOptions((prev) => buildTagOptions([...prev.map((option) => option.value), pendingTag]));
    setTagSearchValue("");
  };

  const selectTagOptions = useMemo(() => {
    const currentValue = normalizeTagName(tagSearchValue);
    const opts = [...tagOptions];
    if (currentValue && !opts.some((option) => option.value === currentValue)) {
      opts.unshift({ value: currentValue, label: `Tạo tag mới: ${tagSearchValue.trim()}` });
    }
    return opts;
  }, [tagOptions, tagSearchValue]);

  const handleTypeChange = (val) => {
    setType(val);
    if (val === "SHORT_ANSWER") {
      setOptions([{ content: "Đáp án đúng", isCorrect: true }]);
    } else if (val === "ESSAY") {
      setOptions([]);
    } else if (val === "TRUE_FALSE") {
      setOptions([
        { content: "True", isCorrect: true },
        { content: "False", isCorrect: false },
      ]);
    } else if (isInteractionType(val)) {
      setOptions([]);
    } else if (options.length <= 1) {
      setOptions([
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
    }
  };

  const commitNewOption = () => {
    const text = newOptionText.trim();
    if (!text) return;
    setOptions([...options, { content: text, isCorrect: false }]);
    setNewOptionText("");
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionContentChange = (index, content) => {
    const next = [...options];
    next[index] = { ...next[index], content };
    setOptions(next);
  };

  const handleOptionMediaChange = (index, mediaPatch) => {
    const next = [...options];
    next[index] = {
      ...next[index],
      resourceId: mediaPatch.resourceId ? Number(mediaPatch.resourceId) : undefined,
      resource: mediaPatch.resource || null,
    };
    setOptions(next);
  };

  const handleOptionExplanationChange = (index, explanation) => {
    const next = [...options];
    next[index] = { ...next[index], explanation: explanation || null };
    setOptions(next);
  };

  const handleCorrectChange = (index) => {
    if (isSingleSelectType(type)) {
      setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index })));
    } else {
      setOptions(options.map((opt, i) => i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt));
    }
  };

  const updateMatchingPair = (id, patch) => {
    setMatchingPairs((prev) => prev.map((pair) => pair.id === id ? { ...pair, ...patch } : pair));
  };

  const handleDragOrderEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIdx = dragItems.findIndex((i) => i.id === active.id);
      const newIdx = dragItems.findIndex((i) => i.id === over.id);
      setDragItems(arrayMove(dragItems, oldIdx, newIdx));
    }
  };

  const buildInteractionItems = () => {
    if (type === "MATCHING") {
      return matchingPairs.flatMap((pair, index) => {
        const promptKey = `prompt-${pair.id}`;
        const matchKey = `match-${pair.id}`;
        return [
          { content: pair.prompt.trim(), itemKey: promptKey, role: "PROMPT", correctMatchKey: matchKey, orderIndex: index + 1 },
          { content: pair.match.trim(), itemKey: matchKey, role: "MATCH", orderIndex: index + 1 },
        ];
      });
    }
    if (type === "DRAG_ORDER") {
      return dragItems.map((item, index) => ({
        content: item.content.trim(),
        itemKey: `order-${item.id}`,
        role: "ORDER_ITEM",
        correctOrderIndex: index + 1,
        orderIndex: index + 1,
      }));
    }
    if (type === "CLOZE") {
      return parseClozeToItems(clozeContent);
    }
    return [];
  };

  const validateInteractionItems = () => {
    if (type === "MATCHING") {
    if (matchingPairs.length === 0 || matchingPairs.some((pair) => !pair.prompt.trim() || !pair.match.trim())) {
        alert(t("questionBank.vuiLongNhapDayDuCapGhep"));
        return false;
      }
    }
    if (type === "DRAG_ORDER") {
      if (dragItems.length < 2 || dragItems.some((item) => !item.content.trim())) {
        alert(t("questionBank.vuiLongNhapItNhatHaiMucSapXep"));
        return false;
      }
    }
    if (type === "CLOZE") {
      const items = parseClozeToItems(clozeContent);
      if (items.length === 0) {
        alert(t("questionBank.vuiLongThemItNhatMotChoTrong"));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = (values) => {
    const pendingTag = normalizeTagName(tagSearchValue);
    const tagNames = mergeTagNames(values.tagNames || [], pendingTag ? [pendingTag] : []);

    if (type === "CLOZE") {
      if (!validateInteractionItems()) return;
      onFinish({
        ...values,
        content: clozeContent,
        tagNames,
        resourceId: values.resourceId || null,
        type,
        options: [],
        items: buildInteractionItems(),
      });
      return;
    }

    if (isInteractionType(type)) {
      if (!validateInteractionItems()) return;
      onFinish({
        ...values,
        tagNames,
        resourceId: values.resourceId || null,
        type,
        options: [],
        items: buildInteractionItems(),
      });
      return;
    }

    if (type === "ESSAY") {
      onFinish({ ...values, tagNames, resourceId: values.resourceId || null, type, options: [], items: [] });
      return;
    }

    if (type !== "SHORT_ANSWER" && !options.some((opt) => opt.isCorrect)) {
      return alert(t("questionBank.vuiLongChonItNhatMotDapAnDung"));
    }
    if (options.some((opt) => !opt.content.trim())) {
      return alert(t("questionBank.vuiLongNhapNoiDungTatCaDapAn"));
    }

    onFinish({
      ...values,
      tagNames,
      resourceId: values.resourceId || null,
      type,
      options: options.map((opt) => ({
        content: opt.content,
        isCorrect: opt.isCorrect,
        explanation: opt.explanation || null,
        resourceId: opt.resourceId || null,
      })),
      items: [],
    });
  };

  const renderMatchingEditor = () => (
    <div className="space-y-3">
      {matchingPairs.map((pair, index) => (
        <div key={pair.id} className="grid grid-cols-2 gap-3">
          <div className="border border-dashed border-gray-300 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">{t("questionBank.veTrai", { index: index + 1 })}</div>
            <Input
              placeholder={t("questionBank.veTrai", { index: index + 1 })}
              value={pair.prompt}
              onChange={(e) => updateMatchingPair(pair.id, { prompt: e.target.value })}
            />
          </div>
          <div className="border border-dashed border-gray-300 rounded-lg p-3 relative">
            <div className="text-xs text-gray-400 mb-1">{t("questionBank.vePhai", { index: index + 1 })}</div>
            <Input
              placeholder={t("questionBank.vePhai", { index: index + 1 })}
              value={pair.match}
              onChange={(e) => updateMatchingPair(pair.id, { match: e.target.value })}
            />
            <button
              type="button"
              className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
              onClick={() => setMatchingPairs((prev) => prev.filter((item) => item.id !== pair.id))}
              disabled={matchingPairs.length <= 1}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMatchingPairs((prev) => [...prev, createMatchingPair()])}
        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium mt-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t("questionBank.themCapGhep")}
      </button>
    </div>
  );

  const renderDragOrderEditor = () => (
    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragOrderEnd}>
      <SortableContext items={dragItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {dragItems.map((item, index) => (
            <SortableDragItem
              key={item.id}
              item={item}
              index={index}
              onChangeContent={(v) => setDragItems((prev) => prev.map((d) => d.id === item.id ? { ...d, content: v } : d))}
              onDelete={() => setDragItems((prev) => prev.filter((d) => d.id !== item.id))}
              disableDelete={dragItems.length <= 2}
            />
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={() => setDragItems((prev) => [...prev, createDragItem()])}
        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-sm font-medium mt-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t("questionBank.themMuc")}
      </button>
    </DndContext>
  );

  const renderClozeEditor = () => (
    <div className="space-y-3">
      <TextArea
        rows={4}
        className="font-mono text-sm"
        value={clozeContent}
        onChange={(e) => setClozeContent(e.target.value)}
        placeholder={t("questionBank.clozePlaceholder")}
      />
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-blue-700 mb-1">{t("questionBank.clozeSyntax")}</p>
        <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
          <li><code className="bg-blue-100 px-1 rounded">{"[[đáp án]]"}</code> {t("questionBank.clozeManualBlank")}</li>
          <li><code className="bg-blue-100 px-1 rounded">{"[[đúng|lựa chọn 1|lựa chọn 2]]"}</code> {t("questionBank.clozeSelectBlank")}</li>
        </ul>
      </div>
      {clozeContent && (
        <div>
          <div className="text-xs text-gray-500 mb-1">{t("questionBank.xemTruoc")}</div>
          <div
            className="p-3 bg-gray-50 rounded-lg text-sm leading-loose border border-gray-100"
            dangerouslySetInnerHTML={{ __html: buildClozePreview(clozeContent) }}
          />
        </div>
      )}
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ difficultyLevel: "MEDIUM", defaultPoints: 1 }}
    >
      {/* Question content */}
      {type === "CLOZE" ? (
        <Form.Item label={t("quizBuilder.questionContent")} required>
          {renderClozeEditor()}
        </Form.Item>
      ) : (
        <Form.Item
          label={t("quizBuilder.questionContent")}
          name="content"
          rules={[{ required: true, message: t("quizBuilder.questionContentRequired") }]}
          getValueFromEvent={(v) => (v === "<p><br></p>" ? "" : v)}
        >
          <ReactQuill
            theme="snow"
            modules={QUILL_MODULES}
            placeholder={t("quizBuilder.questionContentPlaceholder")}
            className="quiz-quill"
          />
        </Form.Item>
      )}

      <Form.Item name="resourceId" hidden><Input /></Form.Item>

      {/* Question media */}
      <div className="mb-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">{t("quizMedia.questionMedia")}</span>
          <MediaAttachButton
            resource={questionResource}
            allowedTypes={["IMAGE", "VIDEO", "AUDIO"]}
            label={questionResource ? t("quizMedia.changeMedia") : t("quizMedia.addMedia")}
            onChange={(mediaPatch) => {
              setQuestionResource(mediaPatch.resource || null);
              form.setFieldValue("resourceId", mediaPatch.resourceId || null);
            }}
          />
        </div>
        {questionResource ? (
          <div className="relative">
            <ResourceRenderer resource={questionResource} compact />
            <button
              type="button"
              onClick={() => { setQuestionResource(null); form.setFieldValue("resourceId", null); }}
              className="absolute right-2 top-2 rounded bg-slate-900/80 px-2 py-1 text-xs text-white hover:bg-slate-900"
            >
              {t("quizMedia.remove")}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t("quizMedia.questionMediaHint")}</p>
        )}
      </div>

      {/* Type / Difficulty / Points */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Form.Item label={t("quizBuilder.questionType")} required>
          <Select value={type} onChange={handleTypeChange}>
            <Select.Option value="SINGLE_CHOICE">{t("quizBuilder.types.SINGLE_CHOICE")}</Select.Option>
            <Select.Option value="MULTIPLE_CHOICE">{t("quizBuilder.types.MULTIPLE_CHOICE")}</Select.Option>
            <Select.Option value="TRUE_FALSE">{t("quizBuilder.types.TRUE_FALSE")}</Select.Option>
            <Select.Option value="SHORT_ANSWER">{t("quizBuilder.types.SHORT_ANSWER")}</Select.Option>
            <Select.Option value="ESSAY">{t("quizBuilder.types.ESSAY")}</Select.Option>
            <Select.Option value="MATCHING">{t("quizBuilder.types.MATCHING")}</Select.Option>
            <Select.Option value="DRAG_ORDER">{t("quizBuilder.types.DRAG_ORDER")}</Select.Option>
            <Select.Option value="CLOZE">{t("quizBuilder.types.CLOZE")}</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label={t("quizBuilder.difficulty")} name="difficultyLevel">
          <Select>
            <Select.Option value="EASY">{t("quizBuilder.difficulties.EASY")}</Select.Option>
            <Select.Option value="MEDIUM">{t("quizBuilder.difficulties.MEDIUM")}</Select.Option>
            <Select.Option value="HARD">{t("quizBuilder.difficulties.HARD")}</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label={t("quizBuilder.defaultPoints")} name="defaultPoints">
          <Input type="number" min={0} step="0.25" />
        </Form.Item>
      </div>

      {/* Answers section */}
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-2">
        {t("quizBuilder.answers")}
      </div>

      {type === "SHORT_ANSWER" ? (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 mb-2">
            {t("questionBank.shortAnswerAutoGradeHint")}
          </p>
          <TextArea
            rows={3}
            placeholder={t("questionBank.nhapDapAnDung")}
            value={options[0]?.content}
            onChange={(e) => {
              const next = [...options];
              if (!next[0]) next[0] = { content: "", isCorrect: true };
              next[0] = { ...next[0], content: e.target.value };
              setOptions(next);
            }}
          />
        </div>
      ) : type === "ESSAY" ? (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-700">
            {t("questionBank.essayHint")}
          </p>
        </div>
      ) : type === "MATCHING" ? (
        renderMatchingEditor()
      ) : type === "DRAG_ORDER" ? (
        renderDragOrderEditor()
      ) : type === "CLOZE" ? null : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <OptionRow
              key={index}
              option={option}
              index={index}
              type={type}
              onChangeContent={(v) => handleOptionContentChange(index, v)}
              onChangeResource={(mediaPatch) => handleOptionMediaChange(index, mediaPatch)}
              onToggleCorrect={() => handleCorrectChange(index)}
              onDelete={() => handleRemoveOption(index)}
              onChangeExplanation={(v) => handleOptionExplanationChange(index, v)}
            />
          ))}
          {type !== "TRUE_FALSE" && (
            <div className="flex items-center gap-2 mt-2 border border-dashed border-gray-300 rounded-lg px-3 py-2">
              <Input
                className="flex-1 border-none shadow-none bg-transparent text-sm"
                placeholder={t("questionBank.themLuaChonMoi")}
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                onPressEnter={commitNewOption}
              />
              <button
                type="button"
                onClick={commitNewOption}
                className="text-blue-500 hover:text-blue-700 font-semibold text-sm shrink-0"
              >
                {t("questionBank.them")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      <Form.Item label={t("questionBank.giaiThichDapAn")} name="explanation" className="mt-6">
        <TextArea rows={2} placeholder={t("questionBank.giaiThichDapAnPlaceholder")} />
      </Form.Item>

      {/* Tags */}
      <Form.Item label={t("questionBank.tagNoiDung")} name="tagNames" className="mt-2">
        <Select
          mode="tags"
          placeholder={t("questionBank.nhapHoacChonTag")}
          options={selectTagOptions}
          tokenSeparators={[","]}
          allowClear
          showSearch
          filterOption={false}
          onSearch={(value) => { setTagSearchValue(value); loadTagOptions(value); }}
          onBlur={commitPendingTagSearch}
          onOpenChange={(open) => {
            if (open) loadTagOptions(tagSearchValue);
            else commitPendingTagSearch();
          }}
          onChange={(value) => { form.setFieldValue("tagNames", mergeTagNames(value || [])); }}
          notFoundContent={tagSearchLoading ? <Spin size="small" /> : null}
        />
        <p className="text-xs text-amber-600 mt-1">
          {t("questionBank.difficultyAliasHint", { alias: "easy, de, dễ, medium, trung bình, hard, kho, khó" })}
        </p>
      </Form.Item>

      <div className="flex justify-end gap-2 mt-8">
        <Button onClick={() => form.resetFields()}>{t("questionBank.lamMoi")}</Button>
        <Button type="primary" htmlType="submit" loading={loading} className="px-8">
          {initialValues?.id ? t("questionBank.capNhat") : t("questionBank.luuCauHoi")}
        </Button>
      </div>
    </Form>
  );
}
