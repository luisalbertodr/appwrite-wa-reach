import { Outlet } from 'react-router-dom';
import Header from './Header'; // Verificado
import BottomNavigation from './BottomNavigation'; // Verificado
// Importamos Dashboard aquí solo si la prueba anterior falló y lo dejamos comentado
// import Dashboard from '@/pages/Dashboard';

const AppLayout = () => {
  console.log("AppLayout Rendering"); // Mantenemos para debug

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <Header />
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        {/* Mantenemos el Outlet, ya que la prueba anterior mostró el debug text */}
        <Outlet />
        {/* <p style={{ color: 'red', fontWeight: 'bold' }}>BEFORE OUTLET AREA</p> */}
        {/* <Dashboard /> */}
        {/* <p style={{ color: 'blue', fontWeight: 'bold' }}>AFTER OUTLET AREA</p> */}
      </main>
      <BottomNavigation />
    </div>
  );
};

export default AppLayout;