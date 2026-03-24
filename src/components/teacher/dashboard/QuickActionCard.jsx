import React from "react";
import { Link } from "react-router-dom";

export default function QuickActionCard({ icon, label, to = "#" }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center text-center gap-2 p-4 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 text-primary rounded-lg transition-colors"
    >
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
