import React, { useState, useMemo } from "react";
import { App, Select, Input, Button, Spin, Tag, Table, Empty } from "antd";
import { DownloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import {
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  TrophyIcon,
  StarIcon,
  PencilSquareIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

// Chú ý: Component này sẽ dùng rất nhiều !important (dấu !) để ghi đè CSS mặc định
// và bám sát file HTML mockup nhất có thể.
import { DonutSummaryChart, CompactDonutChart, StackedStatusBarChart, SingleSeriesBarChart } from "./ReportCharts";
import UserIdentity from "../common/UserIdentity";
import DataPaginationFooter from "../common/DataPaginationFooter";

// ---- UI Helpers ----
function SubTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`!px-3.5 !py-1.5 !rounded-lg !text-[12.5px] !font-semibold !cursor-pointer !transition-all !border-none ${active
        ? "!bg-gradient-to-br !from-teal-700 !to-blue-700 !text-white"
        : "!bg-transparent !text-slate-500 hover:!bg-slate-100 dark:!text-slate-400 dark:hover:!bg-slate-800"
        }`}
    >
      {children}
    </button>
  );
}

function MetricCard({ icon, label, value, tone }) {
  const toneMap = {
    blue: "!bg-blue-50 !text-blue-600 !border-blue-200 dark:!bg-blue-900/20 dark:!border-blue-800",
    emerald: "!bg-emerald-50 !text-emerald-600 !border-emerald-200 dark:!bg-emerald-900/20 dark:!border-emerald-800",
    amber: "!bg-amber-50 !text-amber-600 !border-amber-200 dark:!bg-amber-900/20 dark:!border-amber-800",
    violet: "!bg-violet-50 !text-violet-600 !border-violet-200 dark:!bg-violet-900/20 dark:!border-violet-800",
    rose: "!bg-rose-50 !text-rose-600 !border-rose-200 dark:!bg-rose-900/20 dark:!border-rose-800",
  };
  return (
    <div className="!bg-white dark:!bg-slate-900/50 !border !border-slate-200 dark:!border-slate-800 !rounded-2xl !p-4 !shadow-sm">
      <div className="!flex !justify-between !items-start">
        <div>
          <div className="!text-[10px] !font-bold !uppercase !tracking-widest !text-slate-500 dark:!text-slate-400">{label}</div>
          <div className="!text-3xl !font-black !text-slate-900 dark:!text-white !mt-1.5">{value}</div>
        </div>
        <div className={`!w-10 !h-10 !rounded-xl !flex !items-center !justify-center !flex-shrink-0 !border ${toneMap[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, extra, className = "" }) {
  return (
    <div className={`!bg-white dark:!bg-slate-900/50 !border !border-slate-200 dark:!border-slate-800 !rounded-2xl !p-5 !shadow-sm !mb-5 ${className}`}>
      {(title || subtitle || extra) && (
        <div className="!flex !justify-between !items-start !flex-wrap !gap-3 !mb-4">
          <div>
            {title && <div className="!text-[15px] !font-extrabold !text-slate-900 dark:!text-white !mb-1">{title}</div>}
            {subtitle && <div className="!text-xs !text-slate-500 dark:!text-slate-400">{subtitle}</div>}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

function ProgressBarMini({ percent, color }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return (
    <div className="!flex !justify-center !items-center !gap-3">
      <span style={{ color, fontSize: '13px', minWidth: '40px' }} className="!font-bold !text-right">{p}%</span>
      <div className="!h-2.5 !rounded-full !bg-slate-100 dark:!bg-slate-800 !flex-1 !max-w-[120px] !overflow-hidden !border !border-slate-200 dark:!border-slate-700">
        <div className="!h-full !rounded-full" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ---- MAIN COMPONENT ----
export default function ClassSectionReportContent({
  classSections = [],
  selectedClassSectionId,
  currentClassSection,
  managedClassCount,
  loading,
  classOverview,
  assignmentReport,
  quizReport,
  peopleRows = [],
  onSelectClassSection,
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [histogramMode, setHistogramMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [standingFilter, setStandingFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  React.useEffect(() => {
    setPage(1);
    setSearchTerm("");
    setStandingFilter("ALL");
  }, [selectedClassSectionId]);

  // Xử lý dữ liệu classOverview cho Tab Tổng quan
  const totalStudents = classOverview?.totalStudents || 0;
  const avgProgress = classOverview?.averageProgress ? Math.round(classOverview.averageProgress) : 0;
  const pendingRequests = classOverview?.pendingRequests || 0;
  const taCount = classOverview?.taCount || 0;
  const teachingAssistants = classOverview?.teachingAssistants || [];

  const buckets = classOverview?.progressBuckets || { low: 0, medium: 0, high: 0 };
  const totalBuckets = buckets.low + buckets.medium + buckets.high || 1;

  // Xử lý dữ liệu Bài tập
  const asgmInfo = assignmentReport || {};
  const assignmentRows = (asgmInfo.rows || []).map(r => ({
    ...r,
    label: r.assignmentTitle || "Bài tập",
    graded: r.gradedCount || 0,
    pending: r.pendingReviewCount || 0,
    missing: r.notSubmitted || 0,
  }));

  // Xử lý dữ liệu Quiz
  const qzInfo = quizReport || {};
  const totalAttempts = qzInfo.totalAttempts || 0;
  const quizWaitReview = qzInfo.totalWaitingReview || 0;
  const quizAvgScore = typeof qzInfo.averageScore === 'number' ? qzInfo.averageScore.toFixed(1) : "0.0";
  // Tỷ lệ pass tính theo HỌC VIÊN (distinct HV đạt / distinct HV tham gia), không theo lượt thi.
  const passRate = qzInfo.participantStudents > 0
    ? Math.round((qzInfo.passedStudents / qzInfo.participantStudents) * 100)
    : 0;

  // Dữ liệu cho chart Quiz (Pass Rate) — % học viên đạt trên mỗi quiz.
  const quizPassBars = (qzInfo.rows || []).map(r => {
    const rate = r.uniqueStudents > 0 ? Math.round((r.passedStudents / r.uniqueStudents) * 100) : 0;
    return {
      label: r.quizTitle,
      value: rate,
      color: rate >= 50 ? "#10b981" : "#f59e0b"
    };
  });

  // Dữ liệu Histogram
  let currentHistogram = [];
  let histAvg = quizAvgScore;
  let histPass = `${passRate}%`;
  let histAttempts = totalAttempts;
  let histTitle = t("report.allQuizzes", "Tất cả quiz");

  if (histogramMode === "all") {
    currentHistogram = qzInfo.histogram || [];
  } else {
    const selectedQuiz = (qzInfo.rows || []).find(q => String(q.quizId) === String(histogramMode));
    if (selectedQuiz) {
      currentHistogram = selectedQuiz.histogram || [];
      histAvg = typeof selectedQuiz.averageScore === 'number' ? selectedQuiz.averageScore.toFixed(1) : "0.0";
      histPass = selectedQuiz.uniqueStudents > 0 ? Math.round((selectedQuiz.passedStudents / selectedQuiz.uniqueStudents) * 100) + "%" : "0%";
      histAttempts = selectedQuiz.totalAttempts;
      histTitle = selectedQuiz.quizTitle;
    }
  }

  // Dữ liệu Người học (Table)
  const studentsTableData = (peopleRows || []).map((student, i) => {
    const prog = student.progress || 0;
    const color = prog < 40 ? "#e11d48" : prog < 75 ? "#f59e0b" : "#10b981";
    let statusText = "Tốt";
    let statusTone = "green";
    let standingKey = "good";
    if (prog < 40) { statusText = "Nguy cơ"; statusTone = "rose"; standingKey = "atRisk"; }
    else if (prog < 75) { statusText = "Trung bình"; statusTone = "amber"; standingKey = "average"; }

    return {
      key: student.studentId || i,
      index: i + 1,
      name: student.studentName,
      code: student.studentNumber,
      email: student.email,
      avatarUrl: student.avatarUrl || student.imageUrl || student.studentAvatar || student.avatar,
      progress: prog,
      progColor: color,
      standingKey,
      notSubmittedAssignments: student.notSubmittedAssignments || 0,
      btNop: `${student.submittedAssignments || 0} / ${student.totalAssignments || 0}`,
      quizDat: `${student.passedQuizzes || 0} / ${student.totalQuizzes || 0}`,
      statusText,
      statusTone,
    };
  });

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return studentsTableData.filter((student) => {
      if (standingFilter !== "ALL" && student.standingKey !== standingFilter) return false;
      if (!term) return true;
      return (
        (student.name || "").toLowerCase().includes(term) ||
        (student.code || "").toLowerCase().includes(term) ||
        (student.email || "").toLowerCase().includes(term)
      );
    });
  }, [studentsTableData, searchTerm, standingFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  // Xuất danh sách người học sang CSV
  const handleExportStudents = () => {
    if (!filteredStudents.length) {
      message.warning(t("report.exportEmpty", "Không có dữ liệu để xuất"));
      return;
    }
    const headers = [
      t("report.exportColIndex", "#"),
      t("report.colLearner", "Người học"),
      t("report.exportColCode", "Mã SV"),
      t("report.exportColEmail", "Email"),
      t("report.colProgress", "Tiến độ (%)"),
      t("report.colAssignments", "Bài tập đã nộp"),
      t("report.colQuizzes", "Bài kiểm tra đạt"),
      t("report.colLate", "Số bài chưa nộp"),
      t("report.colStatus", "Trạng thái"),
    ];
    const rows = filteredStudents.map((s) => [
      s.index,
      s.name || "",
      s.code || "",
      s.email || "",
      s.progress || 0,
      s.btNop || "",
      s.quizDat || "",
      s.notSubmittedAssignments || 0,
      t(`report.status.${s.statusText}`, s.statusText),
    ]);
    const escapeCsv = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csvContent = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const className = classOverview?.classTitle || currentClassSection?.title || `class-${selectedClassSectionId}`;
    const safeName = String(className).replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "class";
    const fileName = `danh-sach-nguoi-hoc-${safeName}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(t("report.exportSuccess", "Đã xuất file CSV"));
  };

  // Loading spinner bao bọc toàn trang nếu đang tải
  if (loading) {
    return <div className="!flex !justify-center !items-center !h-64"><Spin size="large" /></div>;
  }

  return (
    <div className="!space-y-5">
      {/* 1. Class Selector Card */}
      <SectionCard>
        <div className="!flex !items-center !justify-between !gap-4 !flex-wrap">
          <div>
            <div className="!flex !items-center !gap-2 !mb-0.5 !flex-wrap">
              <span className="!text-[15px] !font-extrabold !text-slate-900 dark:!text-white">{t("report.selectClassTitle", "Chọn lớp báo cáo")}</span>
              {managedClassCount != null ? (
                <Tag color="blue" className="!m-0 !rounded-full !px-2.5 !py-0.5 !text-xs !font-semibold">
                  {t("report.managedClasses", { count: managedClassCount, defaultValue: "{{count}} lớp" })}
                </Tag>
              ) : null}
            </div>
            <div className="!text-[13px] !text-slate-500 dark:!text-slate-400">{t("report.selectClassSubtitle", "Báo cáo chi tiết theo từng lớp học")}</div>
          </div>
          <Select
            showSearch
            optionFilterProp="label"
            value={selectedClassSectionId || undefined}
            onChange={(val) => onSelectClassSection && onSelectClassSection(val)}
            className="!min-w-[280px]"
            options={classSections.map(c => ({
              value: c.id || c.classSectionId,
              label: c.title || c.classCode || `${t("report.classWord", "Lớp")} ${c.id || c.classSectionId}`
            }))}
            placeholder={t("report.searchAndSelectClass", "Tìm kiếm và chọn lớp...")}
          />
        </div>
      </SectionCard>

      {/* 2. Sub-tabs Navigation */}
      <div className="!flex !gap-1 !mb-4">
        <SubTabButton active={activeSubTab === "overview"} onClick={() => setActiveSubTab("overview")}>{t("report.tabOverview", "Tổng quan")}</SubTabButton>
        <SubTabButton active={activeSubTab === "assignments"} onClick={() => setActiveSubTab("assignments")}>{t("report.tabAssignments", "Bài tập")}</SubTabButton>
        <SubTabButton active={activeSubTab === "quizzes"} onClick={() => setActiveSubTab("quizzes")}>{t("report.tabQuizzes", "Quiz")}</SubTabButton>
        <SubTabButton active={activeSubTab === "people"} onClick={() => setActiveSubTab("people")}>{t("report.tabPeople", "Người học")}</SubTabButton>
      </div>

      {/* ===================== TAB: TỔNG QUAN ===================== */}
      {activeSubTab === "overview" && (
        <div className="!animate-fade-in">
          <div className="!grid !grid-cols-2 lg:!grid-cols-4 !gap-4 !mb-5">
            <MetricCard icon={<UserGroupIcon className="!h-5 !w-5" />} label={t("report.metric.learners", "Người học")} value={totalStudents} tone="blue" />
            <MetricCard icon={<ChartBarIcon className="!h-5 !w-5" />} label={t("report.metric.avgProgress", "Tiến độ trung bình")} value={`${avgProgress}%`} tone="emerald" />
            <MetricCard icon={<ClockIcon className="!h-5 !w-5" />} label={t("report.metric.pending", "Chờ duyệt")} value={pendingRequests} tone="amber" />
            <MetricCard icon={<AcademicCapIcon className="!h-5 !w-5" />} label={t("report.metric.ta", "Trợ giảng")} value={taCount} tone="violet" />
          </div>

          <div className="!grid !grid-cols-1 lg:!grid-cols-3 !gap-5">
            {/* Phân bố tiến độ */}
            <div className="lg:!col-span-1 !flex !flex-col">
              <SectionCard
                title={t("report.progressDistribution", "Phân nhóm người học theo tiến độ")}
                subtitle={t("report.progressDistributionSub", "Ba nhóm: thấp – trung bình – cao")}
                className="!flex-1 !mb-0 !flex !flex-col"
              >
                <CompactDonutChart
                  data={[
                    { label: t("report.groupHigh", "Nhóm Cao (≥ 80%)"), value: buckets.high, color: "#10b981" },
                    { label: t("report.groupMedium", "Nhóm Trung bình (40–80%)"), value: buckets.medium, color: "#f59e0b" },
                    { label: t("report.groupLow", "Nhóm Thấp (< 40%)"), value: buckets.low, color: "#e11d48" },
                  ]}
                  totalValue={totalStudents}
                  emptyText={t("report.noProgressData", "Chưa có dữ liệu tiến độ")}
                  valueFormatter={(val) => `${val} ${t("report.learnerUnit", "người học")}`}
                />
              </SectionCard>
            </div>

            {/* Thông tin lớp học */}
            <div className="lg:!col-span-2 !flex !flex-col">
              <SectionCard title={t("report.classInfo", "Thông tin lớp học")} subtitle={classOverview?.classTitle || currentClassSection?.title} className="!flex-1 !mb-0">
                <table className="!w-full !text-[13px] !text-slate-700 dark:!text-slate-300">
                  <tbody className="!divide-y !divide-slate-100 dark:!divide-slate-800">
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !w-[130px] !text-slate-500">{t("report.className", "Tên lớp")}</td>
                      <td className="!py-3 !font-semibold">{classOverview?.classTitle || currentClassSection?.title}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.classCode", "Mã lớp")}</td>
                      <td className="!py-3">{classOverview?.classCode || currentClassSection?.classCode || "—"}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.subject", "Môn học")}</td>
                      <td className="!py-3">{classOverview?.subjectTitle || currentClassSection?.subjectTitle || "—"}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.teacher", "Giảng viên")}</td>
                      <td className="!py-3">{classOverview?.primaryTeacherName || currentClassSection?.teacherName || "—"}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.ta", "Trợ giảng")}</td>
                      <td className="!py-3">
                        {teachingAssistants.length > 0
                          ? teachingAssistants.map(ta => ta.fullName).join(", ")
                          : t("report.none", "Không có")}
                      </td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.statusLabel", "Trạng thái")}</td>
                      <td className="!py-3">
                        <Tag color={classOverview?.status === "PUBLIC" ? "green" : "gold"}>
                          {classOverview?.status || "PUBLIC"}
                        </Tag>
                      </td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.startDate", "Bắt đầu")}</td>
                      <td className="!py-3">{classOverview?.startDate ? new Date(classOverview.startDate).toLocaleDateString() : "—"}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.endDate", "Kết thúc")}</td>
                      <td className="!py-3">{classOverview?.endDate ? new Date(classOverview.endDate).toLocaleDateString() : "—"}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.totalAssignments", "Tổng bài tập")}</td>
                      <td className="!py-3">{classOverview?.trackedAssignments || 0} {t("report.lessonUnit", "bài")}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.totalLectures", "Tổng bài giảng")}</td>
                      <td className="!py-3">{classOverview?.trackedLectures || 0} {t("report.lessonUnit", "bài")}</td>
                    </tr>
                    <tr className="!hover:bg-slate-50 dark:hover:!bg-slate-800/50">
                      <td className="!py-3 !text-slate-500">{t("report.totalQuizzes", "Tổng bài kiểm tra")}</td>
                      <td className="!py-3">{classOverview?.trackedQuizzes || 0} {t("report.lessonUnit", "bài")}</td>
                    </tr>
                  </tbody>
                </table>
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: BÀI TẬP ===================== */}
      {activeSubTab === "assignments" && (
        <div className="!animate-fade-in">
          <div className="!grid !grid-cols-2 lg:!grid-cols-4 !gap-4 !mb-5">
            <MetricCard icon={<DocumentTextIcon className="!h-5 !w-5" />} label={t("report.metric.totalAssignments", "Tổng bài tập")} value={asgmInfo.totalAssignments || 0} tone="blue" />
            <MetricCard icon={<CheckCircleIcon className="!h-5 !w-5" />} label={t("report.metric.graded", "Đã chấm")} value={asgmInfo.totalGraded || 0} tone="emerald" />
            <MetricCard icon={<ClockIcon className="!h-5 !w-5" />} label={t("report.metric.pendingGrading", "Chờ chấm")} value={asgmInfo.totalPending || 0} tone="amber" />
            <MetricCard icon={<XCircleIcon className="!h-5 !w-5" />} label={t("report.metric.notSubmitted", "Chưa nộp")} value={asgmInfo.totalNotSubmitted || 0} tone="rose" />
          </div>

          <SectionCard
            title={t("report.assignmentProgress", "Tiến độ nộp bài theo bài tập")}
            subtitle={t("report.assignmentProgressSub", "Tên đầy đủ hiển thị trên trục Y — hover để xem chi tiết số lượng")}
            extra={
              <div className="!flex !gap-3 !items-center !flex-wrap">
                <span className="!flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                  <span className="!w-2 !h-2 !rounded-full !bg-[#10b981]"></span>{t("report.status.graded", "Đã chấm")}
                </span>
                <span className="!flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                  <span className="!w-2 !h-2 !rounded-full !bg-[#f59e0b]"></span>{t("report.status.pendingGrading", "Chờ chấm")}
                </span>
                <span className="!flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                  <span className="!w-2 !h-2 !rounded-full !bg-[#fca5a5]"></span>{t("report.status.notSubmitted", "Chưa nộp")}
                </span>
              </div>
            }
          >
            {assignmentRows.length > 0 ? (
              <StackedStatusBarChart
                data={assignmentRows}
                series={[
                  { key: "graded", label: t("report.status.graded", "Đã chấm"), color: "#10b981" },
                  { key: "pending", label: t("report.status.pendingGrading", "Chờ chấm"), color: "#f59e0b" },
                  { key: "missing", label: t("report.status.notSubmitted", "Chưa nộp"), color: "#fca5a5" },
                ]}
                xAxisLabel={t("report.numberOfStudents", "Số người học")}
                emptyText={t("report.noAssignmentData", "Chưa có dữ liệu bài tập")}
              />
            ) : (
              <Empty description={t("report.noAssignments", "Không có bài tập nào")} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ===================== TAB: QUIZ ===================== */}
      {activeSubTab === "quizzes" && (
        <div className="!animate-fade-in">
          <div className="!grid !grid-cols-2 lg:!grid-cols-4 !gap-4 !mb-5">
            <MetricCard icon={<PencilSquareIcon className="!h-5 !w-5" />} label={t("report.metric.attempts", "Lượt thi")} value={totalAttempts} tone="blue" />
            <MetricCard icon={<ClockIcon className="!h-5 !w-5" />} label={t("report.metric.pending", "Chờ duyệt")} value={quizWaitReview} tone="violet" />
            <MetricCard icon={<TrophyIcon className="!h-5 !w-5" />} label={t("report.metric.passed", "Đã đạt")} value={`${passRate}%`} tone="emerald" />
            <MetricCard icon={<StarIcon className="!h-5 !w-5" />} label={t("report.metric.avgScore", "Điểm TB")} value={quizAvgScore} tone="blue" />
          </div>

          <div className="!grid !grid-cols-1 lg:!grid-cols-2 !gap-5 !items-stretch">
            <div className="!flex !flex-col">
              <SectionCard
                className="!flex-1 !mb-0 !flex !flex-col"
                title={<span>{t("report.histogram", "Phân bố điểm")} – <span className="!text-slate-500">{histTitle}</span></span>}
                subtitle={t("report.histogramSub", "Số lượng người học theo từng dải điểm")}
                extra={
                  <Select
                    value={histogramMode}
                    onChange={setHistogramMode}
                    className="!min-w-[170px]"
                    options={[
                      { value: "all", label: t("report.allQuizzes", "Tất cả quiz") },
                      ...(qzInfo.rows || []).map(q => ({ value: String(q.quizId), label: q.quizTitle }))
                    ]}
                  />
                }
              >
                {/* Điểm TB mini badge */}
                <div className="!flex !gap-2.5 !mb-3 !flex-wrap">
                  <span className="!inline-flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                    <span className="!w-[7px] !h-[7px] !rounded-full !bg-[#7c3aed]"></span>
                    {t("report.metric.avgScore", "Điểm TB")}: <strong className="!ml-1 !text-slate-900 dark:!text-white">{histAvg}</strong>
                  </span>
                  <span className="!inline-flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                    <span className="!w-[7px] !h-[7px] !rounded-full !bg-[#10b981]"></span>
                    {t("report.quizPassRateLabel", "Tỷ lệ pass")}: <strong className="!ml-1 !text-slate-900 dark:!text-white">{histPass}</strong>
                  </span>
                  <span className="!inline-flex !items-center !gap-1.5 !bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-full !px-2.5 !py-1 !text-[11px] !text-slate-500 dark:!text-slate-400">
                    <span className="!w-[7px] !h-[7px] !rounded-full !bg-[#64748b]"></span>
                    {t("report.metric.attempts", "Lượt thi")}: <strong className="!ml-1 !text-slate-900 dark:!text-white">{histAttempts}</strong>
                  </span>
                </div>

                <div className="!flex-1 !min-h-[240px]">
                  {currentHistogram.length > 0 && currentHistogram.some(h => h.count > 0) ? (
                    <SingleSeriesBarChart
                      data={currentHistogram}
                      dataKey="count"
                      labelKey="range"
                      layout="horizontal"
                      color="#7c3aed"
                      xAxisAngle={0}
                      xAxisHeight={24}
                      xAxisTextAnchor="middle"
                      disableCursor={true}
                      marginBottom={12}
                      yDomain={[0, (dataMax) => Math.max(dataMax, 5)]}
                    />
                  ) : (
                    <div className="!h-full !flex !items-center !justify-center">
                      <Empty description={t("report.histogramEmpty", "Chưa có dữ liệu phổ điểm")} />
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="!flex !flex-col">
              <SectionCard
                className="!flex-1 !mb-0 !flex !flex-col"
                title={t("report.quizPassRate", "Tỷ lệ pass từng quiz")}
                subtitle={`${t("report.quizPassRateSub", "% người học đạt điểm pass – ")}${classOverview?.classTitle || ""}`}
              >
                {quizPassBars.length > 0 ? (
                  <div>
                    {quizPassBars.map((d, idx) => {
                      const c = d.value >= 50 ? '#10b981' : '#f59e0b';
                      const bg = d.value >= 50 ? '#ecfdf5' : '#fffbeb';
                      return (
                        <div key={idx} className="!mb-[14px]">
                          <div className="!flex !justify-between !items-center !mb-1">
                            <span className="!text-[12px] !font-semibold !text-slate-900 dark:!text-white">{d.label}</span>
                            <span className="!text-[12px] !font-bold" style={{ color: c }}>{d.value}%</span>
                          </div>
                          <div className="!h-[12px] !rounded-full !overflow-hidden" style={{ background: bg }}>
                            <div className="!h-full !rounded-full" style={{ background: c, width: `${d.value}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description={t("report.noQuizzes", "Không có quiz nào")} />
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: NGƯỜI HỌC ===================== */}
      {activeSubTab === "people" && (
        <div className="!animate-fade-in">
          <SectionCard
            title={`${t("report.learnerList", "Danh sách Người học")} – ${classOverview?.classTitle || ""}`}
            subtitle={`${totalStudents} ${t("report.approvedLearners", "người học đã được duyệt")}`}
            extra={
              <div className="!flex !gap-2 !flex-wrap">
                <Input
                  prefix={<SearchOutlined />}
                  placeholder={t("report.searchLearner", "Tìm người học...")}
                  className="!rounded-lg !w-48"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  allowClear
                />
                <Select
                  value={standingFilter}
                  onChange={(val) => {
                    setStandingFilter(val);
                    setPage(1);
                  }}
                  className="!w-40"
                  options={[
                    { value: "ALL", label: t("report.progressFilter.all", "Tất cả tiến độ") },
                    { value: "atRisk", label: t("report.progressFilter.atRisk", "Nguy cơ") },
                    { value: "average", label: t("report.progressFilter.average", "Trung bình") },
                    { value: "good", label: t("report.progressFilter.good", "Tốt") },
                  ]}
                />
                <Button
                  icon={<DownloadOutlined />}
                  className="!rounded-lg !font-semibold"
                  onClick={handleExportStudents}
                >
                  {t("report.export", "Xuất")}
                </Button>
              </div>
            }
          >
            <div className="!overflow-x-auto">
              <Table
                dataSource={paginatedStudents}
                pagination={false}
                className="!text-[13px]"
                columns={[
                  { title: '#', dataIndex: 'index', width: 45, align: 'center' },
                  {
                    title: t("report.colLearner", "Người học"),
                    dataIndex: 'name',
                    render: (text, record) => (
                      <UserIdentity
                        user={{
                          name: record.name,
                          avatarUrl: record.avatarUrl,
                          studentNumber: record.code,
                          email: record.email,
                        }}
                        secondaryText={record.code || record.email}
                        avatarSizeClass="!w-9 !h-9"
                      />
                    )
                  },
                  {
                    title: t("report.colProgress", "Tiến độ"),
                    dataIndex: 'progress',
                    width: 220,
                    align: 'center',
                    render: (val, record) => <ProgressBarMini percent={val} color={record.progColor} />
                  },
                  { title: t("report.colAssignments", "Bài tập đã nộp"), dataIndex: 'btNop', align: 'center', width: 140 },
                  { title: t("report.colQuizzes", "Bài kiểm tra đạt"), dataIndex: 'quizDat', align: 'center', width: 180 },
                  { title: t("report.colLate", "Số bài chưa nộp"), dataIndex: 'notSubmittedAssignments', align: 'center', width: 170 },
                  {
                    title: t("report.colStatus", "Trạng thái"),
                    dataIndex: 'statusText',
                    align: 'center',
                    render: (text, record) => {
                      const tagColor = record.statusTone === "green" ? "success"
                        : record.statusTone === "amber" ? "warning"
                          : "error";
                      return <Tag color={tagColor} className="!font-bold !m-0">{t(`report.status.${text}`, text)}</Tag>;
                    }
                  },
                ]}
              />
            </div>
            {filteredStudents.length > 0 && (
              <div className="!mt-4">
                <DataPaginationFooter
                  currentPage={page}
                  pageSize={pageSize}
                  total={filteredStudents.length}
                  totalLabel={t("teacherLists.shared.pagination.total", { count: filteredStudents.length })}
                  pageSizeLabel={t("teacherLists.shared.pagination.pageSize")}
                  rangeLabel={t("teacherLists.shared.pagination.range", {
                    start: (page - 1) * pageSize + 1,
                    end: Math.min(page * pageSize, filteredStudents.length),
                  })}
                  onPageChange={setPage}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}