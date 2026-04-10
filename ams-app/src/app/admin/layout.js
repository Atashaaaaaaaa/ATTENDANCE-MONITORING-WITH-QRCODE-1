import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Admin Dashboard - AMS",
  description: "Manage the Attendance Monitoring System as an administrator.",
};

export default function AdminLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="admin" />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
