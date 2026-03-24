import React, { useState, useEffect } from 'react'
import Header from '../../components/layout/Header'
import CourseCard from '../../components/course/CourseCard'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom';
import { getAllCourses } from '../../api/course';
import { getAllCategories } from '../../api/category';
import { Spin } from 'antd';
import { FolderIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch courses
      const coursesResponse = await getAllCourses(1, 8);
      const coursesList = coursesResponse.data?.pageList || [];
      setFeaturedCourses(coursesList);
      
      // Fetch categories
      const categoriesResponse = await getAllCategories(1, 10);
      const categoriesList = categoriesResponse.data?.pageList || [];
      setCategories(categoriesList);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Lỗi khi tải dữ liệu');
      // Fallback to empty arrays so page still renders
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
        <section className="flex justify-center sm:py-20 px-4 sm:px-6 lg:px-8 mb-10">
          <div className="w-full max-w-7xl">
            <div className="container mx-auto">
              <div className="flex flex-col-reverse gap-8 lg:flex-row lg:items-center">
                <div className="flex flex-col gap-6 w-full lg:w-1/2 lg:justify-center">
                  <div className="flex flex-col gap-4 text-left">
                    <h1 className="text-4xl font-black leading-tight lg:text-5xl text-[#111418] dark:text-white">Nâng tầm kỹ năng của bạn ngay hôm nay</h1>
                    <h2 className="text-base text-slate-600 dark:text-slate-300">Tham gia cùng hàng ngàn học viên và bắt đầu hành trình chinh phục kiến thức với các khóa học chất lượng cao từ những chuyên gia hàng đầu.</h2>
                  </div>
                  <button className="group flex min-w-[84px] max-w-[480px] w-fit cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-base font-bold gap-2"
                    onClick={() => navigate('/courses')}>
                    <span>Khám phá các khóa học</span>
                    <ArrowRightIcon className="h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-2" />
                  </button>
                </div>
                <div className="w-full lg:w-1/2 bg-center bg-no-repeat aspect-video bg-cover rounded-xl" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBsBflg-7NULKvHD8od6_IRJSOIerdq3F5uBjqNwjpYk7qMmOxXgPodPszPJyyCUf_luVmTHVOn17QLSMZZSFKId8pjQATSbyqWagwO3kW5TDg8nm9lBEedZx5JURm9Of3s63cc099CZwJqcW_M0uQdDZRketFz-0sVhO1iC0WffnQ-K3fXRI4UdDXK-wVQXHwq7YWXWoox7avcvI2Z__hH16kUB4CaflI6EBlZpT3orta1vadps8UJH_mMqXXnKimFvxuSgkv-oKY)' }} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex justify-center px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex flex-col w-full max-w-7xl">
            <h2 className="text-3xl font-bold leading-tight px-4 pb-6 text-[#111418] dark:text-white">Khóa học nổi bật</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : (
              <div className="flex overflow-x-auto -mx-4 scrollbar-hide p-4 gap-6">
                {featuredCourses.length > 0 ? (
                  featuredCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      id={course.id}
                      title={course.name}
                      author={course.teacherName}
                      image={course.imageUrl}
                      rating={course.rating || 0}
                      reviews={course.reviewCounts || 0}
                      type={course.description || 'Unknown'}
                      status={course.status || 'published'}
                      code={course.courseCode}
                      studentsCount={course.studentsCount || 0}
                      schedule="Weekly"
                    />
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 col-span-full ml-4">Không có khóa học nào</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex justify-center px-4 sm:px-6 lg:px-8 mb-10">
          <div className="flex flex-col w-full max-w-7xl">
            <h2 className="text-3xl font-bold leading-tight px-4 pb-6 text-[#111418] dark:text-white">Danh mục khóa học</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div 
                      key={category.id}
                      onClick={() => navigate(`/courses?category=${category.id}`)}
                      className="flex items-center gap-4 rounded-xl p-4 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                    >
                      <div className="flex items-center justify-center size-12 rounded-lg bg-primary/20 text-primary flex-shrink-0">
                        <FolderIcon className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-[#111418] dark:text-white">{category.title}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{category.description}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 col-span-full">Không có danh mục nào</p>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex justify-center px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-col items-center text-center w-full max-w-7xl gap-10">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold leading-tight tracking-[-0.015em] text-[#111418] dark:text-white">Tại sao chọn LearnOnline?</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-2xl">Chúng tôi cung cấp một môi trường học tập linh hoạt và hiệu quả, giúp bạn đạt được mục tiêu nhanh hơn.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white dark:bg-slate-800/50">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary">
                  <span className="material-symbols-outlined !text-4xl">schedule</span>
                </div>
                <h3 className="text-xl font-bold text-[#111418] dark:text-white">Học mọi lúc, mọi nơi</h3>
                <p className="text-slate-600 dark:text-slate-300">Truy cập khóa học từ bất kỳ thiết bị nào, học theo lịch trình của riêng bạn.</p>
              </div>
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white dark:bg-slate-800/50">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary">
                  <span className="material-symbols-outlined !text-4xl">school</span>
                </div>
                <h3 className="text-xl font-bold text-[#111418] dark:text-white">Giảng viên hàng đầu</h3>
                <p className="text-slate-600 dark:text-slate-300">Học hỏi từ các chuyên gia có kinh nghiệm thực tế trong ngành.</p>
              </div>
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-white dark:bg-slate-800/50">
                <div className="flex items-center justify-center size-16 rounded-full bg-primary/20 text-primary">
                  <span className="material-symbols-outlined !text-4xl">route</span>
                </div>
                <h3 className="text-xl font-bold text-[#111418] dark:text-white">Lộ trình cá nhân hóa</h3>
                <p className="text-slate-600 dark:text-slate-300">Xây dựng lộ trình học tập phù hợp với mục tiêu và trình độ của bạn.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
