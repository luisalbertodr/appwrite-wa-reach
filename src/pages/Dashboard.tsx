import { useGetCitasPorDia } from '@/hooks/useAgenda'; // Hook de citas
import { useGetClientes } from '@/hooks/useClientes'; // Hook de clientes
import { useGetFacturas } from '@/hooks/useFacturas'; // Hook de facturas
import { Cita, Factura } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isToday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'; // Manejo de fechas
import { es } from 'date-fns/locale';
import { CalendarCheck2, Users, Euro } from 'lucide-react'; // Iconos para KPIs

const Dashboard = () => {
  const hoy = new Date();
  const inicioMes = startOfMonth(hoy);
  const finMes = endOfMonth(hoy);

  // --- Conexión a Hooks Reales ---
  const { data: citasHoy, isLoading: loadingCitas, error: errorCitas } = useGetCitasPorDia(hoy);
  // Pedimos clientes (aunque useGetClientes puede estar limitado a 100, usamos length por ahora)
  const { data: clientes, isLoading: loadingClientes } = useGetClientes(); 
  // Pedimos facturas (para calcular facturación del mes)
  const { data: facturas, isLoading: loadingFacturas } = useGetFacturas(undefined, 'cobrada'); // Solo cobradas

  // --- Cálculo de KPIs ---
  
  // KPI: Clientes Activos (usamos el total de clientes por ahora)
  const kpiClientesActivos = clientes?.length ?? 0;
  const kpiLoadingClientes = loadingClientes;

  // KPI: Facturación del Mes
  const kpiFacturacionMes = facturas
    ? facturas.reduce((total, factura: Factura) => {
        const fechaFactura = parseISO(factura.fechaEmision);
        if (isWithinInterval(fechaFactura, { start: inicioMes, end: finMes })) {
          return total + (factura.totalAPagar || 0);
        }
        return total;
      }, 0)
    : 0;
  const kpiLoadingFacturacion = loadingFacturas;


  // --- Renderizado Citas de Hoy ---
  const renderCitasHoy = () => {
    if (loadingCitas) {
      return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
    }
    if (errorCitas) {
      return <p className="text-center text-destructive py-8">Error al cargar las citas de hoy.</p>;
    }
    
    // Filtramos en cliente por si la query trae de más (aunque getCitasPorDia debería ser precisa)
     const citasFiltradas = citasHoy?.filter(cita => isToday(parseISO(cita.fecha_hora_inicio))) || [];

    if (citasFiltradas.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No hay citas programadas para hoy.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Hora</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tratamiento</TableHead>
            <TableHead>Profesional</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {citasFiltradas.map((cita: Cita) => (
            <TableRow key={cita.$id}>
              <TableCell className="font-medium">
                {format(parseISO(cita.fecha_hora_inicio), 'HH:mm')}
              </TableCell>
              <TableCell>{cita.cliente?.nombre_completo || cita.cliente_id}</TableCell>
              <TableCell>{cita.articulo?.nombre || cita.articulo_id}</TableCell>
              <TableCell>{cita.empleado?.nombre_completo || cita.empleado_id}</TableCell>
              <TableCell>{cita.estado}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de la actividad de hoy y métricas clave.</p>
      </div>

      {/* Sección de KPIs (Conectada) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingCitas ? '...' : citasHoy?.filter(c => isToday(parseISO(c.fecha_hora_inicio))).length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Citas programadas para hoy</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiLoadingClientes ? '...' : kpiClientesActivos}</div>
            <p className="text-xs text-muted-foreground">Clientes en la base de datos</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación (Mes)</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {kpiLoadingFacturacion ? '...' : kpiFacturacionMes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-xs text-muted-foreground">Facturas cobradas este mes</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Citas del Día */}
      <Card>
        <CardHeader>
          <CardTitle>Citas de Hoy ({format(hoy, 'dd MMMM yyyy', { locale: es })})</CardTitle>
          <CardDescription>Resumen de las citas programadas para la jornada actual.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {renderCitasHoy()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;