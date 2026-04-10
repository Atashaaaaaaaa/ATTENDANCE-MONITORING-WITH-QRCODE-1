import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Teacher Dashboard - AMS",
  description: "Manage class attendance, schedules, and reports as a teacher.",
};

export default function TeacherLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="teacher" />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
