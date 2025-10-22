import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmpleadoFormData, empleadoSchema } from '@/lib/validators'; // Importar esquema y tipo
import { Empleado, LipooutUserInput } from '@/types'; // Tipos completos
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmpleadoFormProps {
  empleadoInicial?: (Empleado & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Empleado>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: EmpleadoFormData = {
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  rol: 'Recepción', // Rol por defecto
  activo: true,
};

export const EmpleadoForm = ({ empleadoInicial, onSubmit, isSubmitting }: EmpleadoFormProps) => {

  const getInitialFormValues = (): EmpleadoFormData => {
    if (!empleadoInicial) return defaultValues;
    return {
      nombre: empleadoInicial.nombre || '',
      apellidos: empleadoInicial.apellidos || '',
      email: empleadoInicial.email || '',
      telefono: empleadoInicial.telefono || '',
      rol: empleadoInicial.rol || 'Recepción',
      activo: empleadoInicial.activo ?? true,
    };
  };

  const form = useForm<EmpleadoFormData>({
    resolver: zodResolver(empleadoSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: EmpleadoFormData) => {
    // Calcular campos derivados
    const nombre_completo = `${data.nombre || ''} ${data.apellidos || ''}`.trim();

    // Crear el objeto final para Appwrite
    const finalData: LipooutUserInput<Empleado> = {
        ...data,
        nombre_completo,
        telefono: data.telefono || undefined, // Asegurar undefined si está vacío
    };

    await onSubmit(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Usamos ScrollArea por si añadimos más campos (ej. horarios) */}
        <ScrollArea className="h-[60vh] p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">

            {/* --- Campos del Formulario --- */}
            <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem> <FormLabel>Nombre *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="apellidos" render={({ field }) => ( <FormItem> <FormLabel>Apellidos *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email *</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="telefono" render={({ field }) => ( <FormItem> <FormLabel>Teléfono</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>

            <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Médico">Médico</SelectItem>
                        <SelectItem value="Recepción">Recepción</SelectItem>
                        <SelectItem value="Lectura">Lectura</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <div></div> {/* Espacio vacío */}

             <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Empleado Activo</FormLabel>
                       <FormDescription>
                           Los empleados inactivos no aparecerán en selectores (ej. Agenda).
                       </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (empleadoInicial ? 'Actualizar Empleado' : 'Crear Empleado')}
          </Button>
        </div>
      </form>
    </Form>
  );
};