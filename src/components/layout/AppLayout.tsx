import { Outlet } from 'react-router-dom';
import Header from './Header';
import { BottomNavigation } from './BottomNavigation';
import { useUser } from '@/hooks/useAuth';
import AuthForm from '@/components/AuthForm';
import LoadingSpinner from '../LoadingSpinner';

export const AppLayout = () => {
  const { data: user, isLoading: loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <AuthForm onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <Header />
      <main className="flex-1 p-4 sm:p-6 pb-28">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};
