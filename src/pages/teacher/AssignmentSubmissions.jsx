import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, InputNumber, Modal, Spin, Switch, Table } from "antd";
import dayjs from "dayjs";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getAssignmentById } from "../../api/assignment";
import { getAssignmentSubmissions, gradeSubmission, returnSubmission } from "../../api/submission";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link", "clean"],
  ],
};

const quillFormats = ["header", "bold", "italic", "underline", "list", "bullet", "link"];

function formatSubmissionTime(value) {
  if (!value) return "Chưa nộp";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

export default function AssignmentSubmissions({ isAdmin = false }) {
  const { classSectionId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const basePath = isAdmin ? "/admin" : "/teacher";

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grading, setGrading] = useState(false);
  const [gradeValue, setGradeValue] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [returnToStudent, setReturnToStudent] = useState(false);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [assignmentResponse, submissionsResponse] = await Promise.all([
        getAssignmentById(assignmentId),
        getAssignmentSubmissions(assignmentId, classSectionId, true),
      ]);

      const assignmentData = assignmentResponse?.data || assignmentResponse;
      const submissionsData = submissionsResponse?.data || submissionsResponse;
      setAssignment(assignmentData);
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách bài nộp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [assignmentId, classSectionId]);

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeValue(submission.grade ?? null);
    setFeedback(submission.feedback || "");
    setReturnToStudent(submission.status === "RETURNED");
  };

  const closeGradeModal = () => {
    setSelectedSubmission(null);
    setGradeValue(null);
    setFeedback("");
    setReturnToStudent(false);
  };

  const handleGrade = async () => {
    if (!selectedSubmission?.id) return;
    if (gradeValue === null || gradeValue === undefined) {
      message.warning("Vui lòng nhập điểm");
      return;
    }

    try {
      setGrading(true);
      await gradeSubmission(selectedSubmission.id, {
        grade: Number(gradeValue),
        feedback,
        returnToStudent,
      });
      message.success("Đã chấm bài thành công");
      closeGradeModal();
      await refreshData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể chấm bài");
    } finally {
      setGrading(false);
    }
  };

  const handleReturnOnly = async () => {
    if (!selectedSubmission?.id) return;
    if (!feedback?.trim()) {
      message.warning("Vui lòng nhập nhận xét trước khi trả bài");
      return;
    }

    try {
      setGrading(true);
      await returnSubmission(selectedSubmission.id, { feedback });
      message.success("Đã trả bài cho học viên");
      closeGradeModal();
      await refreshData();
    } catch (error) {
      console.error(error);
      message.error(error?.response?.data?.message || "Không thể trả bài");
    } finally {
      setGrading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Học viên",
        dataIndex: "studentName",
        key: "studentName",
        render: (_, record) => record.studentName || `Student #${record.studentId ?? "N/A"}`,
      },
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
      },
      {
        title: "Nộp lúc",
        dataIndex: "submissionTime",
        key: "submissionTime",
        render: (value) => formatSubmissionTime(value),
      },
      {
        title: "Điểm",
        dataIndex: "grade",
        key: "grade",
        render: (value) => (value === null || value === undefined ? "—" : value),
      },
      {
        title: "Resources",
        dataIndex: "resources",
        key: "resources",
        render: (value) => (Array.isArray(value) ? value.length : 0),
      },
      {
        title: "Thao tác",
        key: "action",
        render: (_, record) => (
          <Button
            disabled={!record.id || record.status === "NOT_SUBMITTED"}
            onClick={() => openGradeModal(record)}
          >
            Chấm / Trả bài
          </Button>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className="flex-1 pt-16 lg:pl-64">
          <div className="max-w-6xl mx-auto p-6 space-y-4">
            <button
              onClick={() => navigate(`${basePath}/class-sections/${classSectionId}/assignments/${assignmentId}`)}
              className="text-primary text-sm font-medium hover:underline"
            >
              Quay lại Assignment
            </button>

            <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Bài nộp: {assignment?.title}
              </h1>
              <p className="text-sm text-slate-500 mb-5">
                Tổng số học viên: {submissions.length}
              </p>

              <Table
                rowKey={(record) => `${record.studentId || "none"}-${record.id || "empty"}`}
                columns={columns}
                dataSource={submissions}
                pagination={{ pageSize: 10 }}
              />
            </div>
          </div>
        </main>
      </div>

      <Modal
        title="Chấm bài / Trả bài"
        open={Boolean(selectedSubmission)}
        onCancel={closeGradeModal}
        footer={null}
        width={880}
      >
        {selectedSubmission && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              <p>
                <strong>Học viên:</strong> {selectedSubmission.studentName}
              </p>
              <p>
                <strong>Nộp lúc:</strong> {formatSubmissionTime(selectedSubmission.submissionTime)}
              </p>
            </div>

            {selectedSubmission.description && (
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs uppercase text-slate-500 mb-2">Nội dung bài nộp</p>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedSubmission.description }}
                />
              </div>
            )}

            {Array.isArray(selectedSubmission.resources) && selectedSubmission.resources.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-xs uppercase text-slate-500">Tệp/Link đính kèm</p>
                {selectedSubmission.resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.fileUrl || resource.embedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-primary hover:underline text-sm"
                  >
                    {resource.title}
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Điểm</p>
                <InputNumber
                  className="w-full"
                  min={0}
                  max={assignment?.maxScore || 100}
                  value={gradeValue}
                  onChange={setGradeValue}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Trả bài sau khi chấm</p>
                <Switch checked={returnToStudent} onChange={setReturnToStudent} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Nhận xét (rich text)</p>
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                value={feedback}
                onChange={setFeedback}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleReturnOnly} loading={grading}>
                Trả bài (không chấm)
              </Button>
              <Button type="primary" onClick={handleGrade} loading={grading}>
                Lưu điểm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
