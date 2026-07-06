import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Button, Empty, Modal, Popconfirm, Spin } from "antd";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { getAnnouncementById, getAnnouncements } from "../../api/announcement";

export default function AnnouncementsTab({ classSectionId: propClassSectionId, canManage = false, onEdit, onDelete }) {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const classSectionId = propClassSectionId || params.id || params.classSectionId;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const announcementIdFromUrl = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("announcementId");
  }, [location.search]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!classSectionId) return;
      try {
        setLoading(true);
        const res = await getAnnouncements({
          classSectionId,
          sort: "DESC",
          pageNumber: 1,
          pageSize: 20,
        });
        const page = res?.data;
        setAnnouncements(page?.pageList || []);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, [classSectionId]);

  useEffect(() => {
    const openLinkedAnnouncement = async () => {
      if (!announcementIdFromUrl) return;
      try {
        const res = await getAnnouncementById(announcementIdFromUrl);
        setSelected(res?.data);
        setDetailOpen(true);
      } catch {
        const fallback = announcements.find((item) => String(item.id) === String(announcementIdFromUrl));
        if (fallback) {
          setSelected(fallback);
          setDetailOpen(true);
        }
      }
    };
    openLinkedAnnouncement();
  }, [announcementIdFromUrl, announcements]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }

  if (!announcements.length) {
    return <Empty description="Chưa có thông báo lớp học" />;
  }

  return (
    <>
      <div className="space-y-5!">
        {announcements.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelected(item);
              setDetailOpen(true);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-primary/50 hover:shadow-sm dark:border-slate-700 dark:bg-gray-800"
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MegaphoneIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <span className="text-xs text-slate-500">
                    {item.createdAt ? dayjs(item.createdAt).format("HH:mm DD/MM/YYYY") : ""}
                  </span>
                </div>
                {item.summary && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
        title={null}
      >
        {selected && (
          <div className="space-y-6 py-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MegaphoneIcon className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selected.title}</h2>
              {selected.summary && (
                <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-600 dark:text-slate-300">
                  {selected.summary}
                </p>
              )}
            </div>
            <div className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-500">Lớp</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">{selected.classSectionTitle}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Thời điểm thông báo</p>
                <p className="mt-1 font-bold text-slate-900 dark:text-white">
                  {selected.createdAt ? dayjs(selected.createdAt).format("HH:mm DD/MM/YYYY") : ""}
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <Popconfirm
                  title={t("teaching.classDetail.announcements.deleteConfirm")}
                  okText={t("teaching.classDetail.announcements.delete")}
                  cancelText={t("teaching.classDetail.announcements.cancel")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => {
                    onDelete?.(selected);
                    setDetailOpen(false);
                  }}
                >
                  <Button danger>{t("teaching.classDetail.announcements.delete")}</Button>
                </Popconfirm>
                <Button
                  type="primary"
                  onClick={() => {
                    setDetailOpen(false);
                    onEdit?.(selected);
                  }}
                >
                  {t("teaching.classDetail.announcements.edit")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
