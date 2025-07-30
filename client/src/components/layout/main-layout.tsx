import { ReactNode, useState, useEffect, createContext, useContext } from "react";
import Sidebar from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

interface LayoutContextType {
  toggleSidebar: () => void;
  isMobile: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within MainLayout');
  }
  return context;
};

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
    <LayoutContext.Provider value={{ toggleSidebar, isMobile }}>
      <div className="min-h-screen flex bg-background">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 dark:bg-black/80"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <Sidebar isOpen={sidebarOpen} isMobile={isMobile} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </LayoutContext.Provider>
  );
}
