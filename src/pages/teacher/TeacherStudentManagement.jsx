import React, { useEffect, useMemo, useState } from "react";
import { App, Button, Empty, Input, Modal, Select, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import AppBreadcrumb from "../../components/common/AppBreadcrumb";
import DataPaginationFooter from "../../components/common/DataPaginationFooter";
import UserIdentity from "../../components/common/UserIdentity";
import AddStudentModal from "../../components/teacher/AddStudentModal";
import StudentDetailModal from "../../components/teacher/StudentDetailModal";
import {
  approveEnrollment,
  deleteStudentsFromClassSection,
  getAllEnrollments,
  getAllTeacherEnrollments,
  rejectEnrollment,
} from "../../api/enrollment";
import { getAllCourses, getTeacherCourses } from "../../api/classSection";

const DEFAULT_PAGE_SIZE = 10;
const ACTION_BUTTON_CLASS =
  "border-slate-300! bg-white! text-slate-700! dark:border-slate-600! dark:bg-slate-800! dark:text-slate-200! hover:border-blue-500! hover:text-blue-500! dark:hover:border-blue-400! dark:hover:text-blue-300!";
const DANGER_ACTION_BUTTON_CLASS =
  "border-red-200! bg-white! text-red-600! dark:border-red-900/70! dark:bg-slate-800! dark:text-red-300! hover:border-red-500! hover:text-red-500! dark:hover:border-red-400! dark:hover:text-red-200!";

function normalizeClasses(payload) {
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return items.map((item) => ({
    id: item.id,
    name: item.title || item.classSectionName || item.name || "N/A",
  }));
}

export default function TeacherStudentManagement({ isAdmin = false }) {
  const { message } = App.useApp();
  const { t } = useTranslation();

  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(undefined);
  const [selectedStatus, setSelectedStatus] = useState(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [enrollmentResponse, classesResponse] = await Promise.all([
          isAdmin ? getAllEnrollments(1, 1000) : getAllTeacherEnrollments(1, 1000),
          isAdmin ? getAllCourses(1, 1000) : getTeacherCourses(1, 1000),
        ]);

        const rawEnrollmentItems = enrollmentResponse?.data?.pageList || [];
        setEnrollments(
          rawEnrollmentItems.map((enrollment, index) => ({
            key: enrollment.id || index,
            id: enrollment.id,
            studentId: enrollment.studentId,
            name: enrollment.fullName || enrollment.studentName || "N/A",
            username: enrollment.userName || enrollment.studentUsername || "N/A",
            email: enrollment.email || enrollment.gmail || "N/A",
            avatar: enrollment.studentAvatar || enrollment.avatar || "",
            classSectionName: enrollment.classSectionTitle || enrollment.className || "N/A",
            classSectionId: enrollment.classSectionId,
            courseId: enrollment.courseId,
            progress: enrollment.progress || 0,
            approvalStatus: enrollment.approvalStatus || "APPROVED",
            enrollmentDate: enrollment.createdAt || enrollment.enrolledAt || null,
            studentNumber: enrollment.studentNumber,
            phoneNumber: enrollment.phoneNumber,
            birthday: enrollment.birthday,
            address: enrollment.address,
          }))
        );
        setClasses(normalizeClasses(classesResponse));
      } catch (error) {
        console.error(error);
        message.error(t("teacherLists.students.messages.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin, message, refreshKey, t]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedClassId, selectedStatus, pageSize]);

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return enrollments.filter((item) => {
      const matchesKeyword =
        !keyword ||
        [item.name, item.username, item.email, item.studentNumber, item.classSectionName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesClass = !selectedClassId || item.classSectionId === selectedClassId;
      const matchesStatus = !selectedStatus || item.approvalStatus === selectedStatus;
      return matchesKeyword && matchesClass && matchesStatus;
    });
  }, [enrollments, searchQuery, selectedClassId, selectedStatus]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const selectedRows = useMemo(
    () => filteredItems.filter((item) => selectedRowKeys.includes(item.key)),
    [filteredItems, selectedRowKeys]
  );

  const classOptions = useMemo(
    () => classes.map((item) => ({ value: item.id, label: item.name })),
    [classes]
  );

  const statusOptions = [
    { value: "PENDING", label: t("teacherLists.students.status.pending") },
    { value: "APPROVED", label: t("teacherLists.students.status.approved") },
    { value: "REJECTED", label: t("teacherLists.students.status.rejected") },
  ];

  const openStudentDetail = (record) => {
    setSelectedStudent(record);
    setIsDetailModalVisible(true);
  };

  const handleApprove = (record) => {
    Modal.confirm({
      title: t("teacherLists.students.confirm.approveTitle"),
      content: t("teacherLists.students.confirm.approveDescription", { name: record.name }),
      okText: t("teacherLists.students.actions.approve"),
      cancelText: t("teacherLists.shared.cancel"),
      async onOk() {
        try {
          await approveEnrollment(record.studentId, record.courseId, record.classSectionId);
          message.success(t("teacherLists.students.messages.approveSuccess"));
          setRefreshKey((prev) => prev + 1);
        } catch (error) {
          console.error(error);
          message.error(error?.message || t("teacherLists.students.messages.approveFailed"));
        }
      },
    });
  };

  const handleReject = (record) => {
    Modal.confirm({
      title: t("teacherLists.students.confirm.rejectTitle"),
      content: t("teacherLists.students.confirm.rejectDescription", { name: record.name }),
      okText: t("teacherLists.students.actions.reject"),
      cancelText: t("teacherLists.shared.cancel"),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await rejectEnrollment(record.studentId, record.courseId, record.classSectionId);
          message.success(t("teacherLists.students.messages.rejectSuccess"));
          setRefreshKey((prev) => prev + 1);
        } catch (error) {
          console.error(error);
          message.error(error?.message || t("teacherLists.students.messages.rejectFailed"));
        }
      },
    });
  };

  const handleDeleteStudents = (rows) => {
    if (!rows.length) return;

    Modal.confirm({
      title: t("teacherLists.students.confirm.deleteTitle"),
      content: t("teacherLists.students.confirm.deleteDescription", { count: rows.length }),
      okText: t("teacherLists.shared.delete"),
      cancelText: t("teacherLists.shared.cancel"),
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const grouped = rows.reduce((accumulator, row) => {
            if (!accumulator[row.classSectionId]) {
              accumulator[row.classSectionId] = [];
            }
            accumulator[row.classSectionId].push(row.studentId);
            return accumulator;
          }, {});

          await Promise.all(
            Object.entries(grouped).map(([classSectionId, studentIds]) =>
              deleteStudentsFromClassSection(classSectionId, studentIds)
            )
          );
          message.success(t("teacherLists.students.messages.deleteSuccess"));
          setSelectedRowKeys([]);
          setRefreshKey((prev) => prev + 1);
        } catch (error) {
          console.error(error);
          message.error(error?.message || t("teacherLists.students.messages.deleteFailed"));
        }
      },
    });
  };

  const columns = [
    {
      title: t("teacherLists.students.columns.student"),
      key: "student",
      render: (_, record) => <UserIdentity user={record} variant="student" avatarSizeClass="size-10" />,
    },
    {
      title: t("teacherLists.students.columns.classSection"),
      dataIndex: "classSectionName",
      key: "classSectionName",
      render: (value) => <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</span>,
    },
    {
      title: t("teacherLists.students.columns.status"),
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      width: 140,
      align: "center",
      render: (value) => (
        <Tag color={value === "APPROVED" ? "green" : value === "PENDING" ? "gold" : "red"}>
          {t(`teacherLists.students.status.${String(value || "").toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t("teacherLists.students.columns.enrolledAt"),
      dataIndex: "enrollmentDate",
      key: "enrollmentDate",
      width: 140,
      render: (value) =>
        value ? (
          <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(value).toLocaleDateString("vi-VN")}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      title: t("teacherLists.students.columns.action"),
      key: "action",
      width: 230,
      align: "right",
      render: (_, record) =>
        record.approvalStatus === "PENDING" ? (
          <div className="flex justify-end gap-2">
                            <Button className={ACTION_BUTTON_CLASS} onClick={() => handleApprove(record)}>
                              {t("teacherLists.students.actions.approve")}
                            </Button>
                            <Button danger className={DANGER_ACTION_BUTTON_CLASS} onClick={() => handleReject(record)}>
                              {t("teacherLists.students.actions.reject")}
                            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
                            <Button className={ACTION_BUTTON_CLASS} onClick={() => openStudentDetail(record)}>
                              {t("teacherLists.shared.view")}
                            </Button>
                            <Button danger className={DANGER_ACTION_BUTTON_CLASS} onClick={() => handleDeleteStudents([record])}>
                              {t("teacherLists.shared.delete")}
                            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="teacher-list-page min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            <AppBreadcrumb className="mb-4" />

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="m-0 text-2xl font-bold text-slate-900 dark:text-white">
                      {t("teacherLists.students.title")}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t("teacherLists.students.subtitle")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRows.length > 0 && (
                      <Button danger onClick={() => handleDeleteStudents(selectedRows)}>
                        {t("teacherLists.students.actions.deleteSelected", { count: selectedRows.length })}
                      </Button>
                    )}
                    <Button type="primary" onClick={() => setIsAddModalVisible(true)}>
                      {t("teacherLists.students.actions.add")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_260px_180px]">
                  <Input.Search
                    allowClear
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={t("teacherLists.students.filters.searchPlaceholder")}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedClassId}
                    onChange={(value) => setSelectedClassId(value || undefined)}
                    placeholder={t("teacherLists.students.filters.classPlaceholder")}
                    options={classOptions}
                  />
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    value={selectedStatus}
                    onChange={(value) => setSelectedStatus(value || undefined)}
                    placeholder={t("teacherLists.students.filters.statusPlaceholder")}
                    options={statusOptions}
                  />
                </div>
              </div>

              <div className="px-5 py-4 sm:px-6">
                <div className="hidden md:block">
                  <Table
                    rowSelection={{
                      selectedRowKeys,
                      onChange: (nextKeys) => setSelectedRowKeys(nextKeys),
                      getCheckboxProps: (record) => ({
                        disabled: record.approvalStatus !== "APPROVED",
                      }),
                    }}
                    columns={columns}
                    dataSource={pageItems}
                    rowKey="key"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: <Empty description={t("teacherLists.students.empty")} /> }}
                    className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:font-semibold [&_.ant-table-thead_th]:text-slate-600 dark:[&_.ant-table-thead_th]:bg-slate-800 dark:[&_.ant-table-thead_th]:text-slate-200"
                    scroll={{ x: 960 }}
                  />
                </div>

                <div className="space-y-3 md:hidden">
                  {!loading && pageItems.length === 0 && <Empty description={t("teacherLists.students.empty")} />}
                  {pageItems.map((record) => (
                    <article
                      key={record.key}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <UserIdentity user={record} variant="student" avatarSizeClass="size-10" />
                          <p className="m-0 mt-2 text-sm text-slate-700 dark:text-slate-300">{record.classSectionName}</p>
                          <div className="mt-2">
                            <Tag color={record.approvalStatus === "APPROVED" ? "green" : record.approvalStatus === "PENDING" ? "gold" : "red"}>
                              {t(`teacherLists.students.status.${String(record.approvalStatus || "").toLowerCase()}`)}
                            </Tag>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {record.approvalStatus === "PENDING" ? (
                          <>
            <Button className={ACTION_BUTTON_CLASS} onClick={() => handleApprove(record)}>
              {t("teacherLists.students.actions.approve")}
            </Button>
            <Button danger className={DANGER_ACTION_BUTTON_CLASS} onClick={() => handleReject(record)}>
              {t("teacherLists.students.actions.reject")}
            </Button>
                          </>
                        ) : (
                          <>
            <Button className={ACTION_BUTTON_CLASS} onClick={() => openStudentDetail(record)}>
              {t("teacherLists.shared.view")}
            </Button>
            <Button danger className={DANGER_ACTION_BUTTON_CLASS} onClick={() => handleDeleteStudents([record])}>
              {t("teacherLists.shared.delete")}
            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {!loading && filteredItems.length > 0 && (
                <DataPaginationFooter
                  currentPage={page}
                  pageSize={pageSize}
                  total={filteredItems.length}
                  totalLabel={t("teacherLists.shared.pagination.total", { count: filteredItems.length })}
                  pageSizeLabel={t("teacherLists.shared.pagination.pageSize")}
                  rangeLabel={t("teacherLists.shared.pagination.range", {
                    start: (page - 1) * pageSize + 1,
                    end: Math.min(page * pageSize, filteredItems.length),
                  })}
                  onPageChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <AddStudentModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          setRefreshKey((prev) => prev + 1);
        }}
        courses={classes}
      />

      <StudentDetailModal
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        student={selectedStudent}
      />
    </div>
  );
}
