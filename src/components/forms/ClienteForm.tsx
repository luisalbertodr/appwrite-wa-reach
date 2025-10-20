import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClienteFormData, clienteSchema } from '@/lib/validators'; // Importar esquema y tipo
import { Cliente, LipooutUserInput } from '@/types'; // Importar tipo Cliente completo
import { Models } from 'appwrite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; // shadcn form components
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatISO } from 'date-fns';

interface ClienteFormProps {
  clienteInicial?: (Cliente & Models.Document) | null; // Datos para editar
  onSubmit: (data: LipooutUserInput<Cliente>) => Promise<void>; // Función a llamar al guardar
  isSubmitting: boolean; // Para deshabilitar botón mientras guarda
}

// Valores por defecto para un nuevo cliente
const defaultValues: ClienteFormData = {
  codcli: '',
  nomcli: '',
  ape1cli: '',
  email: '',
  dnicli: '',
  dircli: '',
  codposcli: '',
  pobcli: '',
  procli: '',
  tel1cli: '',
  tel2cli: '',
  fecnac: '',
  sexo: undefined,
  fecalta: formatISO(new Date(), { representation: 'date' }), // Hoy por defecto
  enviar: 1, // Por defecto permitir envío
  facturacion: 0,
  intereses: [],
};

export const ClienteForm = ({ clienteInicial, onSubmit, isSubmitting }: ClienteFormProps) => {
  // Convertir datos iniciales al formato del formulario (especialmente fechas y arrays)
  const getInitialFormValues = (): ClienteFormData => {
    if (!clienteInicial) return defaultValues;
    return {
      codcli: clienteInicial.codcli || '',
      nomcli: clienteInicial.nomcli || '',
      ape1cli: clienteInicial.ape1cli || '',
      email: clienteInicial.email || '',
      dnicli: clienteInicial.dnicli || '',
      dircli: clienteInicial.dircli || '',
      codposcli: clienteInicial.codposcli || '',
      pobcli: clienteInicial.pobcli || '',
      procli: clienteInicial.procli || '',
      tel1cli: clienteInicial.tel1cli || '',
      tel2cli: clienteInicial.tel2cli || '',
      fecnac: clienteInicial.fecnac ? formatISO(new Date(clienteInicial.fecnac), { representation: 'date' }) : '',
      sexo: clienteInicial.sexo || undefined,
      fecalta: clienteInicial.fecalta ? formatISO(new Date(clienteInicial.fecalta), { representation: 'date' }) : '',
      enviar: clienteInicial.enviar ?? 1, // Usar 1 si es undefined
      facturacion: clienteInicial.facturacion || 0,
      intereses: clienteInicial.intereses || [],
    };
  };

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: getInitialFormValues(),
  });

  const handleSubmit = async (data: ClienteFormData) => {
    // Calcular campos derivados
    const nombre_completo = `${data.nomcli || ''} ${data.ape1cli || ''}`.trim();
    const edad = data.fecnac ? calculateAge(data.fecnac) : undefined;

    // Convertir fechas a formato correcto si es necesario, asegurar undefined si están vacías
    const fecnacISO = data.fecnac ? formatISO(new Date(data.fecnac)) : undefined;
    const fecaltaISO = data.fecalta ? formatISO(new Date(data.fecalta)) : undefined;

    // Crear el objeto final para enviar a Appwrite (LipooutUserInput<Cliente>)
    const finalData: LipooutUserInput<Cliente> = {
        ...data,
        fecnac: fecnacISO,
        fecalta: fecaltaISO,
        nombre_completo,
        edad,
        // Asegurarse de que los campos opcionales vacíos sean undefined
        email: data.email || undefined,
        dnicli: data.dnicli || undefined,
        dircli: data.dircli || undefined,
        codposcli: data.codposcli || undefined,
        pobcli: data.pobcli || undefined,
        procli: data.procli || undefined,
        tel1cli: data.tel1cli || undefined,
        tel2cli: data.tel2cli || undefined,
    };

    await onSubmit(finalData); // Llamar a la función create o update pasada como prop
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] p-1"> {/* Scroll para formularios largos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-2">

            {/* --- Campos del Formulario --- */}
             <FormField
                control={form.control}
                name="codcli"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Código Cliente *</FormLabel>
                    <FormControl><Input placeholder="000000" {...field} disabled={!!clienteInicial} /></FormControl> {/* Deshabilitado en edición */}
                    <FormMessage />
                    </FormItem>
                )}
                />
             <div></div> {/* Espacio vacío */}

             <FormField control={form.control} name="nomcli" render={({ field }) => ( <FormItem> <FormLabel>Nombre *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="ape1cli" render={({ field }) => ( <FormItem> <FormLabel>Apellidos *</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="dnicli" render={({ field }) => ( <FormItem> <FormLabel>DNI/NIE</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="tel2cli" render={({ field }) => ( <FormItem> <FormLabel>Teléfono Móvil</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="tel1cli" render={({ field }) => ( <FormItem> <FormLabel>Teléfono Fijo</FormLabel> <FormControl><Input type="tel" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="dircli" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Dirección</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="pobcli" render={({ field }) => ( <FormItem> <FormLabel>Población</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="codposcli" render={({ field }) => ( <FormItem> <FormLabel>Código Postal</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField control={form.control} name="procli" render={({ field }) => ( <FormItem> <FormLabel>Provincia</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
             <FormField
                control={form.control}
                name="fecnac"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Fecha Nacimiento</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="H">Hombre</SelectItem>
                        <SelectItem value="M">Mujer</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="fecalta"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Fecha Alta</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
             <FormField
                control={form.control}
                name="enviar"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value} // Convertir 0/1 a boolean
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)} // Convertir boolean a 0/1
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Permitir envío de comunicaciones (WhatsApp, Email)
                      </FormLabel>
                       <FormDescription>
                           Marca esta casilla si el cliente consiente recibir comunicaciones.
                       </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            <FormField control={form.control} name="intereses" render={({ field }) => (
                <FormItem className="md:col-span-2">
                    <FormLabel>Intereses</FormLabel>
                    <FormControl><Input placeholder="facial, corporal, láser..." {...field} onChange={e => field.onChange(e.target.value.split(',').map(s=>s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''} /></FormControl>
                    <FormDescription>Separados por comas.</FormDescription>
                    <FormMessage />
                </FormItem>
            )}/>

          </div>
        </ScrollArea>
        <div className="flex justify-end p-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : (clienteInicial ? 'Actualizar Cliente' : 'Crear Cliente')}
          </Button>
        </div>
      </form>
    </Form>
  );
};