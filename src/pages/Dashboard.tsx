import { useGetCitasPorDia } from '@/hooks/useAgenda'; // Importamos el hook de citas
import { Cita } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import LoadingSpinner from '@/components/LoadingSpinner';
import { format, parseISO, isToday } from 'date-fns'; // Para manejar fechas
import { es } from 'date-fns/locale';
import { CalendarCheck2, Users, Euro } from 'lucide-react'; // Iconos para KPIs

const Dashboard = () => {
  // Obtenemos las citas para el día de hoy
  const hoy = new Date();
  const { data: citasHoy, isLoading: loadingCitas, error: errorCitas } = useGetCitasPorDia(hoy);

  // KPIs de ejemplo (podrían venir de otros hooks o cálculos)
  const kpiClientesActivos = 125; // Placeholder
  const kpiFacturacionMes = 4580.50; // Placeholder

  const renderCitasHoy = () => {
    if (loadingCitas) {
      return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
    }
    if (errorCitas) {
      return <p className="text-center text-destructive py-8">Error al cargar las citas de hoy.</p>;
    }
    if (!citasHoy || citasHoy.length === 0) {
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
          {citasHoy.filter(cita => isToday(parseISO(cita.fecha_hora_inicio))).map((cita: Cita) => ( // Doble check por si la query trae de más
            <TableRow key={cita.$id}>
              <TableCell className="font-medium">
                {format(parseISO(cita.fecha_hora_inicio), 'HH:mm')}
              </TableCell>
              <TableCell>{cita.cliente?.nombre_completo || cita.cliente_id}</TableCell>
              <TableCell>{cita.articulo?.nombre || cita.articulo_id}</TableCell>
              <TableCell>{cita.empleado?.nombre_completo || cita.empleado_id}</TableCell>
              <TableCell>{cita.estado}</TableCell> {/* Podríamos usar Badge aquí */}
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

      {/* Sección de KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingCitas ? '...' : citasHoy?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Citas programadas para hoy</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiClientesActivos}</div>
            <p className="text-xs text-muted-foreground">En el último mes (ejemplo)</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación (Mes)</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiFacturacionMes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
            <p className="text-xs text-muted-foreground">Mes actual (ejemplo)</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Citas del Día */}
      <Card>
        <CardHeader>
          <CardTitle>Citas de Hoy ({format(hoy, 'dd MMMM yyyy', { locale: es })})</CardTitle>
          <CardDescription>Resumen de las citas programadas para la jornada actual.</CardDescription>
        </CardHeader>
        <CardContent className="p-0"> {/* Quitamos padding para que la tabla llegue a los bordes */}
          {renderCitasHoy()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;