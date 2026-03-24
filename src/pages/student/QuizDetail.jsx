import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Spin, message, Modal } from "antd";
import Header from "../../components/layout/Header";
import { getQuizById, getStudentAttemptsHistory } from "../../api/quiz";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function QuizDetail() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const chapterItemId = location.state?.chapterItemId;

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      if (!id) {
        setError("Không tìm thấy ID bài kiểm tra");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getQuizById(id);
        const data = response?.data || response;
        setQuiz(data);

        // Fetch attempts history if chapterItemId is available
        if (chapterItemId) {
          try {
            const attemptsResponse = await getStudentAttemptsHistory(chapterItemId);
            const attemptsData = Array.isArray(attemptsResponse) ? attemptsResponse : (attemptsResponse?.data || []);
            setAttempts(attemptsData);
          } catch (err) {
            console.warn("Could not fetch attempts history:", err);
            setAttempts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching quiz details:", err);
        setError(err.message || "Không thể tải thông tin bài kiểm tra");
        message.error("Lỗi: " + (err.message || "Không thể tải dữ liệu"));
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [id, chapterItemId]);

  if (loading) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
        <Spin size="large" tip="Đang tải thông tin bài kiểm tra..." />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600 mb-4">{error || "Không tải được dữ liệu"}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const handleStartQuiz = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmStart = () => {
    setShowConfirmModal(false);
    navigate(`/courses/${courseId}/quizzes/${id}/attempt`, { state: { chapterItemId } });
  };

  const handleCancelStart = () => {
    setShowConfirmModal(false);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Get quiz statistics
  const totalQuestions = quiz.questions?.length || 0;
  const timeLimitMinutes = quiz.timeLimitMinutes || 0;
  const minPassScore = quiz.minPassScore || 0;
  const maxAttempts = quiz.maxAttempts; // null nghĩa là không giới hạn

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex justify-center py-8">
        <div className="layout-content-container flex flex-col max-w-[1024px] w-full px-4 md:px-10">
          <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex items-center gap-2 mb-3 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">
                Quay lại khóa học
              </span>
            </button>

          {/* Page Heading */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-end">
            <div className="flex flex-col gap-2 flex-1">
              <h1 className="text-[#111418] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                {quiz.title || "Bài kiểm tra"}
              </h1>
              <p className="text-[#617589] dark:text-gray-400 text-lg font-normal leading-normal max-w-3xl">
                {quiz.description || "Bài kiểm tra này đánh giá kiến thức của bạn. Hãy đảm bảo bạn đã chuẩn bị kỹ lưỡng."}
              </p>
            </div>
            {maxAttempts !== null && attempts.length >= maxAttempts ? (
              <div className="flex items-center gap-2 text-red-600 font-medium bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg whitespace-nowrap">
                <span className="material-symbols-outlined text-xl">error</span>
                <span>Bạn đã hết số lần làm bài</span>
              </div>
            ) : (
              <button
                onClick={handleStartQuiz}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold text-base transition-all shadow-md whitespace-nowrap bg-primary text-white hover:bg-blue-600 hover:shadow-primary/30"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                Bắt đầu làm bài
              </button>
            )}
          </div>

          {/* Stats / Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
              <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">quiz</span>
              </div>
              <div>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Câu hỏi
                </p>
                <p className="text-[#111418] dark:text-white text-2xl font-bold">
                  {totalQuestions} câu
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
              <div className="bg-orange-100 w-10 h-10 rounded-lg flex items-center justify-center text-orange-600">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Thời gian
                </p>
                <p className="text-[#111418] dark:text-white text-2xl font-bold">
                  {timeLimitMinutes} phút
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
              <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Điểm đạt
                </p>
                <p className="text-[#111418] dark:text-white text-2xl font-bold">
                  {minPassScore}/{100}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-[#1c2a38] border border-[#dbe0e6] dark:border-[#2d3748] shadow-sm">
              <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center text-purple-600">
                <span className="material-symbols-outlined">repeat</span>
              </div>
              <div>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Số lần làm
                </p>
                <p className="text-[#111418] dark:text-white text-2xl font-bold">
                  {maxAttempts === null ? "Không giới hạn" : `Tối đa ${maxAttempts}`}
                </p>
              </div>
            </div>
          </div>

          {/* Instructions Section */}
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

          {/* History Table Section */}
          {attempts && attempts.length > 0 && (
            <div className="flex flex-col gap-4 mb-10">
              <div className="flex justify-between items-end">
                <h2 className="text-[#111418] dark:text-white text-2xl font-bold leading-tight border-l-4 border-primary pl-4">
                  Lịch sử làm bài
                </h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#dbe0e6] dark:border-[#2d3748] bg-white dark:bg-[#1c2a38]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-[#243447] text-[#617589] dark:text-gray-400 text-sm uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-6 py-4">Lần làm</th>
                      <th className="px-6 py-4">Ngày thực hiện</th>
                      <th className="px-6 py-4">Thời gian</th>
                      <th className="px-6 py-4">Điểm số</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dbe0e6] dark:divide-[#2d3748]">
                    {attempts.map((attempt, index) => {
                      const completedTime = attempt.completedTime ? new Date(attempt.completedTime).toLocaleString('vi-VN') : 'N/A';
                      const timeTakenMinutes = Math.floor((new Date(attempt.completedTime).getTime() - new Date(attempt.startTime).getTime()) / (1000 * 60));
                      const timeTakenSeconds = Math.floor(((new Date(attempt.completedTime).getTime() - new Date(attempt.startTime).getTime()) / 1000) % 60);
                      let timeTakenStr = '';
                      if (timeTakenMinutes > 0) timeTakenStr += `${timeTakenMinutes} phút`;
                      if (timeTakenSeconds > 0) timeTakenStr += (timeTakenStr ? ' ' : '') + `${timeTakenSeconds} giây`;
                      if (!timeTakenStr) timeTakenStr = '0 giây';

                      return (
                        <tr key={attempt.id || index} className="hover:bg-gray-50 dark:hover:bg-[#243447] transition-colors">
                          <td className="px-6 py-4 font-medium">Lần {index + 1}</td>
                          <td className="px-6 py-4 text-sm">{completedTime}</td>
                          <td className="px-6 py-4 text-sm text-[#617589] dark:text-gray-400">{timeTakenStr}</td>
                          <td className="px-6 py-4 font-bold" style={{ color: attempt.isPassed ? '#1d8f44' : '#d32f2f' }}>
                            {attempt.grade}/100
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                attempt.isPassed
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {attempt.isPassed ? 'Đạt' : 'Không đạt'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="flex flex-col items-center gap-6 pb-12">
            {maxAttempts === null && (
              <div className="flex items-center gap-2 text-primary font-medium bg-primary/5 px-4 py-2 rounded-full">
                <span className="material-symbols-outlined text-xl">info</span>
                <span>Bạn có thể bắt đầu làm bài bất cứ lúc nào.</span>
              </div>
            )}
            {maxAttempts !== null && attempts.length > 0 && attempts.length < maxAttempts && (
              <div className="flex items-center gap-2 text-primary font-medium bg-primary/5 px-4 py-2 rounded-full">
                <span className="material-symbols-outlined text-xl">info</span>
                <span>Bạn còn {maxAttempts - attempts.length} lượt làm bài.</span>
              </div>
            )}
            {maxAttempts !== null && attempts.length === 0 && (
              <div className="flex items-center gap-2 text-primary font-medium bg-primary/5 px-4 py-2 rounded-full">
                <span className="material-symbols-outlined text-xl">info</span>
                <span>Bạn có thể bắt đầu làm bài bất cứ lúc nào.</span>
              </div>
            )}
            {maxAttempts !== null && attempts.length >= maxAttempts && (
              <div className="flex items-center gap-2 text-red-600 font-medium bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full">
                <span className="material-symbols-outlined text-xl">error</span>
                <span>Bạn đã hết số lần làm bài.</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      <Modal
        title="Xác nhận bắt đầu bài kiểm tra"
        open={showConfirmModal}
        onCancel={handleCancelStart}
        footer={[
          <button
            key="cancel"
            onClick={handleCancelStart}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-[#111418] dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors mr-2"
          >
            Hủy
          </button>,
          <button
            key="submit"
            onClick={handleConfirmStart}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Xác nhận bắt đầu
          </button>,
        ]}
        centered
      >
        <div className="space-y-4">
          <p className="text-base">
            Bạn sắp bắt đầu bài kiểm tra <strong>{quiz?.title}</strong>.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">⏱️ Thời gian làm bài:</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {timeLimitMinutes} phút
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">✓ Yêu cầu để đạt:</p>
            <p className="text-sm text-green-800 dark:text-green-200">
              {minPassScore}/100 điểm
            </p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vui lòng đảm bảo bạn có thời gian đủ để hoàn thành bài kiểm tra và kết nối mạng ổn định.
          </p>
        </div>
      </Modal>
    </div>
  );
}
