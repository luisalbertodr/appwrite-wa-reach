import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArticuloFormData, articuloSchema } from '@/lib/validators';
import { Articulo, ArticuloInput, Familia, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetFamilias } from '@/hooks/useArticulos';
import LoadingSpinner from '../LoadingSpinner';

interface ArticuloFormProps {
  articuloInicial?: (Articulo & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<ArticuloInput>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: ArticuloFormData = {
  nombre: '',
  descripcion: '',
  precio: 0,
  tipo: 'servicio',
  familia_id: '',
  stock: 0,
  sesiones_bono: 0,
  activo: true,
};

export const ArticuloForm = ({ articuloInicial, onSubmit, isSubmitting }: ArticuloFormProps) => {
  const { data: familias, isLoading: loadingFamilias } = useGetFamilias();

  const getInitialFormValues = (): ArticuloFormData => {
    if (!articuloInicial) return defaultValues;
    return {
      nombre: articuloInicial.nombre || '',
      descripcion: articuloInicial.descripcion || '',
      precio: articuloInicial.precio || 0,
      tipo: articuloInicial.tipo || 'servicio',
      familia_id: articuloInicial.familia?.$id || articuloInicial.familia_id || '', // Manejar ambos casos
      stock: articuloInicial.stock || 0,
      sesiones_bono: articuloInicial.sesiones_bono || 0,
      activo: articuloInicial.activo ?? true,
    };
  };

  const form = useForm<ArticuloFormData>({
    resolver: zodResolver(articuloSchema),
    defaultValues: getInitialFormValues(),
  });

  const tipoSeleccionado = form.watch('tipo');

  const handleSubmit = async (data: ArticuloFormData) => {
    // Convertir a ArticuloInput (tipo base para Appwrite)
    const finalData: LipooutUserInput<ArticuloInput> = {
        ...data,
        // Asegurar que los campos opcionales sean undefined si no aplican o están vacíos
        descripcion: data.descripcion || undefined,
        stock: data.tipo === 'producto' ? data.stock : undefined,
        sesiones_bono: data.tipo === 'bono' ? data.sesiones_bono : undefined,
    };
    await onSubmit(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">

            <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Nombre *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="descripcion" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Descripción</FormLabel> <FormControl><Textarea {...field} value={field.value ?? ''} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <FormField control={form.control} name="precio" render={({ field }) => ( <FormItem> <FormLabel>Precio (€) *</FormLabel> <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                <FormLabel>Tipo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                    <SelectItem value="servicio">Servicio</SelectItem>
                    <SelectItem value="producto">Producto</SelectItem>
                    <SelectItem value="bono">Bono</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}/>

            <FormField control={form.control} name="familia_id" render={({ field }) => (
                <FormItem>
                <FormLabel>Familia *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={loadingFamilias ? "Cargando..." : "Seleccionar familia..."} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {loadingFamilias ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                        familias?.map((familia: Familia) => (
                            <SelectItem key={familia.$id} value={familia.$id}>{familia.nombre}</SelectItem>
                        ))
                    )}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}/>

            {/* Campos condicionales */}
            {tipoSeleccionado === 'producto' && (
                <FormField control={form.control} name="stock" render={({ field }) => ( <FormItem> <FormLabel>Stock (Uds)</FormLabel> <FormControl><Input type="number" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl> <FormMessage /> </FormItem> )}/>
            )}
             {tipoSeleccionado === 'bono' && (
                <FormField control={form.control} name="sesiones_bono" render={({ field }) => ( <FormItem> <FormLabel>Nº Sesiones (Bono)</FormLabel> <FormControl><Input type="number" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} /></FormControl> <FormMessage /> </FormItem> )}/>
            )}

            <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Artículo Activo</FormLabel>
                       <FormDescription>
                           Los artículos inactivos no aparecerán en el TPV o Agenda.
                       </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting || loadingFamilias}>
            {isSubmitting ? 'Guardando...' : (articuloInicial ? 'Actualizar Artículo' : 'Crear Artículo')}
          </Button>
        </div>
      </form>
    </Form>
  );
};