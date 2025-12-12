"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./global.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HRNavbar from "@/components/hr/HRNavbar";
import HRFooter from "@/components/hr/HRFooter";
import { ToastContainer } from "react-toastify";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/context/AppContext";
import { Sonner } from "@/components/ui/sonnerCourse";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { TanstackProvider } from "@/components/providers/TanstackProvider";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const hideNavAndFooter = pathname === "/atsresume/createresume";
  const isHRPage = pathname.startsWith("/hr");
  const paddingClass = hideNavAndFooter ? "pt-1" : "pt-16";

  return (
    <html lang="en" className="bg-[#11011E]">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextTopLoader
          color="#0FAE96"
          showSpinner={false}
        />
        <TanstackProvider>
          <TooltipProvider>
            <AppProvider>
              <ToastContainer />
              <Sonner />
              {!hideNavAndFooter && (isHRPage ? <HRNavbar /> : <Navbar />)}
              <main className={paddingClass}>{children}</main>
              {!hideNavAndFooter && (isHRPage ? <HRFooter /> : <Footer />)}
            </AppProvider>
          </TooltipProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
