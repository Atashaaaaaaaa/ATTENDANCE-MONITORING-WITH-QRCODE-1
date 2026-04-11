"use client";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="admin" />
      <div className="dashboard-content">
        <DashboardHeader />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
