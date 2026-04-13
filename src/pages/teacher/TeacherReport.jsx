import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getTeacherCourses, getAdminCourses } from "../../api/classSection";
import { 
  approveEnrollment, 
  rejectEnrollment 
} from "../../api/enrollment";
import {
  getCourseGradeBook,
  getCourseApprovedStudents,
  getCoursePendingRequests,
} from "../../api/statistics";
import { Spin, Alert, Table, Tabs, Statistic, Row, Col, Card, Select, App, Space, Button } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import {
  AcademicCapIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export default function TeacherReport({ isAdmin = false }) {
  const navigate = useNavigate();
  const { message: messageApi, modal: modalApi } = App.useApp();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [gradeBook, setGradeBook] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId && activeTab) {
      fetchCourseData();
    }
  }, [selectedCourseId, activeTab]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Use different API based on role (admin gets all courses, teacher gets only their courses)
      const res = isAdmin ? await getAdminCourses(1, 100) : await getTeacherCourses(1, 100);
      
      // res is ApiResponse, res.data is the actual list (since getClassSections returns List<...>)
      const coursesList = res.data || [];
      setCourses(coursesList);
      if (coursesList.length > 0) {
        setSelectedCourseId(coursesList[0].id);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi tải khóa học");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [gradeBookRes, approvedRes, pendingRes] = await Promise.all([
        getCourseGradeBook(null, selectedCourseId),
        getCourseApprovedStudents(null, selectedCourseId, 1, 100),
        getCoursePendingRequests(null, selectedCourseId, 1, 100),
      ]);

      // All Res are now ApiResponse objects { code, message, data }
      setGradeBook(gradeBookRes.data || []);
      
      // approvedRes.data is PageResponse { pageList, ... } or List depending on backend
      // Looking at enrollment/statistics API, it's usually PageResponse for these
      setApprovedStudents(approvedRes.data?.pageList || approvedRes.data || []);
      setPendingRequests(pendingRes.data?.pageList || pendingRes.data || []);
    } catch (err) {
      setError(err.message || "Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (record) => {
    modalApi.confirm({
      title: "Phê duyệt tham gia lớp học",
      content: `Bạn có chắc muốn phê duyệt cho học viên "${record.fullName}" tham gia lớp học này?`,
      okText: "Duyệt",
      cancelText: "Hủy",
      async onOk() {
        try {
          await approveEnrollment(record.studentId, record.courseId, record.classSectionId);
          messageApi.success("Đã duyệt học viên thành công");
          fetchCourseData();
        } catch (err) {
          messageApi.error("Phê duyệt thất bại: " + err.message);
        }
      },
    });
  };

  const handleReject = (record) => {
    modalApi.confirm({
      title: "Từ chối yêu cầu tham gia",
      content: `Yêu cầu tham gia của "${record.fullName}" sẽ bị từ chối. Bạn có chắc chắn không?`,
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await rejectEnrollment(record.studentId, record.courseId, record.classSectionId);
          messageApi.success("Đã từ chối yêu cầu thành công");
          fetchCourseData();
        } catch (err) {
          messageApi.error("Thao tác thất bại: " + err.message);
        }
      },
    });
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  // Tính toán statistics
  const calculateStats = () => {
    const totalStudents = approvedStudents?.length || 0;
    const pendingCount = pendingRequests?.length || 0;
    
    // Tính tổng số bài kiểm tra và điểm trung bình từ gradeBook
    let totalQuizzes = 0;
    let totalGrade = 0;
    let uniqueStudents = new Set();

    if (gradeBook && gradeBook.length > 0) {
      gradeBook.forEach((item) => {
        uniqueStudents.add(item.studentId);
        totalQuizzes += item.maxGrade || 0;
        totalGrade += item.maxGrade || 0;
      });
    }

    const avgScore = totalQuizzes > 0 ? (totalGrade / gradeBook.length).toFixed(2) : 0;
    const completionRate = gradeBook.length > 0 ? "100" : "0"; // Mỗi hàng là một attempt hoàn thành

    return { totalStudents, pendingCount, avgScore, completionRate };
  };

  const stats = calculateStats();

  // Table columns for grade book
  const gradeBookColumns = [
    {
      title: "Sinh viên",
      dataIndex: "studentName",
      key: "studentName",
      sorter: (a, b) => (a.studentName || "").localeCompare(b.studentName || ""),
    },
    {
      title: "Mã sinh viên",
      dataIndex: "studentNumber",
      key: "studentNumber",
      sorter: (a, b) => (a.studentNumber || "").localeCompare(b.studentNumber || ""),
    },
    {
      title: "Tên bài kiểm tra",
      dataIndex: "quizTitle",
      key: "quizTitle",
      sorter: (a, b) => (a.quizTitle || "").localeCompare(b.quizTitle || ""),
    },
    {
      title: "Điểm cao nhất",
      dataIndex: "maxGrade",
      key: "maxGrade",
      sorter: (a, b) => (a.maxGrade || 0) - (b.maxGrade || 0),
    },
  ];

  const approvedColumns = [
    {
      title: "Tên học viên",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => (a.fullName || "").localeCompare(b.fullName || ""),
    },
    {
      title: "Mã sinh viên",
      dataIndex: "studentNumber",
      key: "studentNumber",
      sorter: (a, b) => (a.studentNumber || "").localeCompare(b.studentNumber || ""),
    },
    // {
    //   title: "Tên đăng nhập",
    //   dataIndex: "userName",
    //   key: "userName",
    // },
    {
      title: "Tiến độ",
      dataIndex: "progress",
      key: "progress",
      render: (progress) => `${progress || 0}%`,
      sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
    },
    {
      title: "Trạng thái",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
          {status === "APPROVED" ? "Đã duyệt" : status}
        </span>
      ),
    },
  ];

  const pendingColumns = [
    {
      title: "Tên học viên",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => (a.fullName || "").localeCompare(b.fullName || ""),
    },
    {
      title: "Mã sinh viên",
      dataIndex: "studentNumber",
      key: "studentNumber",
      sorter: (a, b) => (a.studentNumber || "").localeCompare(b.studentNumber || ""),
    },
    // {
    //   title: "Tên đăng nhập",
    //   dataIndex: "userName",
    //   key: "userName",
    // },
    {
      title: "Tiến độ",
      dataIndex: "progress",
      key: "progress",
      render: (progress) => `${progress || 0}%`,
      sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
    },
    {
      title: "Trạng thái",
      dataIndex: "approvalStatus",
      key: "approvalStatus",
      render: (status) => (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
          {status === "PENDING" ? "Chờ duyệt" : status}
        </span>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<CheckOutlined />}
            size="small"
            className="text-green-600 hover:text-green-700 p-0"
            onClick={() => handleApprove(record)}
          >
            Duyệt
          </Button>
          <Button
            type="link"
            danger
            icon={<CloseOutlined />}
            size="small"
            className="p-0"
            onClick={() => handleReject(record)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: "overview",
      label: "Tổng quan",
      children: (
        <div>
          {selectedCourseId && (
            <Row gutter={[16, 16]} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="shadow-sm">
                  <Statistic
                    title="Tổng học viên"
                    value={stats.totalStudents}
                    prefix={<AcademicCapIcon className="h-5 w-5 text-blue-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="shadow-sm">
                  <Statistic
                    title="Yêu cầu chờ duyệt"
                    value={stats.pendingCount}
                    styles={{ content: { color: "#faad14" } }}
                    prefix={<ClockIcon className="h-5 w-5 text-yellow-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="shadow-sm">
                  <Statistic
                    title="Điểm trung bình"
                    value={stats.avgScore}
                    suffix="/ 100"
                    styles={{ content: { color: "#52c41a" } }}
                    prefix={<TrophyIcon className="h-5 w-5 text-green-500" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="shadow-sm">
                  <Statistic
                    title="Tỉ lệ hoàn thành"
                    value={stats.completionRate}
                    suffix="%"
                    styles={{ content: { color: "#1890ff" } }}
                    prefix={<CheckCircleIcon className="h-5 w-5 text-blue-500" />}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </div>
      ),
    },
    {
      key: "grades",
      label: "Bảng điểm",
      children: (
        <Table
          columns={gradeBookColumns}
          dataSource={gradeBook.map((item, idx) => ({ ...item, key: idx }))}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          size="small"
        />
      ),
    },
    {
      key: "approved",
      label: `Học viên đã duyệt (${approvedStudents.length})`,
      children: (
        <Table
          columns={approvedColumns}
          dataSource={approvedStudents.map((item, idx) => ({ ...item, key: item.id || idx }))}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          size="small"
        />
      ),
    },
    {
      key: "pending",
      label: `Yêu cầu chờ duyệt (${pendingRequests.length})`,
      children: (
        <Table
          columns={pendingColumns}
          dataSource={pendingRequests.map((item, idx) => ({ ...item, key: item.id || idx }))}
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered
          size="small"
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <TeacherHeader />

      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}

        <main className={`flex-1 bg-slate-50 dark:bg-slate-900 pt-16 transition-all duration-300 ${
          sidebarCollapsed ? "pl-20" : "pl-64"
        }`}>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl text-[#111418] dark:text-white font-bold leading-tight tracking-[-0.015em]">
                  Báo cáo & Thống kê
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Theo dõi tiến độ học viên và kết quả bài kiểm tra.
                </p>
              </div>
            </div>

            {error && <Alert message="Lỗi" description={error} type="error" showIcon className="mb-6" />}

            {loading && courses.length === 0 ? (
              <div className="flex justify-center py-12">
                <Spin size="large" />
              </div>
            ) : courses.length === 0 ? (
              <Alert
                message="Không có khóa học"
                description="Bạn chưa tạo khóa học nào. Hãy tạo khóa học để xem báo cáo."
                type="info"
                showIcon
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Chọn khóa học
                  </label>
                  <Select
                    value={selectedCourseId}
                    onChange={setSelectedCourseId}
                    style={{ width: "100%", minWidth: 300 }}
                    options={courses.map((course) => ({
                      value: course.id,
                      label: course.title,
                    }))}
                    className="h-10"
                  />
                </div>

                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={tabItems}
                  className="mb-6"
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
