import React, { useEffect, useState } from "react";
import { App, Button, DatePicker, Dropdown, Empty, Form, Input, Modal, Select, Spin } from "antd";
import dayjs from "dayjs";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../../api/announcement";
import { getAdminCourses, getTeacherCourses } from "../../api/classSection";
import { getAllSubjects } from "../../api/subject";
import {
  ArrowPathIcon,
  EllipsisVerticalIcon,
  MegaphoneIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

function unwrapList(response) {
  const data = response?.data || response;
  if (Array.isArray(data)) return data;
  return data?.pageList || [];
}

function formatDate(value) {
  return value ? dayjs(value).format("MMMM D, YYYY") : "";
}

function formatTime(value) {
  return value ? dayjs(value).format("HH:mm") : "";
}

export default function TeacherAnnouncements({ isAdmin = false }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    classSectionId: undefined,
    subjectId: undefined,
    sort: "DESC",
    date: null,
    contentKeyword: "",
  });

  const basePath = isAdmin ? "/admin" : "/teacher";

  useEffect(() => {
    loadCourses();
    loadSubjects();
  }, [isAdmin]);

  useEffect(() => {
    loadAnnouncements();
  }, [filters.classSectionId, filters.subjectId, filters.sort, filters.date, filters.contentKeyword]);

  const loadCourses = async () => {
    try {
      const response = isAdmin ? await getAdminCourses(1, 100) : await getTeacherCourses(1, 100);
      setCourses(unwrapList(response));
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách lớp");
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await getAllSubjects();
      setSubjects(response?.data || response || []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách môn học");
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await getAnnouncements({
        classSectionId: filters.classSectionId,
        subjectId: filters.subjectId,
        contentKeyword: filters.contentKeyword?.trim() || undefined,
        sort: filters.sort,
        date: filters.date ? filters.date.format("YYYY-MM-DD") : undefined,
        pageNumber: 1,
        pageSize: 100,
      });
      const data = response?.data || response;
      setAnnouncements(data?.pageList || []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải announcements");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    form.resetFields();
    if (courses.length > 0) {
      form.setFieldsValue({ classSectionId: courses[0].id });
    }
    setModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setEditing(announcement);
    form.setFieldsValue({
      classSectionId: announcement.classSectionId,
      title: announcement.title,
      summary: announcement.summary,
    });
    setDetailOpen(false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        classSectionId: values.classSectionId,
        title: values.title?.trim(),
        summary: values.summary,
      };
      if (editing) {
        await updateAnnouncement(editing.id, payload);
        message.success("Đã cập nhật announcement");
      } else {
        await createAnnouncement(payload);
        message.success("Đã publish announcement");
      }
      setModalOpen(false);
      await loadAnnouncements();
    } catch (error) {
      if (error?.errorFields) return;
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể lưu announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcement) => {
    try {
      await deleteAnnouncement(announcement.id);
      message.success("Đã xóa announcement");
      setDetailOpen(false);
      await loadAnnouncements();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể xóa announcement");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="mb-5 text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
              <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MegaphoneIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Create Announcement</p>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Notify all students of your course
                    </h2>
                  </div>
                </div>
                <Button type="primary" onClick={openCreateModal}>
                  Add New Announcement
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_180px_220px_1fr_auto] md:items-end">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Môn học / mã học phần
                  </label>
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Tất cả môn học"
                    value={filters.subjectId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, subjectId: value }))}
                    options={subjects.map((subject) => ({
                      value: subject.id,
                      label: [subject.code, subject.title].filter(Boolean).join(" - "),
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Lớp</label>
                  <Select
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Tất cả lớp"
                    value={filters.classSectionId}
                    onChange={(value) => setFilters((prev) => ({ ...prev, classSectionId: value }))}
                    options={courses.map((course) => ({
                      value: course.id,
                      label: [course.title, course.classCode].filter(Boolean).join(" - "),
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Sort By</label>
                  <Select
                    className="w-full"
                    value={filters.sort}
                    onChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))}
                    options={[
                      { value: "DESC", label: "DESC" },
                      { value: "ASC", label: "ASC" },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Date</label>
                  <DatePicker
                    className="w-full"
                    value={filters.date}
                    onChange={(value) => setFilters((prev) => ({ ...prev, date: value }))}
                    format="MMMM D, YYYY"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Search</label>
                  <Input
                    prefix={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
                    placeholder="Search title or summary..."
                    value={filters.contentKeyword}
                    onChange={(event) => setFilters((prev) => ({ ...prev, contentKeyword: event.target.value }))}
                  />
                </div>
                <Button
                  icon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={() => setFilters({
                    classSectionId: undefined,
                    subjectId: undefined,
                    sort: "DESC",
                    date: null,
                    contentKeyword: "",
                  })}
                >
                  Reset
                </Button>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-[180px_1fr_110px_44px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span>Date</span>
                  <span>Announcements</span>
                  <span></span>
                  <span></span>
                </div>
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Spin />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="py-10">
                    <Empty description="No announcements" />
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[180px_1fr_110px_44px] items-center border-t border-slate-200 px-4 py-4 text-sm dark:border-slate-700"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{formatDate(item.createdAt)}</p>
                        <p className="text-slate-500">{formatTime(item.createdAt)}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="truncate text-slate-500">
                          {[item.subjectCode, item.subjectTitle].filter(Boolean).join(" - ") || "Subject"} | {item.classSectionTitle}
                        </p>
                      </div>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelected(item);
                          setDetailOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "edit", label: "Edit" },
                            { key: "delete", label: "Delete", danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === "edit") openEditModal(item);
                            if (key === "delete") handleDelete(item);
                          },
                        }}
                      >
                        <button className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>
                      </Dropdown>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? "Update" : "Publish"}
        cancelText="Cancel"
        confirmLoading={submitting}
        title={editing ? "Edit Announcement" : "Create Announcement"}
        width={760}
      >
        <div className="mt-4 border-y border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
          <Form form={form} layout="vertical">
            <Form.Item
              name="classSectionId"
              label="Select Course"
              rules={[{ required: true, message: "Please select a course" }]}
            >
              <Select
                placeholder="Select Course"
                showSearch
                optionFilterProp="label"
                options={courses.map((course) => ({
                  value: course.id,
                  label: [course.title, course.classCode].filter(Boolean).join(" - "),
                }))}
              />
            </Form.Item>
            <Form.Item
              name="title"
              label="Announcement Title"
              rules={[{ required: true, message: "Please enter announcement title" }]}
            >
              <Input placeholder="Announcement title" />
            </Form.Item>
            <Form.Item name="summary" label="Summary">
              <Input.TextArea rows={8} placeholder="Summary..." />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={selected ? [
          <Button key="cancel" onClick={() => setDetailOpen(false)}>Cancel</Button>,
          <Button key="delete" danger onClick={() => handleDelete(selected)}>Delete</Button>,
          <Button key="edit" type="primary" onClick={() => openEditModal(selected)}>Edit</Button>,
        ] : null}
        width={760}
        title={null}
      >
        {selected && (
          <div className="space-y-6 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MegaphoneIcon className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{selected.title}</h2>
              <p className="mt-5 whitespace-pre-wrap text-lg leading-8 text-slate-600 dark:text-slate-300">
                {selected.summary}
              </p>
            </div>
            <div className="grid border-t border-slate-200 pt-6 sm:grid-cols-2 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300">Course</p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{selected.classSectionTitle}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-300">Published Date</p>
                <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {selected.createdAt ? dayjs(selected.createdAt).format("MMMM D, YYYY, HH:mm") : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
