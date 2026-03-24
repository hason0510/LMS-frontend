import React, { useState, useEffect } from "react";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { Table, Input, Select, Button, Space, Tag, Modal, Breadcrumb, Spin, message } from "antd";
import CustomAvatar from "../../components/common/Avatar";
import {
  SearchOutlined,
  EyeOutlined,
  MessageOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { getTeacherEnrollments, getAllEnrollments, approveEnrollment, rejectEnrollment, deleteStudentsFromCourse, getStudentsNotInCourse, addStudentsToCourse, getTeacherCourses, getAllCourses } from "../../api/course";
import AddStudentModal from "../../components/teacher/AddStudentModal";

export default function TeacherStudentManagement({ isAdmin = false }) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pageSize = 10;

  // Track sidebar collapse state
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debounce loading state to avoid spinner flash for quick loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setDisplayLoading(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDisplayLoading(false);
    }
  }, [loading]);

  // Fetch enrollments with filters
  useEffect(() => {
    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use different API based on role (admin gets all enrollments, teacher gets only their enrollments)
        const res = isAdmin
          ? await getAllEnrollments(currentPage, pageSize)
          : await getTeacherEnrollments(currentPage, pageSize, courseFilter || null, statusFilter || null);
        const enrollmentList = (res.data.pageList).map((enrollment, index) => ({
          key: enrollment.id || index,
          id: enrollment.id,
          studentId: enrollment.studentId,
          name: enrollment.fullName || "N/A",
          username: enrollment.userName || "N/A",
          email: enrollment.userName || "N/A",
          avatar: enrollment.studentAvatar || "",
          course: enrollment.courseTitle || "N/A",
          courseId: enrollment.courseId || "",
          courseCode: enrollment.courseCode || "",
          progress: enrollment.progress || 0,
          approvalStatus: enrollment.approvalStatus || "PENDING",
          enrollmentDate: enrollment.createdAt || new Date().toISOString(),
        }));
        setEnrollments(enrollmentList);
        
        // Fetch courses from API instead of extracting from enrollmentList
        try {
          const coursesRes = isAdmin
            ? await getAllCourses(1, 1000)
            : await getTeacherCourses(1, 1000);
          const courseList = (coursesRes.data?.pageList || []).map(course => ({
            id: course.id,
            name: course.title || course.name || "N/A"
          }));
          setCourses(courseList);
        } catch (courseErr) {
          console.log("Failed to fetch courses:", courseErr);
          setCourses([]);
        }
      } catch (err) {
        console.log("Failed to fetch enrollments:", err);
        setError(err.message);
        message.error("Không thể tải dữ liệu học viên");
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [courseFilter, statusFilter, currentPage]);

  const handleApprove = (enrollmentId, studentId, courseId) => {
    Modal.confirm({
      title: "Duyệt đơn đăng ký",
      content: "Bạn có chắc chắn muốn duyệt học viên này?",
      okText: "Duyệt",
      cancelText: "Hủy",
      okButtonProps: { type: "primary" },
      async onOk() {
        try {
          await approveEnrollment(studentId, courseId);
          setEnrollments((prev) =>
            prev.map((e) =>
              e.id === enrollmentId ? { ...e, approvalStatus: "APPROVED" } : e
            )
          );
          message.success("Duyệt học viên thành công!");
        } catch (err) {
          message.error(err.message || "Lỗi khi duyệt học viên");
        }
      },
    });
  };

  const handleReject = (enrollmentId, studentId, courseId) => {
    Modal.confirm({
      title: "Từ chối đơn đăng ký",
      content: "Bạn có chắc chắn muốn từ chối học viên này?",
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { type: "primary", danger: true },
      async onOk() {
        try {
          await rejectEnrollment(studentId, courseId);
          setEnrollments((prev) =>
            prev.map((e) =>
              e.id === enrollmentId ? { ...e, approvalStatus: "REJECTED" } : e
            )
          );
          message.success("Từ chối học viên thành công!");
        } catch (err) {
          message.error(err.message || "Lỗi khi từ chối học viên");
        }
      },
    });
  };

  const handleDelete = (enrollmentRecord) => {
    Modal.confirm({
      title: "Xóa học viên",
      content: "Bạn có chắc chắn muốn xóa học viên khỏi khóa học?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { type: "primary", danger: true },
      async onOk() {
        try {
          setLoading(true);
          await deleteStudentsFromCourse(enrollmentRecord.courseId, [enrollmentRecord.studentId]);
          setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentRecord.id));
          message.success("Xóa học viên thành công!");
        } catch (err) {
          message.error(err.message || "Lỗi khi xóa học viên");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Bulk actions
  const handleBulkApprove = () => {
    if (selectedRows.length === 0) {
      message.warning("Vui lòng chọn ít nhất một học viên");
      return;
    }

    Modal.confirm({
      title: "Duyệt hàng loạt",
      content: `Bạn có chắc chắn muốn duyệt ${selectedRows.length} học viên đã chọn?`,
      okText: "Duyệt",
      cancelText: "Hủy",
      okButtonProps: { type: "primary" },
      async onOk() {
        try {
          setLoading(true);
          const selectedEnrollments = enrollments.filter((e) => selectedRows.includes(e.key));
          
          // Perform approve for each selected enrollment
          for (const enrollment of selectedEnrollments) {
            await approveEnrollment(enrollment.studentId, enrollment.courseId);
          }
          
          setEnrollments((prev) =>
            prev.map((e) =>
              selectedRows.includes(e.key) ? { ...e, approvalStatus: "APPROVED" } : e
            )
          );
          setSelectedRows([]);
          message.success(`Đã duyệt ${selectedRows.length} học viên thành công!`);
        } catch (err) {
          message.error(err.message || "Lỗi khi duyệt học viên");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBulkReject = () => {
    if (selectedRows.length === 0) {
      message.warning("Vui lòng chọn ít nhất một học viên");
      return;
    }

    Modal.confirm({
      title: "Từ chối hàng loạt",
      content: `Bạn có chắc chắn muốn từ chối ${selectedRows.length} học viên đã chọn?`,
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { type: "primary", danger: true },
      async onOk() {
        try {
          setLoading(true);
          const selectedEnrollments = enrollments.filter((e) => selectedRows.includes(e.key));
          
          for (const enrollment of selectedEnrollments) {
            await rejectEnrollment(enrollment.studentId, enrollment.courseId);
          }
          
          setEnrollments((prev) =>
            prev.map((e) =>
              selectedRows.includes(e.key) ? { ...e, approvalStatus: "REJECTED" } : e
            )
          );
          setSelectedRows([]);
          message.success(`Đã từ chối ${selectedRows.length} học viên thành công!`);
        } catch (err) {
          message.error(err.message || "Lỗi khi từ chối học viên");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) {
      message.warning("Vui lòng chọn ít nhất một học viên");
      return;
    }

    Modal.confirm({
      title: "Xóa hàng loạt",
      content: `Bạn có chắc chắn muốn xóa ${selectedRows.length} học viên đã chọn khỏi khóa học?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { type: "primary", danger: true },
      async onOk() {
        try {
          setLoading(true);
          const selectedEnrollments = enrollments.filter((e) => selectedRows.includes(e.key));
          
          // Group by courseId to delete in batches per course
          const groupedByCourse = {};
          selectedEnrollments.forEach((enrollment) => {
            if (!groupedByCourse[enrollment.courseId]) {
              groupedByCourse[enrollment.courseId] = [];
            }
            groupedByCourse[enrollment.courseId].push(enrollment.studentId);
          });
          
          // Delete students from each course
          for (const [courseId, studentIds] of Object.entries(groupedByCourse)) {
            await deleteStudentsFromCourse(parseInt(courseId), studentIds);
          }
          
          setEnrollments((prev) =>
            prev.filter((e) => !selectedRows.includes(e.key))
          );
          setSelectedRows([]);
          message.success(`Đã xóa ${selectedRows.length} học viên thành công!`);
        } catch (err) {
          message.error(err.message || "Lỗi khi xóa học viên");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Validate selected enrollments status
  const getSelectedEnrollmentsStatus = () => {
    if (selectedRows.length === 0) return null;
    
    const selectedEnrollments = enrollments.filter((e) => selectedRows.includes(e.key));
    const statuses = new Set(selectedEnrollments.map((e) => e.approvalStatus));
    
    // All selected are PENDING
    if (statuses.size === 1 && statuses.has("PENDING")) {
      return "PENDING";
    }
    
    // All selected are APPROVED
    if (statuses.size === 1 && statuses.has("APPROVED")) {
      return "APPROVED";
    }
    
    // Mixed statuses
    return "MIXED";
  };

  const getStatusTag = (approvalStatus) => {
    const statusConfig = {
      APPROVED: {
        color: "green",
        text: "Đã duyệt",
      },
      PENDING: {
        color: "orange",
        text: "Chờ duyệt",
      },
      REJECTED: {
        color: "red",
        text: "Bị từ chối",
      },
    };

    const config = statusConfig[approvalStatus] || statusConfig.PENDING;
    return (
      <Tag
        color={config.color}
        style={{ borderRadius: "20px" }}
      >
        {config.text}
      </Tag>
    );
  };

  const getProgressColor = (progress) => {
    if (progress === 100) return "#22c55e";
    if (progress >= 50) return "#137fec";
    return "#9ca3af";
  };

  const columns = [
    {
      title: "Học viên",
      dataIndex: "name",
      key: "name",
      width: 280,
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <CustomAvatar
            src={record.avatar}
            alt={record.name}
            className="w-10 h-10"
          />
          <div className="flex flex-col min-w-0">
            <p className="font-bold text-sm truncate text-[#111418] dark:text-white">
              {text}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {record.username}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Khóa học",
      dataIndex: "course",
      key: "course",
      width: 200,
      render: (text, record) => (
        <div className="flex flex-col">
          <p className="text-md font-bold text-[#111418] dark:text-white">
            {text}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            #{record.courseCode}
          </p>
        </div>
      ),
    },
    {
      title: "Tiến độ",
      dataIndex: "progress",
      key: "progress",
      width: 150,
      render: (progress) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex-shrink-0">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: getProgressColor(progress),
              }}
            ></div>
          </div>
          <span className="text-xs font-medium text-[#111418] dark:text-white min-w-fit">
            {progress}%
          </span>
        </div>
      ),
    },
    {
      title: "Trạng thái duyệt",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      width: 140,
      render: (approvalStatus) => getStatusTag(approvalStatus),
    },
    {
      title: "Ngày đăng ký",
      dataIndex: "enrollmentDate",
      key: "enrollmentDate",
      width: 150,
      render: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString("vi-VN");
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      align: "right",
      render: (_, record) => {
        if (record.approvalStatus === "PENDING") {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id, record.studentId, record.courseId)}
                style={{ borderRadius: "6px" }}
              >
                Duyệt
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleReject(record.id, record.studentId, record.courseId)}
                style={{
                  borderRadius: "6px",
                  backgroundColor: "#ff4d4f",
                  borderColor: "#ff4d4f",
                  color: "white",
                }}
              >Từ chối</Button>
            </Space>
          );
        }

        return (
          <Space>
            <Button
              type="text"
              size="large"
              icon={<EyeOutlined />}
              title="Xem chi tiết"
              style={{ borderRadius: "6px" }}
            />
            <Button
              type="text"
              size="large"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              title="Xóa khỏi khóa học"
              style={{ borderRadius: "6px" }}
            />
          </Space>
        );
      },
    },
  ];

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchSearch =
      enrollment.name.toLowerCase().includes(searchText.toLowerCase()) ||
      enrollment.username.toLowerCase().includes(searchText.toLowerCase());

    return matchSearch;
  });

  const handleAddStudentsSuccess = async () => {
    setIsAddModalVisible(false);
    message.success("Thêm học viên vào khóa học thành công!");
    // Refresh the enrollments list
    setCurrentPage(1);
    try {
      setLoading(true);
      // Use different API based on role
      const res = isAdmin
        ? await getAllEnrollments(1, pageSize)
        : await getTeacherEnrollments(1, pageSize, courseFilter || null, statusFilter || null);
      const enrollmentList = (res.data.pageList).map((enrollment, index) => ({
        key: enrollment.id || index,
        id: enrollment.id,
        studentId: enrollment.studentId,
        name: enrollment.fullName || "N/A",
        username: enrollment.userName || "N/A",
        email: enrollment.userName || "N/A",
        avatar: enrollment.studentAvatar || "",
        course: enrollment.courseTitle || "N/A",
        courseId: enrollment.courseId || "",
        courseCode: enrollment.courseCode || "",
        progress: enrollment.progress || 0,
        approvalStatus: enrollment.approvalStatus || "PENDING",
        enrollmentDate: enrollment.createdAt || new Date().toISOString(),
      }));
      setEnrollments(enrollmentList);
    } catch (err) {
      console.log("Failed to refresh enrollments:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Header */}
      <TeacherHeader />

      <div className="flex">
        {/* Sidebar - Admin or Teacher */}
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}

        {/* Main Content */}
        <main className={`flex-1 pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight">
                Quản lý Học viên
              </h1>
              <Button
                type="primary"
                size="large"
                icon={<span style={{ marginRight: "8px" }}>+</span>}
                onClick={() => setIsAddModalVisible(true)}
              >
                Thêm học viên
              </Button>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row gap-2 items-end">
                <Input
                  placeholder="Tìm kiếm theo tên sinh viên..."
                  prefix={<SearchOutlined />}
                  value={searchText}    
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ flex: 2 }}
                  className="h-10"
                />
                <Select
                  placeholder="Tất cả khóa học"
                  value={courseFilter || undefined}
                  onChange={(val) => {
                    setCourseFilter(val);
                    setCurrentPage(1);
                  }}
                  style={{ flex: 1 }}
                  className="h-10"
                  options={[
                    { label: "Tất cả khóa học", value: "" },
                    ...courses.map(c => ({ label: c.name, value: c.id })),
                  ]}
                />
                <Select
                  placeholder="Trạng thái duyệt"
                  value={statusFilter || undefined}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                  style={{ flex: 1 }}
                  className="h-10"
                  options={[
                    { label: "Tất cả trạng thái", value: "" },
                    { label: "Chờ duyệt", value: "PENDING" },
                    { label: "Đã duyệt", value: "APPROVED" },
                    { label: "Bị từ chối", value: "REJECTED" },
                  ]}
                />
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedRows.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                {getSelectedEnrollmentsStatus() === "MIXED" ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        ⚠️ Không thể thực hiện hành động chung. Các bản ghi được chọn có trạng thái khác nhau.
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Vui lòng chỉ chọn các bản ghi có cùng trạng thái duyệt.
                      </p>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => setSelectedRows([])}
                    >
                      Bỏ chọn
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Đã chọn {selectedRows.length} học viên
                    </span>
                    <Space>
                      {getSelectedEnrollmentsStatus() === "PENDING" && (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            icon={<CheckOutlined />}
                            onClick={handleBulkApprove}
                            loading={loading}
                          >
                            Duyệt tất cả
                          </Button>
                          <Button
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={handleBulkReject}
                            loading={loading}
                            style={{
                              backgroundColor: "#ff4d4f",
                              borderColor: "#ff4d4f",
                              color: "white",
                            }}
                          >
                            Từ chối tất cả
                          </Button>
                        </>
                      )}
                      {getSelectedEnrollmentsStatus() === "APPROVED" && (
                        <Button
                          danger
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={handleBulkDelete}
                          loading={loading}
                        >
                          Xóa tất cả
                        </Button>
                      )}
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setSelectedRows([])}
                      >
                        Bỏ chọn
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-[#1a2632] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Spin spinning={displayLoading} tip="Đang tải...">
                <Table
                  columns={columns}
                  dataSource={filteredEnrollments}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    onChange: (page) => setCurrentPage(page),
                    showTotal: (total, range) =>
                      `Hiển thị ${range[0]} đến ${range[1]} trong tổng số ${total} học viên`,
                    position: ["bottomCenter"],
                  }}
                  rowSelection={{
                    selectedRowKeys: selectedRows,
                    onChange: (keys) => setSelectedRows(keys),
                  }}
                  scroll={{ x: 1200 }}
                  className="dark:bg-[#1a2632]"
                  style={{
                    borderColor: "transparent",
                  }}
                />
              </Spin>
            </div>

            {/* Add Student Modal */}
            <AddStudentModal
              visible={isAddModalVisible}
              onClose={() => setIsAddModalVisible(false)}
              onSuccess={handleAddStudentsSuccess}
              courses={courses}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
