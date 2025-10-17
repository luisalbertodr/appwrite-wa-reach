import { useGetFacturas } from '@/hooks/useFacturas'; // Importamos el hook
import { Factura } from '@/types'; // Importamos el tipo
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns'; // Para formatear fechas
import { es } from 'date-fns/locale'; // Para formato español

// Helper para traducir estados (puedes moverlo a utils si se usa en más sitios)
const traducirEstadoFactura = (estado: string): string => {
  switch (estado) {
    case 'borrador': return 'Borrador';
    case 'finalizada': return 'Finalizada';
    case 'cobrada': return 'Cobrada';
    case 'anulada': return 'Anulada';
    case 'presupuesto': return 'Presupuesto';
    default: return estado;
  }
};

const Facturacion = () => {
  // Usamos el hook para obtener todas las facturas/presupuestos
  const { data: facturas, isLoading, error } = useGetFacturas();

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner className="mt-16" />;
    }

    if (error) {
      return <p className="text-center text-destructive">Error al cargar facturas: {error.message}</p>;
    }

    if (!facturas || facturas.length === 0) {
      return <p className="text-center text-muted-foreground mt-8">No se encontraron facturas ni presupuestos.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {facturas.map((factura: Factura) => (
            <TableRow key={factura.$id}>
              <TableCell className="font-medium">{factura.numeroFactura}</TableCell>
              <TableCell>
                {format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es })}
              </TableCell>
              {/* Mostramos nombre del cliente (necesitaría cargar el objeto completo o buscarlo) */}
              <TableCell>{factura.cliente?.nombre_completo || factura.cliente_id}</TableCell>
              <TableCell className="text-right">
                 {factura.totalAPagar.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </TableCell>
              <TableCell>
                <Badge variant={factura.estado === 'cobrada' ? 'default' : factura.estado === 'anulada' ? 'destructive' : 'secondary'}>
                    {traducirEstadoFactura(factura.estado)}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Ver/Editar</DropdownMenuItem>
                    <DropdownMenuItem>Descargar PDF</DropdownMenuItem>
                    {factura.estado !== 'anulada' && <DropdownMenuItem className="text-destructive">Anular</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">Gestión de facturas y presupuestos.</p>
        </div>
        <Button>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nueva Factura / Presupuesto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturas y Presupuestos</CardTitle>
          {/* Aquí irán los filtros (por cliente, estado, fechas) */}
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Facturacion;