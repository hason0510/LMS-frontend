import React, { useState, useEffect, useMemo, useRef } from "react";
import { Form, Input, Select, Button, Checkbox, Radio, Divider, Spin } from "antd";
import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { getTags as getQuestionBankTags } from "../../api/questionBank";
import { uploadStandaloneResource } from "../../api/resource";

const { TextArea } = Input;

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

const parseClozeToItems = (syntax = "") => {
  const items = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  let idx = 0;
  while ((match = regex.exec(syntax)) !== null) {
    idx++;
    const parts = match[1].split("|");
    const correct = parts[0].trim();
    const opts = parts.slice(1).map((p) => p.trim()).filter(Boolean);
    items.push({
      content: correct,
      itemKey: `blank-${idx}`,
      role: "BLANK",
      blankIndex: idx,
      acceptedAnswers: [correct],
      blankType: opts.length > 0 ? "SELECT" : "TEXT_INPUT",
      blankOptions: opts.length > 0 ? JSON.stringify(opts) : null,
      orderIndex: idx,
    });
  }
  return items;
};

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

const DIFFICULTY_ALIAS_HINT = "easy, de, dễ, medium, trung bình, hard, kho, khó";

const normalizeTagName = (value = "") => value.trim().toLowerCase();

const mergeTagNames = (...lists) => {
  const merged = new Set();
  lists.flat().forEach((value) => {
    if (typeof value !== "string") return;
    const normalized = normalizeTagName(value);
    if (normalized) {
      merged.add(normalized);
    }
  });
  return [...merged];
};

const buildTagOptions = (tagNames = []) =>
  mergeTagNames(tagNames).map((name) => ({ value: name, label: name }));

export default function QuestionForm({
  initialValues,
  onFinish,
  loading,
  existingTags = [],
  questionBankId,
}) {
  const [form] = Form.useForm();
  const [type, setType] = useState(initialValues?.type || "SINGLE_CHOICE");
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
  const [optionUploading, setOptionUploading] = useState({});
  const tagSearchRequestIdRef = useRef(0);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        content: initialValues.content,
        explanation: initialValues.explanation,
        difficultyLevel: initialValues.difficultyLevel || "MEDIUM",
        defaultPoints: initialValues.defaultPoints || 1,
        tagNames: (initialValues.tags || []).map((t) => t.name),
      });
      setType(initialValues.type || "SINGLE_CHOICE");
      setOptions(initialValues.options || [
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
      setMatchingPairs(buildMatchingPairsFromItems(initialValues.items || []));
      setDragItems(buildDragItemsFromItems(initialValues.items || []));
    }
  }, [initialValues, form]);

  useEffect(() => {
    setTagOptions((prev) =>
      buildTagOptions([
        ...prev.map((option) => option.value),
        ...(existingTags || []).map((tag) => tag.name),
        ...((initialValues?.tags || []).map((tag) => tag.name)),
      ])
    );
  }, [existingTags, initialValues]);

  const loadTagOptions = async (searchValue = "") => {
    if (!questionBankId) {
      return;
    }

    const requestId = ++tagSearchRequestIdRef.current;
    setTagSearchLoading(true);

    try {
      const response = await getQuestionBankTags(
        questionBankId,
        searchValue.trim() ? { search: searchValue.trim() } : undefined
      );
      if (requestId !== tagSearchRequestIdRef.current) {
        return;
      }

      const fetchedTags = (response?.data || response || []).map((tag) => tag?.name).filter(Boolean);
      const selectedTags = form.getFieldValue("tagNames") || [];
      setTagOptions(
        buildTagOptions([
          ...selectedTags,
          ...(existingTags || []).map((tag) => tag.name),
          ...fetchedTags,
        ])
      );
    } catch {
      // Keep local options usable even if search fails.
    } finally {
      if (requestId === tagSearchRequestIdRef.current) {
        setTagSearchLoading(false);
      }
    }
  };

  const commitPendingTagSearch = () => {
    const pendingTag = normalizeTagName(tagSearchValue);
    if (!pendingTag) {
      return;
    }

    const selectedTags = form.getFieldValue("tagNames") || [];
    const nextTagNames = mergeTagNames(selectedTags, [pendingTag]);
    form.setFieldValue("tagNames", nextTagNames);
    setTagOptions((prev) => buildTagOptions([...prev.map((option) => option.value), pendingTag]));
    setTagSearchValue("");
  };

  const selectTagOptions = useMemo(() => {
    const currentValue = normalizeTagName(tagSearchValue);
    const options = [...tagOptions];

    if (currentValue && !options.some((option) => option.value === currentValue)) {
      options.unshift({
        value: currentValue,
        label: `Tạo tag mới: ${tagSearchValue.trim()}`,
      });
    }

    return options;
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

  const handleAddOption = () => {
    setOptions([...options, { content: "", isCorrect: false }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionContentChange = (index, content) => {
    const newOptions = [...options];
    newOptions[index].content = content;
    setOptions(newOptions);
  };

  const handleOptionResourceChange = (index, resourceId) => {
    const newOptions = [...options];
    newOptions[index].resourceId = resourceId ? Number(resourceId) : undefined;
    setOptions(newOptions);
  };

  const handleOptionFileUpload = async (index, file) => {
    if (!file) return;
    try {
      setOptionUploading((prev) => ({ ...prev, [index]: true }));
      const response = await uploadStandaloneResource(file);
      const uploaded = response?.data || response;
      handleOptionResourceChange(index, uploaded?.resourceId || uploaded?.id);
    } finally {
      setOptionUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleCorrectChange = (index) => {
    const newOptions = [...options];
    if (isSingleSelectType(type)) {
      newOptions.forEach((opt, i) => (opt.isCorrect = i === index));
    } else {
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
    }
    setOptions(newOptions);
  };

  const updateMatchingPair = (id, patch) => {
    setMatchingPairs((prev) => prev.map((pair) => (pair.id === id ? { ...pair, ...patch } : pair)));
  };

  const updateDragItem = (id, content) => {
    setDragItems((prev) => prev.map((item) => (item.id === id ? { ...item, content } : item)));
  };

  const moveDragItem = (id, direction) => {
    setDragItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const buildInteractionItems = () => {
    if (type === "MATCHING") {
      return matchingPairs.flatMap((pair, index) => {
        const promptKey = `prompt-${pair.id}`;
        const matchKey = `match-${pair.id}`;
        return [
          {
            content: pair.prompt.trim(),
            itemKey: promptKey,
            role: "PROMPT",
            correctMatchKey: matchKey,
            orderIndex: index + 1,
          },
          {
            content: pair.match.trim(),
            itemKey: matchKey,
            role: "MATCH",
            orderIndex: index + 1,
          },
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
      return parseClozeToItems(form.getFieldValue("content") || "");
    }

    return [];
  };

  const validateInteractionItems = () => {
    if (type === "MATCHING") {
      if (matchingPairs.length === 0 || matchingPairs.some((pair) => !pair.prompt.trim() || !pair.match.trim())) {
        alert("Vui lòng nhập đầy đủ các cặp ghép");
        return false;
      }
    }

    if (type === "DRAG_ORDER") {
      if (dragItems.length < 2 || dragItems.some((item) => !item.content.trim())) {
        alert("Vui lòng nhập ít nhất 2 mục sắp xếp");
        return false;
      }
    }

    if (type === "CLOZE") {
      const items = parseClozeToItems(form.getFieldValue("content") || "");
      if (items.length === 0) {
        alert("Vui lòng thêm ít nhất một chỗ trống với cú pháp [[đáp án]] trong nội dung câu hỏi");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (values) => {
    const pendingTag = normalizeTagName(tagSearchValue);
    const tagNames = mergeTagNames(values.tagNames || [], pendingTag ? [pendingTag] : []);

    if (isInteractionType(type)) {
      if (!validateInteractionItems()) return;
      onFinish({
        ...values,
        tagNames,
        type,
        options: [],
        items: buildInteractionItems(),
      });
      return;
    }

    if (type === "ESSAY") {
      onFinish({
        ...values,
        tagNames,
        type,
        options: [],
        items: [],
      });
      return;
    }

    if (type !== "SHORT_ANSWER" && !options.some((opt) => opt.isCorrect)) {
      return alert("Vui lòng chọn ít nhất một đáp án đúng");
    }
    if (options.some((opt) => !opt.content.trim())) {
      return alert("Vui lòng nhập nội dung cho tất cả các đáp án");
    }

    onFinish({
      ...values,
      tagNames,
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
        <div key={pair.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
          <Input
            placeholder={`Vế trái ${index + 1}`}
            value={pair.prompt}
            onChange={(e) => updateMatchingPair(pair.id, { prompt: e.target.value })}
          />
          <Input
            placeholder={`Vế phải ${index + 1}`}
            value={pair.match}
            onChange={(e) => updateMatchingPair(pair.id, { match: e.target.value })}
          />
          <Button
            type="text"
            danger
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => setMatchingPairs((prev) => prev.filter((item) => item.id !== pair.id))}
            disabled={matchingPairs.length <= 1}
          />
        </div>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusCircleIcon className="h-4 w-4" />}
        onClick={() => setMatchingPairs((prev) => [...prev, createMatchingPair()])}
      >
        Thêm cặp ghép
      </Button>
    </div>
  );

  const renderDragOrderEditor = () => (
    <div className="space-y-3">
      {dragItems.map((item, index) => (
        <div key={item.id} className="flex items-center gap-3">
          <span className="w-8 text-center font-semibold text-slate-500">{index + 1}</span>
          <Input
            placeholder={`Mục ${index + 1}`}
            value={item.content}
            onChange={(e) => updateDragItem(item.id, e.target.value)}
          />
          <Button onClick={() => moveDragItem(item.id, -1)} disabled={index === 0}>↑</Button>
          <Button onClick={() => moveDragItem(item.id, 1)} disabled={index === dragItems.length - 1}>↓</Button>
          <Button
            type="text"
            danger
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => setDragItems((prev) => prev.filter((current) => current.id !== item.id))}
            disabled={dragItems.length <= 2}
          />
        </div>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusCircleIcon className="h-4 w-4" />}
        onClick={() => setDragItems((prev) => [...prev, createDragItem()])}
      >
        Thêm mục
      </Button>
    </div>
  );

  const renderClozeEditor = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm font-semibold text-blue-700 mb-2">Cú pháp điền chỗ trống (CLOZE):</p>
      <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
        <li><code className="bg-blue-100 px-1 rounded">{"[[đáp án]]"}</code> — chỗ trống nhập tay</li>
        <li><code className="bg-blue-100 px-1 rounded">{"[[đúng|lựa chọn 1|lựa chọn 2]]"}</code> — chỗ trống chọn từ danh sách</li>
      </ul>
      <p className="text-xs text-blue-500 mt-2">Nhúng cú pháp trực tiếp vào ô &quot;Nội dung câu hỏi&quot; ở trên. Ví dụ: <em>Thủ đô của Việt Nam là <strong>[[Hà Nội]]</strong>.</em></p>
    </div>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        difficultyLevel: "MEDIUM",
        defaultPoints: 1,
      }}
    >
      <Form.Item
        label="Nội dung câu hỏi"
        name="content"
        rules={[{ required: true, message: "Vui lòng nhập nội dung câu hỏi" }]}
      >
        <TextArea rows={4} placeholder="Nhập nội dung câu hỏi (hỗ trợ HTML)..." />
      </Form.Item>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Form.Item label="Loại câu hỏi" required>
          <Select value={type} onChange={handleTypeChange}>
            <Select.Option value="SINGLE_CHOICE">Trắc nghiệm (1 đáp án)</Select.Option>
            <Select.Option value="MULTIPLE_CHOICE">Trắc nghiệm (Nhiều đáp án)</Select.Option>
            <Select.Option value="TRUE_FALSE">Đúng / Sai</Select.Option>
            <Select.Option value="SHORT_ANSWER">Trả lời ngắn</Select.Option>
            <Select.Option value="ESSAY">Tự luận / chấm tay</Select.Option>
            <Select.Option value="MATCHING">Ghép cặp</Select.Option>
            <Select.Option value="DRAG_ORDER">Sắp xếp</Select.Option>
            <Select.Option value="CLOZE">Điền chỗ trống</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Độ khó" name="difficultyLevel">
          <Select>
            <Select.Option value="EASY">Dễ</Select.Option>
            <Select.Option value="MEDIUM">Trung bình</Select.Option>
            <Select.Option value="HARD">Khó</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Điểm mặc định" name="defaultPoints">
          <Input type="number" min={0} step="0.25" />
        </Form.Item>
      </div>

      <Divider orientation="left">Đáp án</Divider>

      {type === "SHORT_ANSWER" ? (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
            Câu trả lời được chấm tự động theo đáp án đúng (không phân biệt hoa/thường).
          </p>
          <TextArea
            rows={4}
            placeholder="Nhập đáp án đúng..."
            value={options[0]?.content}
            onChange={(e) => handleOptionContentChange(0, e.target.value)}
          />
        </div>
      ) : type === "ESSAY" ? (
        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Câu tự luận sẽ được lưu để giáo viên chấm tay sau khi học viên nộp bài.
          </p>
        </div>
      ) : type === "MATCHING" ? (
        renderMatchingEditor()
      ) : type === "DRAG_ORDER" ? (
        renderDragOrderEditor()
      ) : type === "CLOZE" ? (
        renderClozeEditor()
      ) : (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-3 group">
              <div className="shrink-0">
                {isSingleSelectType(type) ? (
                  <Radio
                    checked={option.isCorrect}
                    onChange={() => handleCorrectChange(index)}
                  />
                ) : (
                  <Checkbox
                    checked={option.isCorrect}
                    onChange={() => handleCorrectChange(index)}
                  />
                )}
              </div>
              <Input
                placeholder={`Lựa chọn ${index + 1}`}
                value={option.content}
                onChange={(e) => handleOptionContentChange(index, e.target.value)}
                className={option.isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/10" : ""}
              />
              <Input
                type="number"
                min={1}
                placeholder="Resource ID"
                value={option.resourceId || ""}
                onChange={(e) => handleOptionResourceChange(index, e.target.value)}
                className="w-32"
              />
              <Button loading={!!optionUploading[index]}>
                <label className="cursor-pointer">
                  File
                  <input
                    type="file"
                    accept="image/*,audio/*,video/*"
                    className="hidden"
                    onChange={(event) => handleOptionFileUpload(index, event.target.files?.[0])}
                  />
                </label>
              </Button>
              <Button
                type="text"
                danger
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => handleRemoveOption(index)}
                disabled={options.length <= 2 || type === "TRUE_FALSE"}
              />
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusCircleIcon className="h-4 w-4" />}
            onClick={handleAddOption}
            disabled={type === "TRUE_FALSE"}
            className="mt-2"
          >
            Thêm lựa chọn
          </Button>
        </div>
      )}

      <Form.Item label="Giải thích đáp án (tùy chọn)" name="explanation" className="mt-6">
        <TextArea rows={2} placeholder="Giải thích tại sao đáp án này đúng..." />
      </Form.Item>

      <Form.Item label="Tag nội dung (tùy chọn)" name="tagNames" className="mt-2">
        <Select
          mode="tags"
          placeholder="Nhập hoặc chọn tag..."
          options={selectTagOptions}
          tokenSeparators={[","]}
          allowClear
          showSearch
          filterOption={false}
          onSearch={(value) => {
            setTagSearchValue(value);
            loadTagOptions(value);
          }}
          onBlur={commitPendingTagSearch}
          onOpenChange={(open) => {
            if (open) {
              loadTagOptions(tagSearchValue);
            } else {
              commitPendingTagSearch();
            }
          }}
          onChange={(value) => {
            form.setFieldValue("tagNames", mergeTagNames(value || []));
          }}
          notFoundContent={tagSearchLoading ? <Spin size="small" /> : null}
        />
        <p className="text-xs text-amber-600 mt-1">
          Alias độ khó (<span className="font-mono">{DIFFICULTY_ALIAS_HINT}</span>) sẽ tự map vào Độ khó, không lưu thành tag.
        </p>
      </Form.Item>

      <div className="flex justify-end gap-2 mt-8">
        <Button onClick={() => form.resetFields()}>Làm mới</Button>
        <Button type="primary" htmlType="submit" loading={loading} className="px-8">
          {initialValues?.id ? "Cập nhật" : "Lưu câu hỏi"}
        </Button>
      </div>
    </Form>
  );
}
