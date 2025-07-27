import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Header from "./header";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={sidebarOpen} isMobile={isMobile} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 overflow-x-hidden">
        <Header 
          onMenuToggle={toggleSidebar} 
          isMobile={isMobile}
        />
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
