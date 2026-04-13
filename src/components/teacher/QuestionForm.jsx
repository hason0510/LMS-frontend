import React, { useState, useEffect } from "react";
import { Form, Input, Select, Button, Checkbox, Radio, Space, Divider } from "antd";
import { PlusCircleIcon, TrashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const { TextArea } = Input;

export default function QuestionForm({ initialValues, onFinish, loading }) {
  const [form] = Form.useForm();
  const [type, setType] = useState(initialValues?.type || "SINGLE_CHOICE");
  const [options, setOptions] = useState(initialValues?.options || [
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
  ]);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        content: initialValues.content,
        explanation: initialValues.explanation,
        difficultyLevel: initialValues.difficultyLevel || "MEDIUM",
        defaultPoints: initialValues.defaultPoints || 1,
      });
      setType(initialValues.type || "SINGLE_CHOICE");
      setOptions(initialValues.options || [
        { content: "", isCorrect: true },
        { content: "", isCorrect: false },
      ]);
    }
  }, [initialValues, form]);

  const handleTypeChange = (val) => {
    setType(val);
    if (val === "ESSAY") {
      setOptions([{ content: "Đáp án mẫu", isCorrect: true }]);
    } else if (options.length === 1 && options[0].content === "Đáp án mẫu") {
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

  const handleSubmit = (values) => {
    // Validate options
    if (type !== "ESSAY" && !options.some(opt => opt.isCorrect)) {
      return alert("Vui lòng chọn ít nhất một đáp án đúng");
    }
    if (options.some(opt => !opt.content.trim())) {
      return alert("Vui lòng nhập nội dung cho tất cả các đáp án");
    }

    onFinish({
      ...values,
      type,
      options: options.map(opt => ({
        content: opt.content,
        isCorrect: opt.isCorrect
      }))
    });
  };

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
            <Select.Option value="ESSAY">Tự luận</Select.Option>
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

      <Divider orientation="left">Đáp án</Divider>

      {type === "ESSAY" ? (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">Đối với câu hỏi tự luận, giảng viên sẽ chấm điểm thủ công dựa trên bài làm của sinh viên.</p>
          <TextArea 
            rows={4} 
            placeholder="Hướng dẫn chấm điểm hoặc đáp án mẫu..." 
            value={options[0]?.content}
            onChange={(e) => handleOptionContentChange(0, e.target.value)}
          />
        </div>
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

      <div className="flex justify-end gap-2 mt-8">
        <Button onClick={() => form.resetFields()}>Làm mới</Button>
        <Button type="primary" htmlType="submit" loading={loading} className="px-8">
          {initialValues?.id ? "Cập nhật" : "Lưu câu hỏi"}
        </Button>
      </div>
    </Form>
  );
}
