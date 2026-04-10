import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Student Portal - AMS",
  description: "View your attendance, schedule, and profile as a student.",
};

export default function StudentLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role="student" />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
