import React, { useState } from "react";
import { Button, Modal } from "antd";
import { useTranslation } from "react-i18next";
import MediaPickerModal from "./MediaPickerModal";

const TYPE_OPTIONS = [
  {
    type: "IMAGE",
    icon: (
      <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    type: "VIDEO",
    icon: (
      <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    type: "AUDIO",
    icon: (
      <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5L6 9H3v6h3l5 4V5zm5.5 3.5a5 5 0 010 7m2.5-9.5a8.5 8.5 0 010 12" />
      </svg>
    ),
  },
];

export default function MediaAttachButton({
  resource,
  allowedTypes = ["IMAGE", "VIDEO", "AUDIO"],
  onChange,
  compact = false,
  label,
}) {
  const { t } = useTranslation();
  const [typeOpen, setTypeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(allowedTypes[0] || "IMAGE");

  const openPicker = (type) => {
    setSelectedType(type);
    setTypeOpen(false);
    setPickerOpen(true);
  };

  const handleClick = () => {
    if (allowedTypes.length === 1) {
      openPicker(allowedTypes[0]);
      return;
    }
    setTypeOpen(true);
  };

  return (
    <>
      <Button
        size={compact ? "small" : "middle"}
        type={resource ? "primary" : "default"}
        onClick={handleClick}
        className="inline-flex items-center gap-1"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M5 20h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        {!compact && (label || t(resource ? "quizMedia.changeMedia" : "quizMedia.addMedia"))}
      </Button>

      <Modal
        open={typeOpen}
        onCancel={() => setTypeOpen(false)}
        footer={null}
        width={620}
        title={t("quizMedia.selectMediaType")}
        destroyOnHidden
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TYPE_OPTIONS.filter((option) => allowedTypes.includes(option.type)).map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => openPicker(option.type)}
              className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-blue-600 transition hover:border-blue-500 hover:shadow-sm"
            >
              {option.icon}
              <span className="mt-3 text-sm font-medium text-gray-700">
                {t(`quizMedia.types.${option.type}`)}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <MediaPickerModal
        open={pickerOpen}
        mediaType={selectedType}
        allowedTypes={[selectedType]}
        onCancel={() => setPickerOpen(false)}
        onSelect={(nextResource) => {
          onChange?.(nextResource ? { resourceId: nextResource.id, resource: nextResource } : { resourceId: null, resource: null });
          setPickerOpen(false);
        }}
      />
    </>
  );
}
