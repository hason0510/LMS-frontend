import React, { useState, useEffect, useMemo, useRef } from "react";
import { Form, Input, Select, Button, Checkbox, Radio, Divider, Spin } from "antd";
import { PlusCircleIcon, TrashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { getTags as getQuestionBankTags } from "../../api/questionBank";
import QuestionBlocksEditor from "../quiz/QuestionBlocksEditor";

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

const createClozeBlank = (answersText = "", label = "") => ({
  id: createLocalId(),
  label,
  answersText,
});

const splitAcceptedAnswers = (value = "") =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

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

const buildClozeBlanksFromItems = (items = []) => {
  const blanks = [...items]
    .filter((item) => item.role === "BLANK")
    .sort((left, right) => (left.blankIndex || 0) - (right.blankIndex || 0))
    .map((item) => createClozeBlank((item.acceptedAnswers || []).join("\n"), item.content || ""));
  return blanks.length > 0 ? blanks : [createClozeBlank()];
};

const isInteractionType = (questionType) =>
  ["MATCHING", "DRAG_ORDER", "CLOZE"].includes(questionType);

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
  const [clozeBlanks, setClozeBlanks] = useState([createClozeBlank()]);
  const [blocks, setBlocks] = useState(initialValues?.blocks || []);
  const [tagOptions, setTagOptions] = useState(buildTagOptions((existingTags || []).map((tag) => tag.name)));
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
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
      setClozeBlanks(buildClozeBlanksFromItems(initialValues.items || []));
      setBlocks(initialValues.blocks || []);
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

  const handleCorrectChange = (index) => {
    const newOptions = [...options];
    if (type === "SINGLE_CHOICE") {
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

  const updateClozeBlank = (id, patch) => {
    setClozeBlanks((prev) => prev.map((blank) => (blank.id === id ? { ...blank, ...patch } : blank)));
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
      return clozeBlanks.map((blank, index) => ({
        content: blank.label.trim() || `Blank ${index + 1}`,
        itemKey: `blank-${blank.id}`,
        role: "BLANK",
        blankIndex: index + 1,
        acceptedAnswers: splitAcceptedAnswers(blank.answersText),
        orderIndex: index + 1,
      }));
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
      if (clozeBlanks.length === 0 || clozeBlanks.some((blank) => splitAcceptedAnswers(blank.answersText).length === 0)) {
        alert("Vui lòng nhập đáp án cho tất cả chỗ trống");
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
        blocks,
        options: [],
        items: buildInteractionItems(),
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
      blocks,
      options: options.map((opt) => ({
        content: opt.content,
        isCorrect: opt.isCorrect,
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
    <div className="space-y-3">
      {clozeBlanks.map((blank, index) => (
        <div key={blank.id} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 items-start">
          <Input
            placeholder={`Blank ${index + 1}`}
            value={blank.label}
            onChange={(e) => updateClozeBlank(blank.id, { label: e.target.value })}
          />
          <TextArea
            rows={2}
            placeholder="Đáp án chấp nhận, mỗi dòng một đáp án"
            value={blank.answersText}
            onChange={(e) => updateClozeBlank(blank.id, { answersText: e.target.value })}
          />
          <Button
            type="text"
            danger
            icon={<TrashIcon className="h-4 w-4" />}
            onClick={() => setClozeBlanks((prev) => prev.filter((item) => item.id !== blank.id))}
            disabled={clozeBlanks.length <= 1}
          />
        </div>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusCircleIcon className="h-4 w-4" />}
        onClick={() => setClozeBlanks((prev) => [...prev, createClozeBlank()])}
      >
        Thêm chỗ trống
      </Button>
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
            <Select.Option value="SHORT_ANSWER">Trả lời ngắn</Select.Option>
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
          <Input type="number" min={1} />
        </Form.Item>
      </div>

      <Divider orientation="left">Nội dung mở rộng (Blocks)</Divider>
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">
          Thêm code, hình ảnh, audio/video, công thức toán hoặc chỗ trống điền (CLOZE) vào đề bài.
        </p>
        <QuestionBlocksEditor blocks={blocks} onChange={setBlocks} />
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
              <div className="flex-shrink-0">
                {type === "SINGLE_CHOICE" ? (
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
              <Button
                type="text"
                danger
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => handleRemoveOption(index)}
                disabled={options.length <= 2}
              />
            </div>
          ))}
          <Button
            type="dashed"
            block
            icon={<PlusCircleIcon className="h-4 w-4" />}
            onClick={handleAddOption}
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
