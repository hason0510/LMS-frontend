import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { Spin, message } from "antd";
import { getAttemptDetail } from "../../api/quiz";
import Header from "../../components/layout/Header";

export default function QuizResult() {
  const { id, courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const attemptId = location.state?.attemptId;

  const [loading, setLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttemptResult = async () => {
      if (!attemptId) {
        setError("Không tìm thấy ID bài làm");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getAttemptDetail(attemptId);
        const data = response?.data || response;
        
        // Calculate time taken in minutes and seconds
        let timeTaken = 'N/A';
        if (data.startTime && data.completedTime) {
          const startTime = new Date(data.startTime).getTime();
          const endTime = new Date(data.completedTime).getTime();
          const totalSeconds = Math.floor((endTime - startTime) / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          
          let parts = [];
          if (minutes > 0) parts.push(`${minutes} phút`);
          if (seconds > 0) parts.push(`${seconds} giây`);
          timeTaken = parts.length > 0 ? parts.join(' ') : '0 giây';
        }
        
        // Map API response to component state
        const mappedData = {
          id: data.id,
          score: data.grade || 0,
          totalScore: 100,
          isPassed: data.isPassed || false,
          completedAt: data.completedTime ? new Date(data.completedTime).toLocaleString('vi-VN') : 'N/A',
          feedback: data.isPassed ? "Làm tốt lắm! Bạn đã vượt qua kỳ thi." : "Bạn chưa đạt điểm yêu cầu. Hãy cố gắng thêm!",
          timeTaken: timeTaken,
          correctCount: data.correctAnswers || 0,
          wrongCount: data.incorrectAnswers || 0,
          unansweredCount: data.unansweredQuestions || 0,
          answers: data.answers || []
        };
        
        setResultData(mappedData);
      } catch (err) {
        console.error("Error fetching attempt detail:", err);
        setError(err.message || "Không thể tải kết quả bài làm");
        message.error("Lỗi: " + (err.message || "Không thể tải kết quả"));
      } finally {
        setLoading(false);
      }
    };

    fetchAttemptResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center">
        <Spin size="large" tip="Đang tải kết quả..." />
      </div>
    );
  }

  if (error || !resultData) {
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

  const handleRetake = () => {
    navigate(`/courses/${courseId}/quizzes/${id}/detail`);
  };

  const handleBackToCourse = () => {
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display min-h-screen flex flex-col">
      <Header />

      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center px-4 py-5 md:px-10 lg:px-40">
          <div className="layout-content-container flex max-w-[960px] flex-1 flex-col gap-6">
            {/* Main Result Card (Hero) */}
            <div className="flex flex-col gap-6 rounded-xl bg-white p-6 shadow-sm dark:bg-[#1A2633] dark:shadow-gray-900 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Score Circle */}
                <div className="relative flex size-32 shrink-0 items-center justify-center rounded-full border-[6px] border-[#e6f4ea] bg-white dark:border-green-900/30 dark:bg-[#1A2633]">
                  <svg
                    className="absolute size-full -rotate-90 transform"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      className="text-[#e6f4ea] dark:text-green-900/30"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="44"
                      stroke="currentColor"
                      strokeWidth="6"
                    ></circle>
                    <circle
                      className="text-[#2eb85c]"
                      cx="50"
                      cy="50"
                      fill="transparent"
                      r="44"
                      stroke="currentColor"
                      strokeDasharray="276"
                      strokeDashoffset={
                        276 - (276 * resultData.score) / resultData.totalScore
                      }
                      strokeLinecap="round"
                      strokeWidth="6"
                    ></circle>
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#111418] dark:text-white">
                      {resultData.score}
                    </span>
                    <span className="text-xs font-medium text-[#617589] dark:text-gray-400">
                      / {resultData.totalScore}
                    </span>
                  </div>
                </div>
                {/* Text Info */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black leading-tight tracking-[-0.033em] text-[#111418] dark:text-white md:text-3xl">
                      Kiểm tra giữa kỳ
                    </h1>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        resultData.isPassed
                          ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400"
                          : "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400"
                      }`}
                    >
                      {resultData.isPassed ? "Đạt" : "Không đạt"}
                    </span>
                  </div>
                  <p className="text-base font-normal leading-normal text-[#617589] dark:text-gray-400">
                    Hoàn thành lúc {resultData.completedAt}
                  </p>
                  <p className="text-base font-medium text-[#111418] dark:text-gray-200">
                    {resultData.feedback}
                  </p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                <button
                  onClick={handleRetake}
                  className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white transition hover:bg-blue-600"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                  Làm lại bài
                </button>
                <button
                  onClick={handleBackToCourse}
                  className="flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#f0f2f4] px-4 text-sm font-bold text-[#111418] transition hover:bg-[#e0e2e4] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Về khóa học
                </button>
              </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#617589] dark:text-gray-400">
                  <ClockIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Thời gian</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">
                  {resultData.timeTaken}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#1d8f44] dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Câu đúng</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">
                  {resultData.correctCount}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#d32f2f] dark:text-red-400">
                  <XCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Câu sai</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">
                  {resultData.wrongCount}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-[#dbe0e6] bg-white p-4 text-center dark:border-gray-700 dark:bg-[#1A2633]">
                <div className="flex items-center gap-2 text-[#f57c00] dark:text-orange-400">
                  <QuestionMarkCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Chưa trả lời</span>
                </div>
                <p className="text-xl font-bold leading-tight text-[#111418] dark:text-white md:text-2xl">
                  {resultData.unansweredCount}
                </p>
              </div>
            </div>

            {/* Review Section */}
            <div className="flex flex-col gap-4">
              <h3 className="px-2 text-xl font-bold text-[#111418] dark:text-white">
                Chi tiết bài làm
              </h3>
              {resultData.answers && resultData.answers.length > 0 ? (
                resultData.answers.map((attemptAnswer, index) => {
                  const question = attemptAnswer.quizQuestion || {};
                  const isCorrect = attemptAnswer.isCorrect;
                  const userAnswer = attemptAnswer.selectedAnswers?.map(a => a.content).join(", ") || attemptAnswer.textAnswer || "Không có câu trả lời";
                  
                  return (
                    <div
                      key={attemptAnswer.id || index}
                      className="flex flex-col gap-4 rounded-xl border border-[#dbe0e6] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-[#1A2633]"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div className="flex gap-3 flex-1">
                          <span
                            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              isCorrect
                                ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400"
                                : isCorrect === false
                                ? "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400"
                                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <h4 className="text-lg font-medium text-[#111418] dark:text-white">
                            {question.content || "Câu hỏi"}
                          </h4>
                        </div>
                        <span
                          className={`self-start rounded-full px-3 py-1 text-xs font-bold ${
                            isCorrect === true
                              ? "bg-[#e6f4ea] text-[#1d8f44] dark:bg-green-900/40 dark:text-green-400"
                              : isCorrect === false
                              ? "bg-[#fdecea] text-[#d32f2f] dark:bg-red-900/40 dark:text-red-400"
                              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {isCorrect === true ? "Đúng" : isCorrect === false ? "Sai" : "Chưa chấm"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-col gap-3 pl-0 sm:pl-11">
                        {/* User Answer */}
                        <div
                          className={`flex items-center gap-3 rounded-lg border p-3 ${
                            isCorrect
                              ? "border-[#e6f4ea] bg-[#f7fbf8] dark:border-green-900/30 dark:bg-green-900/10"
                              : isCorrect === false
                              ? "border-[#fdecea] bg-[#fff8f8] dark:border-red-900/30 dark:bg-red-900/10"
                              : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
                          }`}
                        >
                          {isCorrect === true ? (
                            <CheckCircleIcon className="h-6 w-6 text-[#1d8f44] dark:text-green-400" />
                          ) : isCorrect === false ? (
                            <XCircleIcon className="h-6 w-6 text-[#d32f2f] dark:text-red-400" />
                          ) : (
                            <QuestionMarkCircleIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#617589] dark:text-gray-400">
                              Câu trả lời của bạn
                            </span>
                            <span className="font-medium text-[#111418] dark:text-white max-w-2xl break-words">
                              {userAnswer}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">Không có dữ liệu chi tiết</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}