export default function DescriptionCourse({ description }) {
    return (
        <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <h3 className="text-xl font-bold text-[#111418] dark:text-white">Mô tả chi tiết</h3>
            <div className="whitespace-pre-wrap">
                {description || "Chưa có mô tả cho khóa học này."}
            </div>
        </div>
    );
}
