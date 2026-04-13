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
  UserOutlined,
} from "@ant-design/icons";
import {
  getAllTeacherEnrollments,
  getAllEnrollments,
  approveEnrollment,
  rejectEnrollment,
  deleteStudentsFromCourse
} from "../../api/enrollment";
import { getTeacherCourses, getAllCourses } from "../../api/classSection";
import AddStudentModal from "../../components/teacher/AddStudentModal";

export default function TeacherStudentManagement({ isAdmin = false }) {
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch enrollments
        const res = isAdmin
          ? await getAllEnrollments(currentPage, pageSize)
          : await getAllTeacherEnrollments(currentPage, pageSize, statusFilter || null);

        console.log("Enrollment Data Response:", res);

        // Backend returns PageResponse directly: { currentPage, totalPage, totalElements, pageList }
        const enrollmentList = (res?.pageList || res?.data?.pageList || []).map((enrollment, index) => ({
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
          enrollmentDate: enrollment.createdAt || enrollment.enrolledAt || new Date().toISOString(),
        }));
        setEnrollments(enrollmentList);
        setTotalEnrollments(res?.totalElements || res?.data?.totalElements || enrollmentList.length);

        try {
          // Fetch ClassSections for filter
          const classesRes = isAdmin
            ? await getAllCourses(1, 1000)
            : await getTeacherCourses(1, 1000);

          // Backend GET /class-sections returns List, not PageResponse
          // After ApiResponse wrapping: { code, message, data: [...] }
          const classListRaw = classesRes?.data?.pageList || classesRes?.data || [];
          const classList = (Array.isArray(classListRaw) ? classListRaw : []).map(cls => ({
            id: cls.id,
            name: cls.title || cls.classSectionName || cls.name || "N/A"
          }));
          setClasses(classList);
        } catch (err) {
          console.error("Failed to fetch classes:", err);
        }
      } catch (err) {
        setError(err.message);
        message.error("Không thể tải dữ liệu học viên");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classFilter, statusFilter, currentPage, isAdmin]);

  const handleApprove = (enrollmentId, studentId, courseId, classSectionId) => {
    Modal.confirm({
      title: "Phê duyệt tham gia lớp học",
      content: "Bạn có chắc muốn cho phép học viên này tham gia lớp học?",
      okText: "Duyệt",
      cancelText: "Hủy",
      async onOk() {
        try {
          await approveEnrollment(studentId, courseId, classSectionId);
          setEnrollments(prev =>
            prev.map(item => item.id === enrollmentId ? { ...item, approvalStatus: "APPROVED" } : item)
          );
          message.success("Đã duyệt học viên!");
        } catch (err) {
          message.error("Lỗi: " + err.message);
        }
      },
    });
  };

  const handleReject = (enrollmentId, studentId, courseId, classSectionId) => {
    Modal.confirm({
      title: "Từ chối yêu cầu",
      content: "Học viên này sẽ không được tham gia lớp học. Bạn có chắc không?",
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await rejectEnrollment(studentId, courseId, classSectionId);
          setEnrollments(prev =>
            prev.map(item => item.id === enrollmentId ? { ...item, approvalStatus: "REJECTED" } : item)
          );
          message.success("Đã từ chối yêu cầu!");
        } catch (err) {
          message.error("Lỗi: " + err.message);
        }
      },
    });
  };

  const statusTags = {
    APPROVED: <Tag color="success" className="rounded-full px-3">Đã duyệt</Tag>,
    PENDING: <Tag color="warning" className="rounded-full px-3">Chờ duyệt</Tag>,
    REJECTED: <Tag color="error" className="rounded-full px-3">Bị từ chối</Tag>,
  };

  const columns = [
    {
      title: "Học viên",
      key: "student",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <CustomAvatar src={record.avatar} className="w-10 h-10 shadow-sm" />
          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-0">{record.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{record.username}</p>
          </div>
        </div>
      ),
    },
    {
      title: "Lớp học",
      dataIndex: "classSectionName",
      key: "classSectionName",
      render: (text) => <span className="font-medium text-primary">{text}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => statusTags[status] || status,
    },
    {
      title: "Ngày tham gia",
      dataIndex: "enrollmentDate",
      key: "enrollmentDate",
      render: (date) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Hành động",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space size="middle">
          {record.approvalStatus === "PENDING" ? (
            <>
              <Button 
                type="link" 
                icon={<CheckOutlined />} 
                className="text-green-600 hover:text-green-700 p-0"
                onClick={() => handleApprove(record.id, record.studentId, record.courseId, record.classSectionId)}
              >
                Duyệt
              </Button>
              <Button 
                type="link" 
                danger 
                icon={<CloseOutlined />} 
                className="p-0"
                onClick={() => handleReject(record.id, record.studentId, record.courseId, record.classSectionId)}
              >
                Từ chối
              </Button>
            </>
          ) : (
            <Button type="text" icon={<EyeOutlined />} className="dark:text-gray-400" />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Học viên</h1>
                <p className="text-gray-500 mt-1">Duyệt và xem danh sách học viên trong các lớp học của bạn.</p>
              </div>
              <Button 
                type="primary" 
                size="large" 
                icon={<UserOutlined />}
                className="h-11 rounded-xl shadow-md px-6 font-bold"
                onClick={() => setIsAddModalVisible(true)}
              >
                Thêm học viên
              </Button>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Tìm kiếm</p>
                  <Input
                    placeholder="Tên học viên hoặc @username..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    className="h-11 rounded-xl border-gray-200 dark:border-gray-700"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Lớp học</p>
                  <Select
                    placeholder="Tất cả lớp học"
                    className="w-full h-11"
                    status="primary"
                    value={classFilter || undefined}
                    onChange={setClassFilter}
                    options={[
                      { label: "Tất cả lớp học", value: "" },
                      ...classes.map(c => ({ label: c.name, value: c.id }))
                    ]}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Trạng thái</p>
                  <Select
                    placeholder="Tất cả trạng thái"
                    className="w-full h-11"
                    value={statusFilter || undefined}
                    onChange={setStatusFilter}
                    options={[
                      { label: "Tất cả trạng thái", value: "" },
                      { label: "Chờ duyệt", value: "PENDING" },
                      { label: "Đã duyệt", value: "APPROVED" },
                      { label: "Bị từ chối", value: "REJECTED" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <Spin spinning={displayLoading}>
                <Table
                  columns={columns}
                  dataSource={enrollments.filter(e => 
                    e.name.toLowerCase().includes(searchText.toLowerCase()) || 
                    e.username.toLowerCase().includes(searchText.toLowerCase())
                  )}
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    onChange: setCurrentPage,
                    total: totalEnrollments,
                    showSizeChanger: false,
                    placement: "bottomCenter",
                  }}
                  className="custom-table"
                />
              </Spin>
            </div>
          </div>
        </main>
      </div>

      <AddStudentModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSuccess={() => {
          setIsAddModalVisible(false);
          currentPage === 1 ? message.success("Đã cập nhật danh sách") : setCurrentPage(1);
        }}
        courses={classes} // Still named courses in modal prop but using ClassSections
      />
    </div>
  );
}
