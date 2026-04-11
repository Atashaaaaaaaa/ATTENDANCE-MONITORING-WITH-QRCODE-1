"use client";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function TeacherLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="teacher" />
      <div className="dashboard-content">
        <DashboardHeader />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
