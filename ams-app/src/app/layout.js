import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import GlobalGuard from "@/components/GlobalGuard";

export const metadata = {
  title: "AMS - Attendance Monitoring System",
  description: "Smart facial recognition-based attendance monitoring system for DLSU-D. Track, manage, and analyze attendance with cutting-edge technology.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GlobalGuard>
            {children}
          </GlobalGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
