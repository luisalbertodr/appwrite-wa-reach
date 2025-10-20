import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfigurationFormData, configurationSchema } from '@/lib/validators'; // Importar esquema y tipo
import { Configuracion, LipooutUserInput } from '@/types';
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import LoadingSpinner from '../LoadingSpinner';

interface ConfigurationFormProps {
  configInicial?: (Configuracion & Models.Document) | null;
  onSubmit: (data: LipooutUserInput<Configuracion>) => Promise<void>;
  isSubmitting: boolean;
  isLoading: boolean;
}

// Valores por defecto (se llenarán con los datos cargados)
const defaultValues: ConfigurationFormData = {
  nombreClinica: '',
  direccion: '',
  cif: '',
  emailContacto: '',
  telefonoContacto: '',
  serieFactura: 'FRA',
  seriePresupuesto: 'PRE',
  tipoIvaPredeterminado: 21,
};

export const ConfigurationForm = ({ configInicial, onSubmit, isSubmitting, isLoading }: ConfigurationFormProps) => {

  const form = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationSchema),
    defaultValues: defaultValues,
  });

  // Rellenar el formulario cuando los datos iniciales carguen
  useEffect(() => {
    if (configInicial) {
      form.reset({
        nombreClinica: configInicial.nombreClinica || '',
        direccion: configInicial.direccion || '',
        cif: configInicial.cif || '',
        emailContacto: configInicial.emailContacto || '',
        telefonoContacto: configInicial.telefonoContacto || '',
        serieFactura: configInicial.serieFactura || 'FRA',
        seriePresupuesto: configInicial.seriePresupuesto || 'PRE',
        tipoIvaPredeterminado: configInicial.tipoIvaPredeterminado ?? 21,
      });
    }
  }, [configInicial, form]);


  const handleSubmit = async (data: ConfigurationFormData) => {
    // Solo enviamos los datos del formulario, los contadores no se tocan aquí
    const finalData: LipooutUserInput<Configuracion> = {
        nombreClinica: data.nombreClinica,
        direccion: data.direccion,
        cif: data.cif,
        emailContacto: data.emailContacto,
        telefonoContacto: data.telefonoContacto,
        serieFactura: data.serieFactura,
        seriePresupuesto: data.seriePresupuesto,
        tipoIvaPredeterminado: data.tipoIvaPredeterminado,
    };
    await onSubmit(finalData);
  };

  if (isLoading) {
      return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-w-2xl mx-auto">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField control={form.control} name="nombreClinica" render={({ field }) => ( <FormItem> <FormLabel>Nombre Clínica *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="cif" render={({ field }) => ( <FormItem> <FormLabel>CIF *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="direccion" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Dirección</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="emailContacto" render={({ field }) => ( <FormItem> <FormLabel>Email Contacto</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="telefonoContacto" render={({ field }) => ( <FormItem> <FormLabel>Teléfono Contacto</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="serieFactura" render={({ field }) => ( <FormItem> <FormLabel>Prefijo Facturas *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="seriePresupuesto" render={({ field }) => ( <FormItem> <FormLabel>Prefijo Presupuestos *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
              <FormField control={form.control} name="tipoIvaPredeterminado" render={({ field }) => ( <FormItem> <FormLabel>IVA Predeterminado (%) *</FormLabel> <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl> <FormMessage /> </FormItem> )}/>
         </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </Form>
  );
};