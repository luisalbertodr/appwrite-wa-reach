import { Models } from 'appwrite';
import { Sidebar, SidebarProvider } from '@/components/ui/sidebar'; 
import Header from './Header'; 
import { BottomNavigation } from './BottomNavigation'; 

type AppLayoutProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onNavigate: (path: string) => void;
  currentUser: Models.User<Models.Preferences>;
  children: React.ReactNode; 
};

export const AppLayout = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  onNavigate,
  currentUser,
  children 
}: AppLayoutProps) => {
  
  const handleNavigate = (path: string) => {
    onNavigate(path);
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      
      <SidebarProvider 
        isOpen={isSidebarOpen} 
        onOpenChange={setIsSidebarOpen}
      >
        {/* --- MODIFICACIÓN --- */}
        {/* Quitamos 'onNavigate' ya que los SidebarLink lo reciben del Provider/Contexto */}
        <Sidebar 
          onNavigate={handleNavigate} // Pasamos onNavigate aquí
        />
        {/* --- FIN MODIFICACIÓN --- */}
      </SidebarProvider>

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header 
          onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
          currentUser={currentUser}
        />
        
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
          {children}
        </main>
        
        <BottomNavigation />
      </div>
    </div>
  );
};