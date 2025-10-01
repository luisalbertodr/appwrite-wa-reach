import { useState, useEffect } from 'react'; // Import useEffect
import { useAppwriteCollection } from '@/hooks/useAppwrite';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Edit, Trash2, XCircle, Search, RotateCcw, HardDriveUpload } from 'lucide-react'; // Import Search, RotateCcw, HardDriveUpload
import { useToast } from '@/hooks/use-toast';
import { CLIENTS_COLLECTION_ID, DATABASE_ID, databases, storage, IMPORT_BUCKET_ID, IMPORT_LOGS_COLLECTION_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import Papa from 'papaparse'; // Import PapaParse
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ClientsTab() {
  // Initialize with no specific queries to get the total count, Appwrite will return total even with default limit
  const { data: clients, total, loading: loadingClients, create, remove, applyQueries } = useAppwriteCollection<Client>(CLIENTS_COLLECTION_ID);
  const { data: importLogs, loading: loadingImportLogs, reload: reloadImportLogs, applyQueries: applyImportLogQueries } = useAppwriteCollection<ImportLog>(IMPORT_LOGS_COLLECTION_ID);
  const { toast } = useToast();
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, '$id' | 'edad' | 'importErrors'>>({
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
    enviar: 0,
    sexo: 'Otro',
    fecalta: new Date().toISOString().split('T')[0],
    facturacion: 0, // Added facturacion
    intereses: [], // Added intereses
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showImportErrorsDialog, setShowImportErrorsDialog] = useState(false);
  const [importErrorLogs, setImportErrorLogs] = useState<string[]>([]);
  const [isLocalImporting, setIsLocalImporting] = useState(false); // New state for local import loading

  // Filter states
  const [filterCodcli, setFilterCodcli] = useState('');
  const [filterCodcliMin, setFilterCodcliMin] = useState(''); // New filter state
  const [filterCodcliMax, setFilterCodcliMax] = useState(''); // New filter state
  const [filterNomcli, setFilterNomcli] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDnicli, setFilterDnicli] = useState('');
  const [filterTelefono, setFilterTelefono] = useState(''); // New filter state for tel2cli
  const [filterFecaltaMin, setFilterFecaltaMin] = useState(''); // New filter state
  const [filterFecaltaMax, setFilterFecaltaMax] = useState(''); // New filter state
  const [isFiltered, setIsFiltered] = useState(false); // Track if a filter has been applied

  // Effect to load initial total count
  useEffect(() => {
    // When the component mounts, we want to get the total count without fetching all documents.
    // The useAppwriteCollection hook is initialized with Query.limit(0) for this purpose.
    // No need to call applyQueries here, as it's handled by initialQueries.
  }, []);

  const validateClient = (clientData: Omit<Client, '$id' | 'edad' | 'importErrors'>, isStrict: boolean = true) => {
    const errors: Record<string, string> = {};

    // codcli is always strictly required
    if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
      errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
    }

    // For other fields, validate only if present or if strict validation is enabled
    if (isStrict || clientData.nomcli) {
      if (!clientData.nomcli) errors.nomcli = 'El nombre es requerido.';
    }
    if (isStrict || clientData.ape1cli) {
      if (!clientData.ape1cli) errors.ape1cli = 'Los apellidos son requeridos.';
    }
    if (isStrict || clientData.email) {
      if (!clientData.email || !/\S+@\S+\.\S+/.test(clientData.email)) errors.email = 'Email inválido.';
    }
    
    if (isStrict || clientData.dnicli) {
      const dniValidation = validateDniNie(clientData.dnicli || '');
      if (!dniValidation.isValid) errors.dnicli = dniValidation.message;
    }

    if (isStrict || clientData.dircli) {
      if (!clientData.dircli) errors.dircli = 'La dirección es requerida.';
    }
    if (isStrict || clientData.codposcli) {
      if (!clientData.codposcli || !/^\d{5}$/.test(clientData.codposcli)) errors.codposcli = 'Código postal inválido (5 dígitos).';
    }
    if (isStrict || clientData.pobcli) {
      if (!clientData.pobcli) errors.pobcli = 'La localidad es requerida.';
    }
    if (isStrict || clientData.procli) {
      if (!clientData.procli) errors.procli = 'La provincia es requerida.';
    }

    if (isStrict || clientData.tel2cli) {
      const tel2Validation = validateMobilePhone(clientData.tel2cli || '');
      if (!tel2Validation.isValid) errors.tel2cli = tel2Validation.message;
    }

    if (clientData.tel1cli) { // tel1cli is optional, only validate if provided
      if (!/^\d{9}$/.test(clientData.tel1cli)) errors.tel1cli = 'Teléfono secundario inválido (9 dígitos).';
    }

    if (isStrict || clientData.fecnac) {
      if (!clientData.fecnac) errors.fecnac = 'La fecha de nacimiento es requerida.';
      else if (calculateAge(clientData.fecnac) < 0) errors.fecnac = 'Fecha de nacimiento futura.';
    }

    if (isStrict || clientData.enviar !== undefined) {
      if (clientData.enviar === undefined || (clientData.enviar !== 0 && clientData.enviar !== 1)) errors.enviar = 'El campo "enviar" es requerido (0 o 1).';
    }
    if (isStrict || clientData.sexo) {
      if (!clientData.sexo || !['H', 'M', 'Otro'].includes(clientData.sexo)) errors.sexo = 'Sexo inválido.';
    }
    if (isStrict || clientData.fecalta) {
      if (!clientData.fecalta) errors.fecalta = 'La fecha de alta es requerida.';
    }
    // New validations for facturacion and intereses
    if (isStrict || clientData.facturacion !== undefined) {
      if (clientData.facturacion === undefined || isNaN(clientData.facturacion) || clientData.facturacion < 0) errors.facturacion = 'La facturación es requerida y debe ser un número positivo.';
    }
    // Intereses is optional, only validate if present
    if (clientData.intereses && !Array.isArray(clientData.intereses)) {
      errors.intereses = 'Los intereses deben ser una lista de cadenas.';
    }


    return errors;
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateDniNie = (dni: string) => {
    dni = dni.toUpperCase().trim();
    const dniRegex = /^(\d{8})([A-Z])$/;
    const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
    const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

    if (dniRegex.test(dni)) { // DNI Nacional
      const [, num, letter] = dni.match(dniRegex)!;
      const expectedLetter = letterMap[parseInt(num) % 23];
      if (letter === expectedLetter) {
        return { isValid: true, message: 'DNI válido.' };
      } else {
        return { isValid: false, message: `Letra de DNI incorrecta. La letra correcta es ${expectedLetter}.` };
      }
    } else if (nieRegex.test(dni)) { // NIE Extranjero
      const niePrefix = dni.charAt(0);
      const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
      const letter = dni.charAt(8);
      const expectedLetter = letterMap[parseInt(nieNum) % 23];
      if (letter === expectedLetter) {
        return { isValid: true, message: 'NIE válido.' };
      } else {
        return { isValid: false, message: `Letra de NIE incorrecta. La letra correcta es ${expectedLetter}.` };
      }
    } else {
      return { isValid: false, message: 'Formato de DNI/NIE inválido.' };
    }
  };

  const validateMobilePhone = (phone: string) => {
    const mobileRegex = /^[67]\d{8}$/;
    if (mobileRegex.test(phone)) {
      return { isValid: true, message: 'Teléfono móvil válido.' };
    } else {
      return { isValid: false, message: 'Teléfono principal inválido. Debe ser móvil (empezar por 6 o 7 y tener 9 dígitos).' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateClient(newClient, !editingClient); // Use non-strict validation if editing
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({ title: 'Errores de validación', description: 'Por favor, corrige los campos marcados.', variant: 'destructive' });
      return;
    }

    setValidationErrors({});
    try {
      const clientToSave: Client = {
        ...newClient,
        $id: editingClient?.$id || newClient.codcli, // Use existing $id if editing, otherwise codcli
        edad: newClient.fecnac ? calculateAge(newClient.fecnac) : undefined, // Calculate age if date is present
      };

      if (editingClient) {
        // Update existing client
        await databases.updateDocument(
          DATABASE_ID,
          CLIENTS_COLLECTION_ID,
          editingClient.$id!, // Use the $id of the client being edited
          clientToSave
        );
        toast({ title: 'Cliente actualizado exitosamente' });
      } else {
        // Check if client with codcli already exists (for new client creation)
        const existingClients = await databases.listDocuments(
          DATABASE_ID,
          CLIENTS_COLLECTION_ID,
          [Query.equal('codcli', newClient.codcli)]
        );

        if (existingClients.documents.length > 0) {
          // If codcli exists, update it (this handles cases where a new client is added with an existing codcli)
          await databases.updateDocument(
            DATABASE_ID,
            CLIENTS_COLLECTION_ID,
            existingClients.documents[0].$id,
            clientToSave
          );
          toast({ title: 'Cliente actualizado exitosamente' });
        } else {
          // Create new client
          await create(clientToSave, clientToSave.$id); // Pass codcli as document ID
          toast({ title: 'Cliente agregado exitosamente' });
        }
      }
      
      setNewClient({
        codcli: '', // Reset codcli
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
        enviar: 0,
        sexo: 'Otro',
        fecalta: new Date().toISOString().split('T')[0],
        facturacion: 0, // Reset facturacion
        intereses: [], // Reset intereses
      });
      setIsAddingClient(false);
      setEditingClient(null); // Clear editing client after save
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      toast({ title: 'Error al guardar cliente', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: 'No se seleccionó ningún archivo', variant: 'destructive' });
      return;
    }

    if (file.type !== 'text/csv') {
      toast({ title: 'Formato de archivo inválido', description: 'Por favor, sube un archivo CSV.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setImportErrorLogs([]); // Clear previous errors

    try {
      // Upload the CSV file to Appwrite Storage
      await storage.createFile(
        IMPORT_BUCKET_ID,
        ID.unique(), // Let Appwrite generate a unique ID for the file
        file
      );
      toast({ 
        title: 'Archivo CSV subido', 
        description: 'El archivo se está procesando en el servidor. Los resultados de la importación aparecerán en la sección de "Historial de Importaciones".',
        duration: 8000
      });
      reloadImportLogs(); // Reload import logs to show new entry
    } catch (error) {
      console.error('Error al subir archivo CSV:', error);
      toast({ title: 'Error al subir archivo CSV', description: (error as Error).message, variant: 'destructive' });
      setImportErrorLogs([`Error al subir archivo CSV: ${(error as Error).message}`]);
      setShowImportErrorsDialog(true);
    } finally {
      setLoading(false);
      // Clear the file input after upload attempt
      event.target.value = ''; 
    }
  };

  const handleLocalImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({ title: 'No se seleccionó ningún archivo', variant: 'destructive' });
      return;
    }

    if (file.type !== 'text/csv') {
      toast({ title: 'Formato de archivo inválido', description: 'Por favor, sube un archivo CSV.', variant: 'destructive' });
      return;
    }

    setIsLocalImporting(true);
    setImportErrorLogs([]); // Clear previous errors
    const importErrors: string[] = [];
    let successfulImports = 0;
    let totalProcessed = 0;
    const timestamp = new Date().toISOString();
    const fileName = file.name;

    try {
      const fileContent = await file.text(); // Read file content directly

      const results = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: ',', // Changed to comma as per user feedback
      });

      totalProcessed = results.data.length;

      if (results.errors.length > 0) {
        results.errors.forEach(err => importErrors.push(`Error de parseo CSV: ${err.message}`));
        toast({ title: 'Errores de parseo CSV', description: 'Se encontraron errores al leer el archivo.', variant: 'destructive' });
      }

      const clientsToImport = results.data;
      const BATCH_SIZE = 50; // Process 50 clients at a time
const BATCH_DELAY_MS = 20000; // Increased to 20 seconds to mitigate rate limiting

      for (let i = 0; i < clientsToImport.length; i += BATCH_SIZE) {
        const batch = clientsToImport.slice(i, i + BATCH_SIZE);
        toast({
          title: `Importando clientes...`,
          description: `Procesando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(clientsToImport.length / BATCH_SIZE)} (${successfulImports} éxitos hasta ahora).`,
          duration: 3000
        });

        for (const [indexInBatch, row] of batch.entries()) {
          const clientData = row as Record<string, string>; // Cast to Record<string, string> for easier access
          const rowNumber = i + indexInBatch + 2; // Global row number (+1 for 0-index to 1-index, +1 for header row)

          // Convert date formats if necessary (reusing logic from serverless function)
          const convertDate = (dateStr: string) => {
            if (!dateStr) return undefined;
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const [day, monthStr, yearShort] = parts;
              const monthMap: { [key: string]: string } = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
              };
              const month = monthMap[monthStr];
              if (month) {
                let fullYear = parseInt(yearShort, 10);
                if (fullYear < 30) {
                  fullYear += 2000;
                } else {
                  fullYear += 1900;
                }
                return `${fullYear}-${month}-${day.padStart(2, '0')}`;
              }
            }
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() > 1900) { // Check for valid date and reasonable year
              return dateObj.toISOString().split('T')[0];
            }
            return undefined;
          };

          const fecnacFormatted = convertDate(clientData.fecnac);
          const fecaltaFormatted = convertDate(clientData.fecalta);

          const newClientRecord: Omit<Client, '$id' | 'edad' | 'importErrors'> = { // Removed importErrors from Omit
            codcli: clientData.codcli || '',
            nomcli: clientData.nomcli || '',
            ape1cli: clientData.ape1cli || '',
            email: clientData.email || '',
            dnicli: clientData.dnicli || '',
            dircli: clientData.dircli || '',
            codposcli: clientData.codposcli || '',
            pobcli: clientData.pobcli || '',
            procli: clientData.procli || '',
            tel1cli: clientData.tel1cli || '',
            tel2cli: clientData.tel2cli || '',
            fecnac: fecnacFormatted || '',
            enviar: clientData.enviar === '1' ? 1 : (clientData.enviar === '0' ? 0 : 0), // Default to 0 if undefined
            sexo: (clientData.sexo === 'H' || clientData.sexo === 'M' || clientData.sexo === 'Otro') ? clientData.sexo : 'Otro', // Default to 'Otro'
            fecalta: fecaltaFormatted || new Date().toISOString().split('T')[0], // Default to today if undefined
            facturacion: parseFloat(clientData.facturacion || '0'), // Added facturacion
            intereses: clientData.intereses ? clientData.intereses.split(',').map(i => i.trim()) : [], // Added intereses
          };

          const validationResult = validateClient(newClientRecord, false); // Use non-strict validation
          const currentClientImportErrors: string[] = [];
          if (Object.keys(validationResult).length > 0) {
            Object.values(validationResult).forEach(err => currentClientImportErrors.push(err));
            importErrors.push(`Fila ${rowNumber} (Cod. Cliente: ${newClientRecord.codcli || 'N/A'}): ${currentClientImportErrors.join(', ')}`);
          }

          try {
            const clientToSave: Client = {
              ...newClientRecord,
              $id: newClientRecord.codcli, // Use codcli as document ID
              edad: newClientRecord.fecnac ? calculateAge(newClientRecord.fecnac) : undefined,
              importErrors: currentClientImportErrors.length > 0 ? currentClientImportErrors : [], // Store errors
            };

            // Check if client with codcli already exists
            const existingClients = await databases.listDocuments(
              DATABASE_ID,
              CLIENTS_COLLECTION_ID,
              [Query.equal('codcli', newClientRecord.codcli)]
            );

            if (existingClients.documents.length > 0) {
              // Update existing client
              await databases.updateDocument(
                DATABASE_ID,
                CLIENTS_COLLECTION_ID,
                existingClients.documents[0].$id,
                clientToSave
              );
            } else {
              // Create new client
              await databases.createDocument(
                DATABASE_ID,
                CLIENTS_COLLECTION_ID,
                clientToSave.$id, // Use codcli as document ID
                clientToSave
              );
            }
            successfulImports++;
          } catch (dbError) {
            console.error(`Error al guardar cliente ${newClientRecord.codcli}:`, dbError);
            currentClientImportErrors.push(`Fallo al guardar en DB: ${(dbError as Error).message}`);
            importErrors.push(`Fallo al guardar cliente ${newClientRecord.codcli} (Fila ${rowNumber}): ${(dbError as Error).message}`);
            // Even if there's a DB error, we still want to save the client with its errors if possible.
            // This part of the logic needs to be carefully considered if Appwrite throws an error
            // that prevents saving the document at all. For now, we assume it might still save
            // but with an error message. If not, the client won't be in the DB.
          }
        }
        if (i + BATCH_SIZE < clientsToImport.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      // Save import log to Appwrite database
      const importLogDocument = {
        timestamp: timestamp,
        filename: fileName, // Changed to lowercase 'f'
        successfulImports: successfulImports,
        totalProcessed: totalProcessed,
        errors: importErrors.length > 0 ? importErrors : ['Ninguno'],
        status: importErrors.length > 0 ? 'completed_with_errors' : 'completed',
      };

      try {
        const createdLog = await databases.createDocument(
          DATABASE_ID,
          IMPORT_LOGS_COLLECTION_ID,
          ID.unique(),
          importLogDocument
        );
        console.log('Import log created:', createdLog); // Log the created document
        // Add a small delay to allow Appwrite to process the document before re-fetching
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        applyImportLogQueries([]); // Explicitly clear any filters and force a full reload for import logs
      } catch (logError) {
        console.error(`Failed to save import log for ${fileName}:`, logError);
        importErrors.push(`Fallo al guardar log de importación: ${(logError as Error).message}`);
      }

      if (importErrors.length > 0) {
        setImportErrorLogs(importErrors);
        setShowImportErrorsDialog(true);
        toast({
          title: 'Importación local completada con errores',
          description: `Se importaron ${successfulImports} de ${totalProcessed} clientes.`,
          variant: 'destructive',
          duration: 8000
        });
      } else {
        toast({
          title: 'Importación local exitosa',
          description: `Se importaron ${successfulImports} clientes.`,
          duration: 5000
        });
      }
      // Reload clients data after import
      applyQueries([]); // This will trigger a reload of clients
    } catch (error) {
      console.error('Error durante la importación local:', error);
      importErrors.push(`Error general durante la importación local: ${(error as Error).message}`);
      setImportErrorLogs(importErrors);
      setShowImportErrorsDialog(true);
      toast({ title: 'Error durante la importación local', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLocalImporting(false);
      event.target.value = ''; // Clear the file input
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast({ title: 'Cliente eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar cliente', variant: 'destructive' });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      codcli: client.codcli,
      nomcli: client.nomcli,
      ape1cli: client.ape1cli,
      email: client.email,
      dnicli: client.dnicli,
      dircli: client.dircli,
      codposcli: client.codposcli,
      pobcli: client.pobcli,
      procli: client.procli,
      tel1cli: client.tel1cli,
      tel2cli: client.tel2cli,
      fecnac: client.fecnac,
      enviar: client.enviar,
      sexo: client.sexo,
      fecalta: client.fecalta,
      facturacion: client.facturacion, // Added facturacion
      intereses: client.intereses, // Added intereses
    });
    setIsAddingClient(true); // Open the form
  };

  // Define the ImportLog interface (can be moved to types/index.ts if preferred)
  interface ImportLog {
    $id?: string;
    timestamp: string;
    filename: string; // Changed to lowercase 'f'
    successfulImports: number;
    totalProcessed: number;
    errors: string[];
    status: 'completed' | 'completed_with_errors' | 'failed';
  }

  const handleFilter = () => {
    const newQueries: string[] = []; // Change type to string[]
    if (filterCodcli) newQueries.push(Query.equal('codcli', filterCodcli).toString()); // Convert to string
    if (filterNomcli) newQueries.push(Query.search('nomcli', filterNomcli).toString()); // Convert to string
    if (filterEmail) newQueries.push(Query.search('email', filterEmail).toString()); // Convert to string
    if (filterDnicli) newQueries.push(Query.equal('dnicli', filterDnicli).toString()); // Convert to string

    applyQueries(newQueries); // applyQueries now expects string[]
    setIsFiltered(true);
  };

  const handleClearFilters = () => {
    setFilterCodcli('');
    setFilterNomcli('');
    setFilterEmail('');
    setFilterDnicli('');
    applyQueries([]); // Reset to initial state (no filters, Appwrite will return total with default limit)
    setIsFiltered(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Clientes</h2>
        <div className="flex gap-2">
          <Label htmlFor="csv-upload-server" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
            <Upload className="w-4 h-4" />
            Importar Clientes (Servidor)
            <Input
              id="csv-upload-server"
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="sr-only"
              disabled={loading || isLocalImporting}
            />
          </Label>
          <Label htmlFor="csv-upload-local" className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
            <HardDriveUpload className="w-4 h-4" />
            Importar Local
            <Input
              id="csv-upload-local"
              type="file"
              accept=".csv"
              onChange={handleLocalImport}
              className="sr-only"
              disabled={loading || isLocalImporting}
            />
          </Label>
          <Button onClick={() => setIsAddingClient(true)} disabled={loading || isLocalImporting}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {isAddingClient && (
        <Card>
          <CardHeader>
            <CardTitle>{editingClient ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codcli">Código Cliente</Label>
                <Input
                  id="codcli"
                  value={newClient.codcli}
                  onChange={(e) => setNewClient({ ...newClient, codcli: e.target.value })}
                  required
                  disabled={!!editingClient}
                />
                {validationErrors.codcli && <p className="text-red-500 text-xs mt-1">{validationErrors.codcli}</p>}
              </div>
              <div>
                <Label htmlFor="nomcli">Nombre</Label>
                <Input
                  id="nomcli"
                  value={newClient.nomcli}
                  onChange={(e) => setNewClient({ ...newClient, nomcli: e.target.value })}
                  required
                />
                {validationErrors.nomcli && <p className="text-red-500 text-xs mt-1">{validationErrors.nomcli}</p>}
              </div>
              <div>
                <Label htmlFor="ape1cli">Apellidos</Label>
                <Input
                  id="ape1cli"
                  value={newClient.ape1cli}
                  onChange={(e) => setNewClient({ ...newClient, ape1cli: e.target.value })}
                  required
                />
                {validationErrors.ape1cli && <p className="text-red-500 text-xs mt-1">{validationErrors.ape1cli}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  required
                />
                {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
              </div>
              <div>
                <Label htmlFor="dnicli">DNI/NIE</Label>
                <Input
                  id="dnicli"
                  value={newClient.dnicli}
                  onChange={(e) => setNewClient({ ...newClient, dnicli: e.target.value })}
                  required
                />
                {validationErrors.dnicli && <p className="text-red-500 text-xs mt-1">{validationErrors.dnicli}</p>}
              </div>
              <div>
                <Label htmlFor="dircli">Dirección</Label>
                <Input
                  id="dircli"
                  value={newClient.dircli}
                  onChange={(e) => setNewClient({ ...newClient, dircli: e.target.value })}
                  required
                />
                {validationErrors.dircli && <p className="text-red-500 text-xs mt-1">{validationErrors.dircli}</p>}
              </div>
              <div>
                <Label htmlFor="codposcli">Código Postal</Label>
                <Input
                  id="codposcli"
                  value={newClient.codposcli}
                  onChange={(e) => setNewClient({ ...newClient, codposcli: e.target.value })}
                  required
                />
                {validationErrors.codposcli && <p className="text-red-500 text-xs mt-1">{validationErrors.codposcli}</p>}
              </div>
              <div>
                <Label htmlFor="pobcli">Localidad</Label>
                <Input
                  id="pobcli"
                  value={newClient.pobcli}
                  onChange={(e) => setNewClient({ ...newClient, pobcli: e.target.value })}
                  required
                />
                {validationErrors.pobcli && <p className="text-red-500 text-xs mt-1">{validationErrors.pobcli}</p>}
              </div>
              <div>
                <Label htmlFor="procli">Provincia</Label>
                <Input
                  id="procli"
                  value={newClient.procli}
                  onChange={(e) => setNewClient({ ...newClient, procli: e.target.value })}
                  required
                />
                {validationErrors.procli && <p className="text-red-500 text-xs mt-1">{validationErrors.procli}</p>}
              </div>
              <div>
                <Label htmlFor="tel1cli">Teléfono Secundario (No notificaciones)</Label>
                <Input
                  id="tel1cli"
                  value={newClient.tel1cli}
                  onChange={(e) => setNewClient({ ...newClient, tel1cli: e.target.value })}
                />
                {validationErrors.tel1cli && <p className="text-red-500 text-xs mt-1">{validationErrors.tel1cli}</p>}
              </div>
              <div>
                <Label htmlFor="tel2cli">Teléfono Principal (WhatsApp)</Label>
                <Input
                  id="tel2cli"
                  value={newClient.tel2cli}
                  onChange={(e) => setNewClient({ ...newClient, tel2cli: e.target.value })}
                  required
                />
                {validationErrors.tel2cli && <p className="text-red-500 text-xs mt-1">{validationErrors.tel2cli}</p>}
              </div>
              <div>
                <Label htmlFor="fecnac">Fecha de Nacimiento</Label>
                <Input
                  id="fecnac"
                  type="date"
                  value={newClient.fecnac}
                  onChange={(e) => setNewClient({ ...newClient, fecnac: e.target.value })}
                  required
                />
                {validationErrors.fecnac && <p className="text-red-500 text-xs mt-1">{validationErrors.fecnac}</p>}
              </div>
              <div>
                <Label htmlFor="fecalta">Fecha de Alta</Label>
                <Input
                  id="fecalta"
                  type="date"
                  value={newClient.fecalta}
                  onChange={(e) => setNewClient({ ...newClient, fecalta: e.target.value })}
                  required
                />
                {validationErrors.fecalta && <p className="text-red-500 text-xs mt-1">{validationErrors.fecalta}</p>}
              </div>
              <div>
                <Label htmlFor="enviar">Enviar Notificaciones</Label>
                <select
                  id="enviar"
                  title="Enviar Notificaciones"
                  value={newClient.enviar}
                  onChange={(e) => setNewClient({ ...newClient, enviar: parseInt(e.target.value) as 0 | 1 })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value={1}>Sí</option>
                  <option value={0}>No</option>
                </select>
                {validationErrors.enviar && <p className="text-red-500 text-xs mt-1">{validationErrors.enviar}</p>}
              </div>
              <div>
                <Label htmlFor="sexo">Sexo</Label>
                <select
                  id="sexo"
                  title="Sexo"
                  value={newClient.sexo}
                  onChange={(e) => setNewClient({ ...newClient, sexo: e.target.value as 'H' | 'M' | 'Otro' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="H">Hombre</option>
                  <option value="M">Mujer</option>
                  <option value="Otro">Otro</option>
                </select>
                {validationErrors.sexo && <p className="text-red-500 text-xs mt-1">{validationErrors.sexo}</p>}
              </div>
              <div>
                <Label htmlFor="facturacion">Facturación</Label>
                <Input
                  id="facturacion"
                  type="number"
                  value={newClient.facturacion}
                  onChange={(e) => setNewClient({ ...newClient, facturacion: parseFloat(e.target.value) || 0 })}
                  required
                />
                {validationErrors.facturacion && <p className="text-red-500 text-xs mt-1">{validationErrors.facturacion}</p>}
              </div>
              <div>
                <Label htmlFor="intereses">Intereses (separados por coma)</Label>
                <Input
                  id="intereses"
                  value={newClient.intereses?.join(', ') || ''}
                  onChange={(e) => setNewClient({ ...newClient, intereses: e.target.value.split(',').map(i => i.trim()) })}
                />
                {validationErrors.intereses && <p className="text-red-500 text-xs mt-1">{validationErrors.intereses}</p>}
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">{editingClient ? 'Actualizar Cliente' : 'Guardar Cliente'}</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddingClient(false);
                  setEditingClient(null);
                  setNewClient({
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
                    enviar: 0,
                    sexo: 'Otro',
                    fecalta: new Date().toISOString().split('T')[0],
                    facturacion: 0,
                    intereses: [],
                  });
                  setValidationErrors({});
                }}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Total de Clientes: {total}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filterCodcliMin">Cód. Cliente Mín.</Label>
                <Input
                  id="filterCodcliMin"
                  value={filterCodcliMin}
                  onChange={(e) => setFilterCodcliMin(e.target.value)}
                  placeholder="Ej: 000001"
                />
              </div>
              <div>
                <Label htmlFor="filterCodcliMax">Cód. Cliente Máx.</Label>
                <Input
                  id="filterCodcliMax"
                  value={filterCodcliMax}
                  onChange={(e) => setFilterCodcliMax(e.target.value)}
                  placeholder="Ej: 999999"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filterCodcli">Cód. Cliente Exacto</Label>
              <Input
                id="filterCodcli"
                value={filterCodcli}
                onChange={(e) => setFilterCodcli(e.target.value)}
                placeholder="Ej: 123456"
              />
            </div>
            <div>
              <Label htmlFor="filterNomcli">Nombre</Label>
              <Input
                id="filterNomcli"
                value={filterNomcli}
                onChange={(e) => setFilterNomcli(e.target.value)}
                placeholder="Ej: Juan"
              />
            </div>
            <div>
              <Label htmlFor="filterEmail">Email</Label>
              <Input
                id="filterEmail"
                type="email"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                placeholder="Ej: juan@example.com"
              />
            </div>
            <div>
              <Label htmlFor="filterDnicli">DNI/NIE</Label>
              <Input
                id="filterDnicli"
                value={filterDnicli}
                onChange={(e) => setFilterDnicli(e.target.value)}
                placeholder="Ej: 12345678A"
              />
            </div>
            <div>
              <Label htmlFor="filterTelefono">Teléfono Principal</Label>
              <Input
                id="filterTelefono"
                type="tel"
                value={filterTelefono}
                onChange={(e) => setFilterTelefono(e.target.value)}
                placeholder="Ej: 600123456"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filterFecaltaMin">Fecha Alta Mín.</Label>
                <Input
                  id="filterFecaltaMin"
                  type="date"
                  value={filterFecaltaMin}
                  onChange={(e) => setFilterFecaltaMin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filterFecaltaMax">Fecha Alta Máx.</Label>
                <Input
                  id="filterFecaltaMax"
                  type="date"
                  value={filterFecaltaMax}
                  onChange={(e) => setFilterFecaltaMax(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Button onClick={handleFilter}>
              <Search className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpiar Filtros
            </Button>
          </div >

          {isFiltered && clients.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Cliente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Apellidos</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>DNI/NIE</TableHead>
                  <TableHead>Tel. Principal</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Facturación</TableHead>
                  <TableHead>Intereses</TableHead>
                  <TableHead>Notif.</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.$id} className={client.importErrors ? 'bg-red-100 dark:bg-red-900' : ''}>
                    <TableCell>{client.codcli}</TableCell>
                    <TableCell>{client.nomcli}</TableCell>
                    <TableCell>{client.ape1cli}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.dnicli}</TableCell>
                    <TableCell>{client.tel2cli}</TableCell>
                    <TableCell>{client.edad}</TableCell>
                    <TableCell>{client.facturacion.toFixed(2)}</TableCell>
                    <TableCell>{client.intereses?.join(', ') || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={client.enviar === 1 ? 'default' : 'destructive'}>
                        {client.enviar === 1 ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.sexo}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {client.importErrors && (
                          <Button variant="ghost" size="sm" onClick={() => {
                            setImportErrorLogs(Object.entries(client.importErrors).map(([key, value]) => `${key}: ${value}`));
                            setShowImportErrorsDialog(true);
                          }}>
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => client.$id && handleDelete(client.$id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {isFiltered && clients.length === 0 && (
            <p className="text-center text-muted-foreground">No se encontraron clientes con los filtros aplicados.</p>
          )}
          {!isFiltered && (
            <p className="text-center text-muted-foreground">Aplica un filtro para ver la lista de clientes.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showImportErrorsDialog} onOpenChange={setShowImportErrorsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-500" />
              Errores de Importación
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se encontraron los siguientes errores durante la importación del CSV.
              Por favor, revisa y corrige los datos en tu archivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-[400px] overflow-y-auto rounded-md bg-slate-950 p-4 text-sm">
            <code className="text-white whitespace-pre-wrap">
              {importErrorLogs.join('\n')}
            </code>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Cerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Historial de Importaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones ({importLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Procesados</TableHead>
                <TableHead>Éxitos</TableHead>
                <TableHead>Errores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((logEntry) => (
                  <TableRow key={logEntry.$id}>
                    <TableCell>{new Date(logEntry.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{logEntry.filename}</TableCell>
                    <TableCell>{logEntry.totalProcessed}</TableCell>
                    <TableCell>{logEntry.successfulImports}</TableCell>
                    <TableCell>{logEntry.errors.length}</TableCell>
                    <TableCell>
                      <Badge variant={
                        logEntry.status === 'completed' ? 'default' :
                        logEntry.status === 'completed_with_errors' ? 'secondary' : 'destructive'
                      }>
                        {logEntry.status === 'completed' ? 'Completado' :
                         logEntry.status === 'completed_with_errors' ? 'Con Errores' : 'Fallido'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {logEntry.errors.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          setImportErrorLogs(logEntry.errors);
                          setShowImportErrorsDialog(true);
                        }}>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
