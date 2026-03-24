import React, { useState, useEffect } from "react";
import { Spin, message } from "antd";
import { getUserById } from "../../api/user";

export default function TeacherTab({ course }) {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (course?.teacherId) {
      const fetchTeacherData = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await getUserById(course.teacherId);
          setTeacher(response.data || response);
        } catch (err) {
          console.error("Error fetching teacher data:", err);
          setError("Không thể tải thông tin giáo viên");
          message.error("Không thể tải thông tin giáo viên");
        } finally {
          setLoading(false);
        }
      };

      fetchTeacherData();
    }
  }, [course?.teacherId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin />
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="py-8 text-center text-gray-500">
        {error || "Không có thông tin giáo viên"}
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-2xl">
        {/* Teacher Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="flex-shrink-0">
            {teacher.imageUrl ? (
              <img
                alt={`Avatar giảng viên ${teacher.fullName}`}
                className="w-24 h-24 rounded-full object-cover"
                src={teacher.imageUrl}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-semibold">
                {teacher.fullName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">
              {teacher.fullName}
            </h3>
            {/* {teacher.bio && (
              <p className="text-base text-[#617589] dark:text-gray-400 mb-4">
                {teacher.bio}
              </p>
            )} */}

            {/* Teacher Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              {teacher.workPlace && (
                <div>
                  <p className="text-sm font-medium text-[#111418] dark:text-white">
                    Nơi công tác
                  </p>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {teacher.workPlace}
                  </p>
                </div>
              )}

              {teacher.yearsOfExperience && (
                <div>
                  <p className="text-sm font-medium text-[#111418] dark:text-white">
                    Năm kinh nghiệm
                  </p>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {teacher.yearsOfExperience} năm
                  </p>
                </div>
              )}

              {teacher.fieldOfExpertise && (
                <div>
                  <p className="text-sm font-medium text-[#111418] dark:text-white">
                    Lĩnh vực chuyên môn
                  </p>
                  <p className="text-sm text-[#617589] dark:text-gray-400">
                    {teacher.fieldOfExpertise}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Teacher Detailed Bio */}
        {teacher.bio && (
          <div className="border-t border-black/10 dark:border-white/10 pt-8">
            <h4 className="text-lg font-semibold text-[#111418] dark:text-white mb-4">
              Về giáo viên
            </h4>
            <p className="text-base text-[#617589] dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
              {teacher.bio}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
