import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AparatoFormData, aparatoSchema } from '@/lib/validators';
import { Aparato, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetProveedores } from '@/hooks/useProveedores';

interface AparatoFormProps {
  aparatoInicial?: (Aparato & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Omit<Aparato, keyof Models.Document>>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: AparatoFormData = {
  nombre: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  fecha_compra: '',
  fecha_proximo_mantenimiento: '',
  proveedor_id: '',
  activo: true,
};

export const AparatoForm = ({ aparatoInicial, onSubmit, isSubmitting }: AparatoFormProps) => {
  const { data: proveedores, isLoading: loadingProveedores } = useGetProveedores();

  const getInitialFormValues = (): AparatoFormData => {
    if (!aparatoInicial) return defaultValues;
    return {
      nombre: aparatoInicial.nombre || '',
      marca: aparatoInicial.marca || '',
      modelo: aparatoInicial.modelo || '',
      numero_serie: aparatoInicial.numero_serie || '',
      fecha_compra: aparatoInicial.fecha_compra || '',
      fecha_proximo_mantenimiento: aparatoInicial.fecha_proximo_mantenimiento || '',
      proveedor_id: aparatoInicial.proveedor_id || '',
      activo: aparatoInicial.activo ?? true,
    };
  };

  const form = useForm<AparatoFormData>({
    resolver: zodResolver(aparatoSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: AparatoFormData) => {
    const finalData: LipooutUserInput<Omit<Aparato, keyof Models.Document>> = {
      ...data,
      marca: data.marca || undefined,
      modelo: data.modelo || undefined,
      numero_serie: data.numero_serie || undefined,
      fecha_compra: data.fecha_compra || undefined,
      fecha_proximo_mantenimiento: data.fecha_proximo_mantenimiento || undefined,
      proveedor_id: data.proveedor_id || undefined,
    };
    await onSubmit(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">

            <FormField 
              control={form.control} 
              name="nombre" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="marca" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="modelo" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="numero_serie" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Número de Serie</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="fecha_compra" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Compra</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="fecha_proximo_mantenimiento" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próximo Mantenimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="proveedor_id" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProveedores ? "Cargando..." : "Seleccionar proveedor..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin proveedor</SelectItem>
                      {loadingProveedores ? (
                        <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : (
                        proveedores?.map((proveedor) => (
                          <SelectItem key={proveedor.$id} value={proveedor.$id}>
                            {proveedor.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Aparato Activo</FormLabel>
                    <FormDescription>
                      Los aparatos inactivos no aparecerán disponibles para agendar citas.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting || loadingProveedores}>
            {isSubmitting ? 'Guardando...' : (aparatoInicial ? 'Actualizar Aparato' : 'Crear Aparato')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
