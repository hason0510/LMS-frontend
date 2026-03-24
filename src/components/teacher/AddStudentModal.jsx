import React, { useState, useEffect } from "react";
import { Modal, Form, Select, Input, Button, message, Spin, Table, Checkbox, Space, Alert } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { getStudentsNotInCourse, addStudentsToCourse } from "../../api/course";
import CustomAvatar from "../common/Avatar";

export default function AddStudentModal({ visible, onClose, onSuccess, courses }) {
  const [form] = Form.useForm();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const pageSize = 10;

  // Fetch available students when course is selected or search text changes
  useEffect(() => {
    if (selectedCourse) {
      fetchAvailableStudents();
    }
  }, [selectedCourse, searchText, currentPage]);

  const fetchAvailableStudents = async () => {
    try {
      setLoading(true);
      const searchRequest = {};
      if (searchText) {
        searchRequest.fullName = searchText;
      }
      const res = await getStudentsNotInCourse(selectedCourse, searchRequest, currentPage, pageSize);
      const studentList = res.data.pageList.map((student) => ({
        id: student.id,
        key: student.id,
        fullName: student.fullName || "N/A",
        username: student.userName || "N/A",
        email: student.gmail || "N/A",
        avatar: student.avatar || "",
      }));
      setAvailableStudents(studentList);
      setTotalStudents(res.data.totalElements || 0);
    } catch (err) {
      console.log("Failed to fetch available students:", err);
      message.error("Không thể tải danh sách học viên");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allStudentIds = availableStudents.map((s) => s.id);
      setSelectedStudents((prev) => [
        ...new Set([...prev, ...allStudentIds]),
      ]);
    } else {
      // Deselect all from current page
      const currentPageIds = availableStudents.map((s) => s.id);
      setSelectedStudents((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    }
  };

  const handleAddStudents = async () => {
    if (!selectedCourse) {
      message.error("Vui lòng chọn khóa học");
      return;
    }

    if (selectedStudents.length === 0) {
      message.error("Vui lòng chọn ít nhất một học viên");
      return;
    }

    try {
      setLoading(true);
      await addStudentsToCourse(selectedCourse, selectedStudents);
      message.success(`Đã thêm ${selectedStudents.length} học viên vào khóa học`);
      
      // Reset form
      form.resetFields();
      setSelectedCourse(null);
      setSelectedStudents([]);
      setSearchText("");
      setCurrentPage(1);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.log("Failed to add students:", err);
      message.error(err.message || "Thêm học viên thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedCourse(null);
    setSelectedStudents([]);
    setSearchText("");
    setCurrentPage(1);
    onClose();
  };

  const columns = [
    {
      title: (
        <Checkbox
          onChange={(e) => handleSelectAll(e.target.checked)}
          checked={
            availableStudents.length > 0 &&
            availableStudents.every((s) => selectedStudents.includes(s.id))
          }
          indeterminate={
            selectedStudents.length > 0 &&
            !availableStudents.every((s) => selectedStudents.includes(s.id))
          }
        />
      ),
      key: "checkbox",
      width: 50,
      render: (_, record) => (
        <Checkbox
          onChange={() => handleStudentSelection(record.id)}
          checked={selectedStudents.includes(record.id)}
        />
      ),
    },
    {
      title: "Họ và tên",
      key: "fullName",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <CustomAvatar size="small" src={record.avatar} name={record.fullName} />
          <span>{record.fullName}</span>
        </div>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
  ];

  return (
    <Modal
      title="Thêm học viên vào khóa học"
      open={visible}
      onCancel={handleCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleAddStudents}
          disabled={selectedStudents.length === 0 || !selectedCourse}
        >
          Thêm {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ""}
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          {/* Select Course */}
          <Form.Item label="Chọn khóa học" required>
            <Select
              placeholder="Chọn một khóa học"
              value={selectedCourse}
              onChange={(value) => {
                setSelectedCourse(value);
                setSelectedStudents([]);
                setSearchText("");
                setCurrentPage(1);
              }}
              options={courses.map((course) => ({
                value: course.id,
                label: course.name,
              }))}
            />
          </Form.Item>

          {/* Search Students */}
          {selectedCourse && (
            <Form.Item label="Tìm kiếm học viên">
              <Input
                placeholder="Tìm kiếm theo tên..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </Form.Item>
          )}

          {/* Students Table */}
          {selectedCourse && (
            <Form.Item>
              {selectedStudents.length > 0 && (
                <Alert
                  message={`Đã chọn ${selectedStudents.length} học viên`}
                  type="info"
                  style={{ marginBottom: "16px" }}
                  showIcon
                />
              )}
              <Table
                columns={columns}
                dataSource={availableStudents}
                loading={loading}
                pagination={{
                  current: currentPage,
                  pageSize: pageSize,
                  total: totalStudents,
                  onChange: (page) => setCurrentPage(page),
                }}
                size="small"
                bordered
              />
            </Form.Item>
          )}
        </Form>
      </Spin>
    </Modal>
  );
}
