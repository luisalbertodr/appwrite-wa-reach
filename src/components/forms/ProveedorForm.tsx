import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProveedorFormData, proveedorSchema } from '@/lib/validators';
import { Proveedor, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProveedorFormProps {
  proveedorInicial?: (Proveedor & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Omit<Proveedor, keyof Models.Document>>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: ProveedorFormData = {
  nombre: '',
  cif: '',
  telefono: '',
  email: '',
  direccion: '',
  ciudad: '',
  codigo_postal: '',
  provincia: '',
  contacto: '',
  activo: true,
};

export const ProveedorForm = ({ proveedorInicial, onSubmit, isSubmitting }: ProveedorFormProps) => {
  const getInitialFormValues = (): ProveedorFormData => {
    if (!proveedorInicial) return defaultValues;
    return {
      nombre: proveedorInicial.nombre || '',
      cif: proveedorInicial.cif || '',
      telefono: proveedorInicial.telefono || '',
      email: proveedorInicial.email || '',
      direccion: proveedorInicial.direccion || '',
      ciudad: proveedorInicial.ciudad || '',
      codigo_postal: proveedorInicial.codigo_postal || '',
      provincia: proveedorInicial.provincia || '',
      contacto: proveedorInicial.contacto || '',
      activo: proveedorInicial.activo ?? true,
    };
  };

  const form = useForm<ProveedorFormData>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: ProveedorFormData) => {
    const finalData: LipooutUserInput<Omit<Proveedor, keyof Models.Document>> = {
      ...data,
      cif: data.cif || undefined,
      telefono: data.telefono || undefined,
      email: data.email || undefined,
      direccion: data.direccion || undefined,
      ciudad: data.ciudad || undefined,
      codigo_postal: data.codigo_postal || undefined,
      provincia: data.provincia || undefined,
      contacto: data.contacto || undefined,
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
              name="cif" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIF/NIF</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="contacto" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="telefono" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="email" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="direccion" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="ciudad" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="codigo_postal" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="provincia" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
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
                    <FormLabel>Proveedor Activo</FormLabel>
                    <FormDescription>
                      Los proveedores inactivos no aparecerán en los listados.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (proveedorInicial ? 'Actualizar Proveedor' : 'Crear Proveedor')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
