import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import GlobalGuard from "@/components/GlobalGuard";
import IdleTimerProvider from "@/components/IdleTimerProvider";

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

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
            <IdleTimerProvider>
              {children}
            </IdleTimerProvider>
          </GlobalGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
