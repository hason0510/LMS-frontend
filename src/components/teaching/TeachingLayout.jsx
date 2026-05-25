import React from "react";
import Header from "../layout/Header";

export default function TeachingLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
