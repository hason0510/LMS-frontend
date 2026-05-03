import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spin, Modal } from "antd";
import { ArrowLeftIcon, EyeIcon } from "@heroicons/react/24/outline";
import TeacherHeader from "../../components/layout/TeacherHeader";
import TeacherSidebar from "../../components/layout/TeacherSidebar";
import AdminSidebar from "../../components/layout/AdminSidebar";
import { getQuizById } from "../../api/quiz";

export default function TeacherQuizPreview({ isAdmin = false }) {
  const { classSectionId, quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const base = isAdmin ? "/admin" : "/teacher";

  useEffect(() => {
    const handleResize = () => setSidebarCollapsed(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await getQuizById(quizId);
        setQuiz(res?.data || res);
      } catch (err) {
        setError(err.message || "Không thể tải thông tin bài kiểm tra");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const handleConfirmStart = () => {
    setShowConfirm(false);
    navigate(
      `${base}/class-sections/${classSectionId}/quizzes/${quizId}/preview/attempt`,
      { state: { quizData: quiz } }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <Spin size="large" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <TeacherHeader />
        <div className="flex">
          {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
          <main className={`flex-1 pt-16 flex items-center justify-center ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
            <div className="text-center">
              <p className="text-lg font-semibold text-red-600 mb-4">{error || "Không tải được dữ liệu"}</p>
              <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Quay lại
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalQuestions = quiz.questionCount ?? (quiz.questions?.length || 0);
  const timeLimitMinutes = quiz.timeLimitMinutes || 0;
  const minPassScore = quiz.minPassScore || 0;
  const maxAttempts = quiz.maxAttempts;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <TeacherHeader />
      <div className="flex">
        {isAdmin ? <AdminSidebar /> : <TeacherSidebar />}
        <main className={`flex-1 pt-16 transition-all duration-300 ${sidebarCollapsed ? "pl-20" : "pl-64"}`}>
          {/* Preview Banner */}
          <div className="sticky top-16 z-20 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-semibold">
              <EyeIcon className="h-4 w-4" />
              Chế độ xem trước — Đây là giao diện học viên thấy khi truy cập bài kiểm tra này
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Quay lại chỉnh sửa
            </button>
          </div>

          <div className="max-w-[1024px] mx-auto px-4 md:px-10 py-8">
            {/* Heading */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-end">
              <div className="flex flex-col gap-2 flex-1">
                <h1 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                  {quiz.title || "Bài kiểm tra"}
                </h1>
                <p className="text-[#617589] dark:text-gray-400 text-lg font-normal leading-normal max-w-3xl">
                  {quiz.description || "Bài kiểm tra này đánh giá kiến thức của học viên."}
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-base transition-all shadow-md whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white"
              >
                <EyeIcon className="h-5 w-5" />
                Bắt đầu xem trước
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">quiz</span>
                </div>
                <div>
                  <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Câu hỏi</p>
                  <p className="text-[#111418] dark:text-white text-2xl font-bold">{totalQuestions} câu</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
                <div className="bg-orange-100 w-10 h-10 rounded-lg flex items-center justify-center text-orange-600">
                  <span className="material-symbols-outlined">timer</span>
                </div>
                <div>
                  <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Thời gian</p>
                  <p className="text-[#111418] dark:text-white text-2xl font-bold">{timeLimitMinutes} phút</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
                <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center text-green-600">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <div>
                  <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Điểm đạt</p>
                  <p className="text-[#111418] dark:text-white text-2xl font-bold">{minPassScore}/100</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
                <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600">
                  <span className="material-symbols-outlined">repeat</span>
                </div>
                <div>
                  <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Số lần làm</p>
                  <p className="text-[#111418] dark:text-white text-2xl font-bold">
                    {maxAttempts === null ? "Không giới hạn" : `Tối đa ${maxAttempts}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-4 mb-10">
              <h2 className="text-[#111418] dark:text-white text-2xl font-bold leading-tight border-l-4 border-primary pl-4">
                Lưu ý khi làm bài
              </h2>
              <div className="bg-blue-50 dark:bg-primary/10 p-5 rounded-xl text-[#111418] dark:text-gray-300">
                <ul className="list-disc ml-5 space-y-2 text-sm leading-relaxed">
                  <li>Hệ thống sẽ tự động nộp bài khi hết thời gian quy định.</li>
                  <li>Nếu trình duyệt bị đóng đột ngột, bạn có thể quay lại làm bài nếu còn thời gian.</li>
                  <li>Kết quả sẽ được hiển thị ngay sau khi bạn nhấn nút "Nộp bài".</li>
                  <li>Bạn cần đạt ít nhất {minPassScore}% số điểm để hoàn thành bài kiểm tra.</li>
                </ul>
              </div>
            </div>

            {/* Teacher note */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Lưu ý dành cho giáo viên: Đây là chế độ xem trước. Kết quả bài làm thử nghiệm không được lưu vào hệ thống.
                Tất cả các loại câu hỏi sẽ được hiển thị và chấm điểm theo đáp án đúng đã cài đặt.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Modal
        title="Xác nhận bắt đầu xem trước"
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        footer={[
          <button key="cancel" onClick={() => setShowConfirm(false)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-[#111418] dark:text-white rounded-lg hover:bg-gray-300 mr-2">
            Hủy
          </button>,
          <button key="start" onClick={handleConfirmStart} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold">
            Bắt đầu xem trước
          </button>,
        ]}
        centered
      >
        <div className="space-y-3 py-2">
          <p>Bạn sắp bắt đầu xem trước bài kiểm tra <strong>{quiz?.title}</strong> ở chế độ giáo viên.</p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
            Kết quả không được ghi nhận vào hệ thống. Đây chỉ là mô phỏng giao diện học viên.
          </div>
        </div>
      </Modal>
    </div>
  );
}
