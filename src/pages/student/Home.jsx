import React, { useState, useEffect } from 'react'
import Header from '../../components/layout/Header'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom';
import { getClassSections } from '../../api/classSection';
import { getAllCategories } from '../../api/category';
import { Spin } from 'antd';
import { FolderIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesList, categoriesResponse] = await Promise.all([
        getClassSections({ status: 'PUBLIC', pageNumber: 1, pageSize: 8 }),
        getAllCategories(1, 10),
      ]);
      setFeaturedCourses(Array.isArray(coursesList) ? coursesList : []);
      setCategories(categoriesResponse.data?.pageList || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setFeaturedCourses([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-white">
      <Header />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="flex justify-center py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-7xl">
            <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-center">
              <div className="flex flex-col gap-6 w-full lg:w-1/2 lg:justify-center">
                <div className="flex flex-col gap-4 text-left">
                  <h1 className="text-4xl font-black leading-tight lg:text-5xl text-[#111418] dark:text-white">
                    Nâng tầm kỹ năng của bạn ngay hôm nay
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-300">
                    Tham gia cùng hàng ngàn học viên và bắt đầu hành trình chinh phục kiến thức với các lớp học chất lượng cao từ những chuyên gia hàng đầu.
                  </p>
                </div>
                <button
                  className="group flex min-w-[84px] max-w-[480px] w-fit cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold gap-2"
                  onClick={() => navigate('/classes')}
                >
                  <span>Khám phá các lớp học</span>
                  <ArrowRightIcon className="h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-2" />
                </button>
              </div>
              <div
                className="w-full lg:w-1/2 bg-center bg-no-repeat aspect-video bg-cover rounded-2xl shadow-lg"
                style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBsBflg-7NULKvHD8od6_IRJSOIerdq3F5uBjqNwjpYk7qMmOxXgPodPszPJyyCUf_luVmTHVOn17QLSMZZSFKId8pjQATSbyqWagwO3kW5TDg8nm9lBEedZx5JURm9Of3s63cc099CZwJqcW_M0uQdDZRketFz-0sVhO1iC0WffnQ-K3fXRI4UdDXK-wVQXHwq7YWXWoox7avcvI2Z__hH16kUB4CaflI6EBlZpT3orta1vadps8UJH_mMqXXnKimFvxuSgkv-oKY)' }}
              />
            </div>
          </div>
        </section>

        {/* ── Featured PUBLIC Classes ── */}
        <section className="flex justify-center px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex flex-col w-full max-w-7xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-[#111418] dark:text-white">Lớp học nổi bật</h2>
              <button
                onClick={() => navigate('/classes')}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Xem tất cả <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Spin size="large" />
              </div>
            ) : featuredCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {featuredCourses.map((course) => (
                  <PublicClassCard
                    key={course.id}
                    course={course}
                    onClick={() => navigate(`/class-sections/${course.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-3">
                <span className="material-symbols-outlined !text-5xl opacity-40">school</span>
                <p className="text-base">Chưa có lớp học công khai nào.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="flex justify-center px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex flex-col w-full max-w-7xl">
            <h2 className="text-3xl font-bold text-[#111418] dark:text-white mb-6">Danh mục chủ đề</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => navigate(`/classes?category=${category.id}`)}
                    className="flex items-center gap-4 rounded-xl p-4 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center size-12 rounded-lg bg-primary/20 text-primary flex-shrink-0">
                      <FolderIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-base text-[#111418] dark:text-white truncate">{category.title}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{category.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Không có danh mục nào.</p>
            )}
          </div>
        </section>

        {/* ── Why LearnOnline ── */}
        <section className="flex justify-center px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col items-center text-center w-full max-w-7xl gap-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold tracking-[-0.015em] text-[#111418] dark:text-white">Tại sao chọn LearnOnline?</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-2xl">Chúng tôi cung cấp một môi trường học tập linh hoạt và hiệu quả, giúp bạn đạt được mục tiêu nhanh hơn thông qua các lớp học thực tiễn.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {[
                { icon: 'schedule', title: 'Học mọi lúc, mọi nơi', desc: 'Truy cập lớp học từ bất kỳ thiết bị nào, học theo lịch trình của riêng bạn.' },
                { icon: 'school', title: 'Giảng viên hàng đầu', desc: 'Học hỏi từ các chuyên gia có kinh nghiệm thực tế trong ngành.' },
                { icon: 'route', title: 'Lộ trình cá nhân hóa', desc: 'Xây dựng lộ trình học tập phù hợp với mục tiêu và trình độ của bạn.' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white dark:bg-slate-800/50">
                  <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary">
                    <span className="material-symbols-outlined !text-4xl">{item.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#111418] dark:text-white">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

/* ── Card for public class display ── */
function PublicClassCard({ course, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col rounded-xl overflow-hidden bg-white dark:bg-slate-800/60 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-slate-100 dark:border-slate-700/50"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img
          src={course.imageUrl || ''}
          alt={course.title || course.classCode}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.classList.add('flex', 'items-center', 'justify-center');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
          Công khai
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-bold text-base text-[#111418] dark:text-white line-clamp-2 leading-snug">
          {course.title || course.classCode}
        </h3>
        {course.teacherName && (
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {course.teacherName}
          </p>
        )}
        {course.classCode && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            #{course.classCode}
          </p>
        )}
        <div className="mt-auto pt-3">
          <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white text-sm font-semibold py-2 transition-colors duration-200">
            Xem chi tiết
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
