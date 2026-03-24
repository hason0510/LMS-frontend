import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function MyCertificate() {
  const { t } = useTranslation();
  const certificates = [
    {
      id: 1,
      title: "Chứng chỉ hoàn thành: Thiết kế UI/UX",
      course: "Nguyên lý thiết kế UI/UX nâng cao",
      date: "15/06/2023",
    },
    {
      id: 2,
      title: "Chứng chỉ thành tích: Digital Marketing",
      course: "Khóa học Digital Marketing toàn diện",
      date: "20/04/2023",
    },
    {
      id: 3,
      title: "Chứng chỉ hoàn thành: Lập trình Python",
      course: "Python cho người mới bắt đầu - Từ Zero đến Hero",
      date: "01/02/2023",
    },
  ];

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 pb-6 border-b border-black/10 dark:border-white/10">
        <div className="flex min-w-72 flex-col gap-2">
          <p className="text-3xl font-bold tracking-tight text-[#111418] dark:text-white">
            {t("profile.chungChiCuaToi")}
          </p>
          <p className="text-[#617589] dark:text-gray-400 text-base font-normal leading-normal">
            {t("profile.xemTatCaChungChi")}
          </p>
        </div>
      </div>
      <div className="py-6 flex flex-col gap-4">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center p-4 border border-black/10 dark:border-white/10 rounded-lg"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold leading-normal text-[#111418] dark:text-white">
                {cert.title}
              </h3>
              <p className="text-sm font-normal text-[#617589] dark:text-gray-400">
                {t("profile.khoaHoc")}: {cert.course}
              </p>
              <p className="text-sm font-normal text-[#617589] dark:text-gray-400">
                {t("profile.ngayCap")}: {cert.date}
              </p>
            </div>
            <div className="flex gap-2 justify-start md:justify-end">
              <button className="flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-bold leading-normal tracking-[-0.015em] hover:bg-primary/90 transition-colors gap-2">
                {t("profile.taiXuong")}
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
