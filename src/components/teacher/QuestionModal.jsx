import React from "react";
import { Modal } from "antd";
import QuestionForm from "./QuestionForm";

export default function QuestionModal({ visible, onCancel, onFinish, initialValues, loading }) {
  return (
    <Modal
      title={initialValues?.id ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <QuestionForm 
        initialValues={initialValues} 
        onFinish={onFinish} 
        loading={loading} 
      />
    </Modal>
  );
}
