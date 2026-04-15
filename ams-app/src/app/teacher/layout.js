"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function TeacherLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar role="teacher" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dashboard-content">
        <DashboardHeader onMenuToggle={() => setSidebarOpen(true)} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
