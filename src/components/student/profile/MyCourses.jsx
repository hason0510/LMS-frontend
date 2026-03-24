import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Spin, Empty } from "antd";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import CourseCard from "../../course/CourseCard";
import { getApprovedCourses } from "../../../api/course";

export default function MyCourses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const response = await getApprovedCourses(1, 100);
      // Handle API response structure: data.pageList
      const courseList = response.data?.pageList || [];
      setCourses(courseList);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch my courses:", err);
      setError(err.message);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Spin size="large" tip={t("profile.dangTaiKhoaHoc")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{t("profile.loi")}: {error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("profile.khoaHocCuaToi")}
          </p>
          <p className="text-[#617589] dark:text-gray-400 text-base font-normal leading-normal">
            {t("profile.tiepTucHoc")}
          </p>
        </div>
      </div>
      <div>
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-96 gap-4">
            <Empty description={t("profile.chuaDangKy")} />
            <button
              className="group flex min-w-[84px] max-w-[480px] w-fit cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold gap-2"
              onClick={() => navigate("/courses")}
            >
              <span>{t("profile.khamPhaCacKhoaHoc")}</span>
              <ArrowRightIcon className="h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-2" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.title}
                author={course.teacherName}
                image={course.imageUrl}
                rating={course.rating || 0}
                reviews={course.reviewCounts?.toString() || "0"}
                progress={course.progress || 0}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
