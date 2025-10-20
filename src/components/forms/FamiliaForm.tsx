import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FamiliaFormData, familiaSchema } from '@/lib/validators'; // Importar esquema y tipo
import { Familia, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FamiliaFormProps {
  familiaInicial?: (Familia & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Familia>) => Promise<void>;
  isSubmitting: boolean;
}

const defaultValues: FamiliaFormData = {
  nombre: '',
  descripcion: '',
  icono: '',
};

export const FamiliaForm = ({ familiaInicial, onSubmit, isSubmitting }: FamiliaFormProps) => {
  
  const getInitialFormValues = (): FamiliaFormData => {
    if (!familiaInicial) return defaultValues;
    return {
      nombre: familiaInicial.nombre || '',
      descripcion: familiaInicial.descripcion || '',
      icono: familiaInicial.icono || '',
    };
  };

  const form = useForm<FamiliaFormData>({
    resolver: zodResolver(familiaSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: FamiliaFormData) => {
    const finalData: LipooutUserInput<Familia> = {
      ...data,
      descripcion: data.descripcion || undefined,
      icono: data.icono || undefined,
    };
    await onSubmit(finalData);
    if (!familiaInicial) { // Reset form only if creating
        form.reset(defaultValues);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl><Textarea {...field} value={field.value ?? ''} rows={3} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="icono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icono (Opcional)</FormLabel>
              <FormControl><Input {...field} value={field.value ?? ''} placeholder="ej: 'heart'" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (familiaInicial ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      </form>
    </Form>
  );
};