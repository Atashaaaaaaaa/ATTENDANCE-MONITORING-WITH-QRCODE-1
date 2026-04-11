"use client";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function StudentLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="student" />
      <div className="dashboard-content">
        <DashboardHeader />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
