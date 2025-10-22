import { databases, DATABASE_ID, CLIENTES_COLLECTION_ID } from '@/lib/appwrite';
import { Cliente, LipooutUserInput } from '@/types';
import { Query, Models, ID } from 'appwrite';

// Tipos de Input
export type CreateClienteInput = LipooutUserInput<Cliente>;
export type UpdateClienteInput = Partial<CreateClienteInput>;

// --- Interfaz para los filtros ---
export interface ClienteFilters {
  searchNombreCompleto?: string;
  searchCodCli?: string;
  searchTel1Cli?: string;
  searchEmail?: string;
  searchPobCli?: string;
  searchProCli?: string;
}

// --- OBTENER CLIENTES (CON FILTROS AVANZADOS) ---
export const getClientes = async (filters: ClienteFilters = {}) => {
  const queries: string[] = [Query.orderDesc('$createdAt')]; // Ordenar por creación descendente

  // Construir queries basadas en los filtros proporcionados
  if (filters.searchNombreCompleto) {
    queries.push(Query.search('nombre_completo', filters.searchNombreCompleto));
  }
  if (filters.searchCodCli) {
    queries.push(Query.startsWith('codcli', filters.searchCodCli));
  }
  if (filters.searchTel1Cli) {
    queries.push(Query.search('tel1cli', filters.searchTel1Cli));
  }
  if (filters.searchEmail) {
    queries.push(Query.search('email', filters.searchEmail));
  }
  if (filters.searchPobCli) {
    queries.push(Query.search('pobcli', filters.searchPobCli));
  }
  if (filters.searchProCli) {
    queries.push(Query.search('procli', filters.searchProCli));
  }

  // Paginación completa para asegurar todos los resultados si hay filtros
  const applyPagination = Object.keys(filters).length > 0;

  try {
    let allDocuments: (Cliente & Models.Document)[] = [];
    
    // Si hay filtros, paginamos para obtener todos los resultados coincidentes
    if (applyPagination) {
        let offset = 0;
        let response;
        const limit = 100; // Obtener de 100 en 100

        do {
          response = await databases.listDocuments<Cliente & Models.Document>(
            DATABASE_ID,
            CLIENTES_COLLECTION_ID,
            [...queries, Query.limit(limit), Query.offset(offset)]
          );
          allDocuments = allDocuments.concat(response.documents);
          offset = allDocuments.length;
        // Continuar mientras haya más documentos que los ya obtenidos Y la última petición trajo documentos
        } while (allDocuments.length < response.total && response.documents.length > 0);
    } else {
        // Si no hay filtros, podríamos obtener todos directamente (cuidado con límites > 5000)
        // O aplicar una paginación por defecto si se espera una gran cantidad de clientes
         const response = await databases.listDocuments<Cliente & Models.Document>(
            DATABASE_ID,
            CLIENTES_COLLECTION_ID,
            queries // Solo el orden
         );
         allDocuments = response.documents;
         // Considera añadir paginación aquí también si tienes miles de clientes
    }

    return allDocuments;
    
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    if (error instanceof Error && error.message.includes("index")) {
        console.error("--- ¡ERROR DE ÍNDICE! ---");
        console.error("Asegúrate de haber creado índices 'key' en Appwrite para:");
        console.error("['codcli', 'nombre_completo', 'tel1cli', 'email', 'pobcli', 'procli']");
        console.error("en la colección 'clientes'.");
        throw new Error("Error de base de datos: Falta un índice requerido para la búsqueda. Revisa la consola.");
    }
    throw new Error("No se pudieron obtener los clientes.");
  }
};

// --- CREAR CLIENTE (Actualizado para incluir nombre_completo y limpiar nulos) ---
export const createCliente = async (data: CreateClienteInput) => {
  const nombre = data.nomcli || '';
  const apellido = data.ape1cli || '';
  const nombre_completo = [nombre, apellido].filter(Boolean).join(' ').trim();

  // Asegurarse de que 'enviar' sea booleano
  const dataToSave = {
    ...data,
    nombre_completo: nombre_completo,
    enviar: typeof data.enviar === 'boolean' ? data.enviar : false, // Valor por defecto si no viene
  };

  // Limpiar valores nulos o indefinidos explícitos, excepto fechas
  Object.keys(dataToSave).forEach(key => {
    const typedKey = key as keyof typeof dataToSave;
    // Si la propiedad existe y su valor es null o undefined...
    if (dataToSave.hasOwnProperty(typedKey) && (dataToSave[typedKey] === null || dataToSave[typedKey] === undefined)) {
        // ...y no es una de las fechas que permitimos ser null...
        if (key !== 'fecnac' && key !== 'fecalta') {
            // ...la eliminamos del objeto a guardar.
            delete dataToSave[typedKey];
        }
    }
  });


  return databases.createDocument<Cliente & Models.Document>(
    DATABASE_ID, CLIENTES_COLLECTION_ID, ID.unique(), dataToSave
  );
};

// --- ACTUALIZAR CLIENTE (Actualizado para incluir nombre_completo y limpiar nulos) ---
export const updateCliente = async ({ $id, data }: { $id: string, data: UpdateClienteInput }) => {
  let dataToSave: UpdateClienteInput = { ...data };

  // Recalcular nombre_completo si cambia nombre o apellido
  if (data.nomcli !== undefined || data.ape1cli !== undefined) {
    // Para asegurar la correcta concatenación, obtenemos el documento actual si falta alguna parte
    let currentNombre = '';
    let currentApellido = '';
    // Solo hacemos la llamada si realmente falta uno de los dos campos necesarios
    if (data.nomcli === undefined || data.ape1cli === undefined) {
        try {
            const currentCliente = await databases.getDocument<Cliente & Models.Document>(
                DATABASE_ID, CLIENTES_COLLECTION_ID, $id
            );
            currentNombre = currentCliente.nomcli;
            currentApellido = currentCliente.ape1cli || '';
        } catch (e) { 
            console.error("Error obteniendo cliente actual para actualizar nombre_completo", e); 
            // Si falla la obtención, no podemos calcular nombre_completo, podríamos lanzar error o continuar sin él
        }
    }
    
    // Usar el dato nuevo si existe, si no, el actual (obtenido o vacío si falló la obtención)
    const nombre = data.nomcli !== undefined ? data.nomcli : currentNombre;
    const apellido = data.ape1cli !== undefined ? data.ape1cli : currentApellido;
    dataToSave.nombre_completo = [nombre, apellido].filter(Boolean).join(' ').trim();
  }
  
  // Asegurarse de que 'enviar' sea booleano si se incluye
  if (data.enviar !== undefined) {
      dataToSave.enviar = typeof data.enviar === 'boolean' ? data.enviar : false;
  }

  // Limpiar valores nulos o indefinidos explícitos, excepto fechas
  Object.keys(dataToSave).forEach(key => {
     const typedKey = key as keyof typeof dataToSave;
     // Si la propiedad existe y su valor es null o undefined...
     if (dataToSave.hasOwnProperty(typedKey) && (dataToSave[typedKey] === null || dataToSave[typedKey] === undefined)) {
         // ...y no es una de las fechas que permitimos ser null...
         if (key !== 'fecnac' && key !== 'fecalta') {
             // ...la eliminamos del objeto a guardar.
             delete dataToSave[typedKey];
         }
     }
  }); // <-- Esta era la llave que faltaba en el forEach

  // Si después de limpiar, el objeto está vacío, no hacemos la llamada a update
  if (Object.keys(dataToSave).length === 0) {
      console.warn("UpdateCliente: No hay datos válidos para actualizar para el cliente ID:", $id);
      // Devolvemos el documento actual para que la mutación no falle
      try {
        return await databases.getDocument<Cliente & Models.Document>(DATABASE_ID, CLIENTES_COLLECTION_ID, $id);
      } catch (getError) {
        console.error("Error al obtener el documento actual después de un intento de actualización vacío:", getError);
        throw new Error("No se proporcionaron datos válidos para actualizar."); // O lanzar un error más específico
      }
  } // <-- Esta era la llave que faltaba en el if

  return databases.updateDocument<Cliente & Models.Document>(
    DATABASE_ID, CLIENTES_COLLECTION_ID, $id, dataToSave
  );
}; // <-- Esta era la llave que faltaba en la función updateCliente

// --- ELIMINAR CLIENTE (Sin cambios) ---
export const deleteCliente = async (clienteId: string) => {
  return databases.deleteDocument(DATABASE_ID, CLIENTES_COLLECTION_ID, clienteId);
}; // <-- Esta era la llave que faltaba en la función deleteCliente