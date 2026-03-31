import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ClientLayout from "@/components/layout/ClientLayout";
import { NotificationContainer } from "@/components/Notification";
import UserMenu from "@/components/UserMenu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auton - AI Agent Management Platform",
  description: "Open-source AI CRM for managing SMS, call, and email agents",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <UserMenu isMinimized={false} />
          <NotificationContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
