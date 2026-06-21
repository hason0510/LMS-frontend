import React, { useState } from "react";
import { App, Button, Modal, Tooltip } from "antd";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Clapperboard,
  Image as ImageIcon,
  ImagePlus,
  X,
} from "lucide-react";
import MediaPickerModal from "./MediaPickerModal";

const TYPE_OPTIONS = [
  {
    type: "IMAGE",
    Icon: ImageIcon,
    accentClass: "text-sky-600 dark:text-sky-200",
    badgeClass: "bg-sky-50 border-sky-100 dark:bg-sky-950/40 dark:border-sky-900/60",
  },
  {
    type: "VIDEO",
    Icon: Clapperboard,
    accentClass: "text-violet-600 dark:text-violet-200",
    badgeClass: "bg-violet-50 border-violet-100 dark:bg-violet-950/40 dark:border-violet-900/60",
  },
  {
    type: "AUDIO",
    Icon: AudioLines,
    accentClass: "text-emerald-600 dark:text-emerald-200",
    badgeClass: "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/60",
  },
];

export default function MediaAttachButton({
  resource,
  allowedTypes = ["IMAGE", "VIDEO", "AUDIO"],
  onChange,
  compact = false,
  label,
  mediaContext,
  deferUpload = false,
  iconOnly = false,
  variant = "default",
  previewImage = false,
}) {
  const { t } = useTranslation();
  const { modal } = App.useApp();
  const [typeOpen, setTypeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(allowedTypes[0] || "IMAGE");
  const triggerLabel = label || t(resource ? "quizMedia.changeMedia" : "quizMedia.addMedia");
  const primaryType = allowedTypes[0] || "IMAGE";
  const primaryOption = TYPE_OPTIONS.find((option) => option.type === primaryType);
  const TriggerIcon =
    allowedTypes.length === 1 && primaryOption ? primaryOption.Icon : ImagePlus;
  const resourceType = resource?.type || primaryType;
  const resourceOption = TYPE_OPTIONS.find((option) => option.type === resourceType) || primaryOption;
  const ResourceIcon = resourceOption?.Icon || ImagePlus;
  const isImageResource =
    !!resource && (resource.type === "IMAGE" || resource.mimeType?.startsWith("image/"));

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

  const handleDetach = () => {
    modal.confirm({
      title: t("quizMedia.detachConfirmTitle"),
      content: t("quizMedia.detachConfirmMessage"),
      okText: t("quizMedia.detach"),
      cancelText: t("quizMedia.cancel"),
      okButtonProps: { danger: true },
      onOk: () => onChange?.({ resourceId: null, resource: null }),
    });
  };

  const renderTrigger = () => {
    if (variant === "answer-image-frame") {
      return (
        <div className="group relative w-full">
          <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
            <button
              type="button"
              onClick={handleClick}
              aria-label={triggerLabel}
              className={`w-full overflow-hidden rounded-2xl border transition-colors ${
                isImageResource
                  ? "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
                  : "border-dashed border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500 dark:hover:bg-slate-800"
              }`}
            >
              {previewImage && isImageResource ? (
                <div className="aspect-[16/9] w-full bg-white dark:bg-slate-900">
                  <img
                    src={resource.fileUrl || resource.embedUrl}
                    alt={resource.title || triggerLabel}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-slate-50 dark:bg-slate-800">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                    <ImageIcon className="h-8 w-8" strokeWidth={1.8} />
                  </div>
                </div>
              )}
            </button>
          </Tooltip>
          {isImageResource ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/40 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
              <button
                type="button"
                aria-label={t("quizMedia.remove")}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDetach();
                }}
                className="pointer-events-auto inline-flex items-center justify-center rounded-lg bg-rose-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-colors hover:bg-rose-600"
              >
                {t("quizMedia.remove")}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (variant === "question-slot") {
      return (
        <div className="relative inline-flex">
          <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
            <button
              type="button"
              onClick={handleClick}
              aria-label={triggerLabel}
              className={`group inline-flex h-14 w-14 items-center justify-center rounded-xl border transition-colors ${
                resource
                  ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-800"
                  : "border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              }`}
            >
              {previewImage && isImageResource ? (
                <img
                  src={resource.fileUrl || resource.embedUrl}
                  alt={resource.title || triggerLabel}
                  className="h-11 w-11 rounded-lg border border-slate-200 dark:border-slate-700 object-cover"
                />
              ) : (
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                    resource
                      ? `${resourceOption?.badgeClass || "bg-slate-50 border-slate-100"} ${resourceOption?.accentClass || "text-slate-600"}`
                      : "border-slate-200 bg-white text-slate-400 group-hover:border-blue-100 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:group-hover:border-blue-900/60 dark:group-hover:text-blue-300"
                  }`}
                >
                  <ResourceIcon className="h-5 w-5" strokeWidth={2} />
                </div>
              )}
            </button>
          </Tooltip>
          {resource ? (
            <button
              type="button"
              aria-label={t("quizMedia.remove")}
              onClick={(event) => {
                event.stopPropagation();
                handleDetach();
              }}
              className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-colors hover:bg-rose-600"
            >
              <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
      );
    }

    const baseIconClasses = compact || iconOnly ? "h-4 w-4" : "h-4 w-4";
    const iconNode = <TriggerIcon className={baseIconClasses} strokeWidth={2} />;

    if (compact || iconOnly) {
      return (
        <Tooltip title={triggerLabel} mouseEnterDelay={0.6} placement="bottom">
          <button
            type="button"
            onClick={handleClick}
            aria-label={triggerLabel}
            className={`inline-flex items-center justify-center rounded-xl border transition-colors ${
              resource
                ? "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/50"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            } ${compact ? "h-9 w-9" : "h-11 w-11"}`}
          >
            {iconNode}
          </button>
        </Tooltip>
      );
    }

    return (
      <Button
        size="middle"
        type={resource ? "primary" : "default"}
        onClick={handleClick}
        className="inline-flex items-center gap-2"
      >
        {iconNode}
        {triggerLabel}
      </Button>
    );
  };

  return (
    <>
      <div className="media-attach-button">
        {renderTrigger()}
      </div>

      <Modal
        open={typeOpen}
        onCancel={() => setTypeOpen(false)}
        footer={null}
        width={520}
        title={t("quizMedia.selectMediaType")}
        destroyOnHidden
        rootClassName="media-attach-type-modal"
      >
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t("quizMedia.selectQuestionMediaType")}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.filter((option) => allowedTypes.includes(option.type)).map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => openPicker(option.type)}
              className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${option.badgeClass} ${option.accentClass}`}
              >
                <option.Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <span className="mt-3 text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
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
        mediaContext={mediaContext}
        deferUpload={deferUpload}
        onCancel={() => setPickerOpen(false)}
        onSelect={(nextResource) => {
          onChange?.(nextResource ? { resourceId: nextResource.id, resource: nextResource } : { resourceId: null, resource: null });
          setPickerOpen(false);
        }}
      />
    </>
  );
}
