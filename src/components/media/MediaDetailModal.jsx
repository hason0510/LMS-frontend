import React from "react";
import { Button, Grid, Input, Modal, Spin, Tag } from "antd";
import { useTranslation } from "react-i18next";
import ResourceRenderer from "./ResourceRenderer";
import { getDisplayFileType } from "../../utils/fileUtils";

function DetailSection({ title, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</div>
      {children}
    </section>
  );
}

function DetailField({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value || "-"}</div>
    </div>
  );
}

const visibilityTagColors = {
  PRIVATE: "default",
  SHARED: "blue",
  INSTITUTION: "gold",
};

const statusTagColors = {
  ACTIVE: "green",
  ARCHIVED: "orange",
};

export default function MediaDetailModal({
  open,
  resource,
  editTitle,
  editDescription,
  onClose,
  onEditTitleChange,
  onEditDescriptionChange,
  onSave,
  onToggleStatus,
  onDelete,
  canManage,
  canDelete,
  detailsLoading,
  references,
  auditLogs,
  locale,
  typeLabels,
  visibilityLabels,
  formatBytes,
  formatScopeDisplay,
  formatScopeTarget,
  formatSourceLabel,
}) {
  const { t } = useTranslation();
  const screens = Grid.useBreakpoint();

  if (!resource) {
    return null;
  }

  const visibilityValue = visibilityLabels[resource.visibility] || "-";
  const scopeDisplay = formatScopeDisplay(resource);
  const scopeTarget = formatScopeTarget(resource);
  const sourceValue = formatSourceLabel(resource.source);
  const createdDate = resource.createdDate ? new Date(resource.createdDate).toLocaleDateString(locale) : "-";
  const lastUsedAt = resource.lastUsedAt ? new Date(resource.lastUsedAt).toLocaleString(locale) : "-";
  const displayFileType = getDisplayFileType(resource);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={screens.lg ? 1120 : "calc(100vw - 16px)"}
      title={t("mediaManager.detail.title")}
      styles={{
        body: {
          padding: screens.lg ? 24 : 16,
        },
      }}
    >
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-1">
        <div className="mb-4 flex flex-wrap gap-2">
          <Tag>{displayFileType}</Tag>
          <Tag color="blue">{scopeDisplay}</Tag>
          <Tag color={visibilityTagColors[resource.visibility] || "default"}>{visibilityValue}</Tag>
          <Tag color={statusTagColors[resource.status] || "default"}>
            {t(`mediaManager.status.${resource.status || "ACTIVE"}`)}
          </Tag>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.95fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <ResourceRenderer resource={resource} className="m-0" />
            </section>

            <DetailSection title={t("mediaManager.sections.content")}>
              <div className="flex flex-col gap-4">
                <Input
                  value={editTitle}
                  onChange={(event) => onEditTitleChange(event.target.value)}
                  placeholder={t("mediaManager.fields.title")}
                  disabled={!canManage}
                />
                <Input.TextArea
                  value={editDescription}
                  onChange={(event) => onEditDescriptionChange(event.target.value)}
                  placeholder={t("mediaManager.fields.description")}
                  rows={5}
                  disabled={!canManage}
                />
              </div>
            </DetailSection>

            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              {canManage ? (
                <Button type="primary" onClick={onSave}>
                  {t("mediaManager.actions.save")}
                </Button>
              ) : null}
              {canManage ? (
                resource.status === "ARCHIVED" ? (
                  <Button onClick={() => onToggleStatus("ACTIVE")}>{t("mediaManager.actions.restore")}</Button>
                ) : (
                  <Button onClick={() => onToggleStatus("ARCHIVED")}>{t("mediaManager.actions.archive")}</Button>
                )
              ) : null}
              {canManage ? (
                <Button danger onClick={onDelete} disabled={!canDelete}>
                  {t("mediaManager.actions.delete")}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <DetailSection title={t("mediaManager.sections.information")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("mediaManager.fields.type")} value={displayFileType} />
                <DetailField label={t("mediaManager.fields.size")} value={formatBytes(resource.fileSize)} />
                <DetailField label={t("mediaManager.fields.source")} value={sourceValue} />
                <DetailField label={t("mediaManager.fields.createdDate")} value={createdDate} />
                <DetailField label={t("mediaManager.fields.owner")} value={resource.createdBy || "-"} />
                <DetailField label={t("mediaManager.fields.lastUsedAt")} value={lastUsedAt} />
                <DetailField label={t("mediaManager.fields.scope")} value={scopeDisplay} />
                <DetailField label={t("mediaManager.fields.scopeTarget")} value={scopeTarget} />
                <DetailField label={t("mediaManager.fields.visibility")} value={visibilityValue} />
                <DetailField label={t("mediaManager.fields.status")} value={t(`mediaManager.status.${resource.status || "ACTIVE"}`)} />
              </div>
            </DetailSection>

            <DetailSection title={t("mediaManager.sections.usage")}>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label={t("mediaManager.fields.usageCount")} value={String(resource.usageCount || references.length || 0)} />
                </div>
                {detailsLoading ? (
                  <div className="flex justify-center py-6">
                    <Spin />
                  </div>
                ) : references.length > 0 ? (
                  <div className="space-y-3">
                    {references.map((item, index) => (
                      <article
                        key={`${item.entityType}-${item.entityId}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                      >
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label || "-"}</div>
                        {item.contextPath ? (
                          <div className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.contextPath}</div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t("mediaManager.references.empty")}</div>
                )}
              </div>
            </DetailSection>

            <DetailSection title={t("mediaManager.sections.history")}>
              {detailsLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {t(`mediaManager.auditActions.${item.actionType}`, item.actionType)}
                        {item.actorUsername ? t("mediaManager.audit.byActor", { actor: item.actorUsername }) : ""}
                      </div>
                      {item.summary ? (
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.summary}</div>
                      ) : null}
                      {item.createdDate ? (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.createdDate).toLocaleString(locale)}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">{t("mediaManager.audit.empty")}</div>
              )}
            </DetailSection>
          </div>
        </div>
      </div>
    </Modal>
  );
}
