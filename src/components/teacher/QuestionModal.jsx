import React from "react";
import { Modal } from "antd";
import { useTranslation } from "react-i18next";
import QuestionForm from "./QuestionForm";

export default function QuestionModal({
  open,
  onCancel,
  onFinish,
  initialValues,
  loading,
  existingTags = [],
  questionBankId,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      title={initialValues?.id ? t("questionBank.suaCauHoi") : t("questionBank.themCauHoiMoi")}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      forceRender
      destroyOnHidden
    >
      <QuestionForm
        initialValues={initialValues}
        onFinish={onFinish}
        loading={loading}
        existingTags={existingTags}
        questionBankId={questionBankId}
      />
    </Modal>
  );
}
