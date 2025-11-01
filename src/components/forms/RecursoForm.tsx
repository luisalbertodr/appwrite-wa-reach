import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RecursoFormData, recursoSchema } from '@/lib/validators';
import { Recurso, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecursoFormProps {
  recursoInicial?: (Recurso & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Omit<Recurso, keyof Models.Document>>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: RecursoFormData = {
  nombre: '',
  descripcion: '',
  tipo: 'cabina',
  activo: true,
  color: '#3b82f6',
};

export const RecursoForm = ({ recursoInicial, onSubmit, isSubmitting }: RecursoFormProps) => {
  const getInitialFormValues = (): RecursoFormData => {
    if (!recursoInicial) return defaultValues;
    return {
      nombre: recursoInicial.nombre || '',
      descripcion: recursoInicial.descripcion || '',
      tipo: recursoInicial.tipo || 'cabina',
      activo: recursoInicial.activo ?? true,
      color: recursoInicial.color || '#3b82f6',
    };
  };

  const form = useForm<RecursoFormData>({
    resolver: zodResolver(recursoSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: RecursoFormData) => {
    const finalData: LipooutUserInput<Omit<Recurso, keyof Models.Document>> = {
      ...data,
      descripcion: data.descripcion || undefined,
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
              name="tipo" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cabina">Cabina</SelectItem>
                      <SelectItem value="equipos">Equipos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="color" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field} value={field.value ?? '#3b82f6'} />
                  </FormControl>
                  <FormDescription>
                    Color para identificar visualmente el recurso en la agenda
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control} 
              name="descripcion" 
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={3} />
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
                    <FormLabel>Recurso Activo</FormLabel>
                    <FormDescription>
                      Los recursos inactivos no aparecerán disponibles para agendar citas.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (recursoInicial ? 'Actualizar Recurso' : 'Crear Recurso')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
