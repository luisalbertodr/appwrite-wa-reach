import { databases, DATABASE_ID, CITAS_COLLECTION_ID } from '@/lib/appwrite';
import { Cita, CitaInput, LipooutUserInput } from '@/types';
import { ID, Query, Models } from 'appwrite';
import { startOfDay, endOfDay, formatISO } from 'date-fns';

// Tipos Create/Update Input (Asegúrate que coincidan con tu definición)
// export type CreateCitaInput = LipooutUserInput<CitaInput>; // Si usas LipooutUserInput
// export type UpdateCitaInput = Partial<CreateCitaInput>; // Si usas LipooutUserInput
// O si no usas LipooutUserInput globalmente:
export type CreateCitaInput = CitaInput;
export type UpdateCitaInput = Partial<CitaInput>;


export const getCitasPorDia = async (fecha: Date): Promise<(Cita & Models.Document)[]> => {
  const startOfDayDate = startOfDay(fecha);
  const endOfDayDate = endOfDay(fecha);

  // Convertir a ISO string para Appwrite
  const startOfDayISO = formatISO(startOfDayDate);
  const endOfDayISO = formatISO(endOfDayDate);

  // --- LOG 1 ---
  console.log(`%c[Service: getCitasPorDia] Buscando citas entre ${startOfDayISO} y ${endOfDayISO}`, 'color: blue; font-weight: bold;');

  try {
    const response = await databases.listDocuments<Cita & Models.Document>(
      DATABASE_ID,
      CITAS_COLLECTION_ID,
      [
        Query.greaterThanEqual('fecha_hora', startOfDayISO),
        Query.lessThan('fecha_hora', endOfDayISO), // Usar lessThan con el fin del día
        Query.limit(100), // Límite razonable
        Query.orderAsc('fecha_hora') // Ordenar por hora
      ]
    );

    // --- LOG 2 ---
    console.log('[Service: getCitasPorDia] Documentos recibidos de Appwrite:', response.documents);
    // --- LOG 2.1 (Opcional pero útil): Ver total y comparar con documentos ---
    console.log(`[Service: getCitasPorDia] Total reportado por Appwrite: ${response.total}`);
    // --- LOG 2.2 (Opcional): Si no devuelve nada, loguear los parámetros ---
    if (response.documents.length === 0) {
        console.warn(`[Service: getCitasPorDia] Appwrite devolvió 0 documentos. Parámetros de consulta:`, {
            DATABASE_ID,
            CITAS_COLLECTION_ID,
            queries: [
                `greaterThanEqual('fecha_hora', ${startOfDayISO})`,
                `lessThan('fecha_hora', ${endOfDayISO})`,
                `limit(100)`,
                `orderAsc('fecha_hora')`
            ]
        });
    }


    return response.documents;
  } catch (error) {
    console.error("%c[Service: getCitasPorDia] ERROR fetching citas:", 'color: red; font-weight: bold;', error);
    // Ver el tipo de error puede ayudar
    if (error instanceof Error) {
        console.error("Error message:", error.message);
        // Si tienes una estructura específica de error de Appwrite, puedes loguearla
        // console.error("Appwrite error details:", JSON.stringify(error, null, 2));
    }
    return []; // Devolver vacío en caso de error
  }
};

// --- createCita (con Logs detallados) ---
export const createCita = async (cita: LipooutUserInput<CitaInput>): Promise<Cita & Models.Document> => {
    // --- LOG 3 ---
    console.log('%c=== CREAR CITA - Datos enviados ===', 'color: green; font-weight: bold;');
    console.log('DATABASE_ID:', DATABASE_ID);
    console.log('CITAS_COLLECTION_ID:', CITAS_COLLECTION_ID);
    console.log('Datos de la cita:', cita);
    // Loguear tipos para asegurar formato correcto
    console.log('Tipo de cada campo:');
    for (const key in cita) {
        if (Object.prototype.hasOwnProperty.call(cita, key)) {
            const value = cita[key as keyof typeof cita];
            console.log(`   ${key}: ${typeof value} = ${JSON.stringify(value)}`);
        }
    }
    // --- FIN LOG 3 ---

  try {
    const response = await databases.createDocument<Cita & Models.Document>(
      DATABASE_ID,
      CITAS_COLLECTION_ID,
      ID.unique(),
      cita // Pasar directamente el objeto cita recibido
    );
    // --- LOG 4 ---
    console.log(`%c✓ Cita creada exitosamente: ${response.$id}`, 'color: green;', response);
    // --- FIN LOG 4 ---
    return response;
  } catch (error) {
     console.error("%c✗ Error al crear cita:", 'color: red; font-weight: bold;', error);
     // Loguear detalles del error
     if (error instanceof Error) {
        console.error("Error message:", error.message);
        // Si es un error específico de Appwrite con response
        // const appwriteError = error as any;
        // if (appwriteError.response) {
        //     console.error("Appwrite Response:", appwriteError.response);
        // }
     }
     throw error; // Relanzar para que react-query lo maneje
  }
};

// --- updateCita ---
export const updateCita = async (id: string, data: LipooutUserInput<Partial<CitaInput>>): Promise<Cita & Models.Document> => {
    console.log(`%c=== ACTUALIZAR CITA ${id} ===`, 'color: orange; font-weight: bold;', data);
     try {
        const response = await databases.updateDocument<Cita & Models.Document>(
            DATABASE_ID,
            CITAS_COLLECTION_ID,
            id,
            data
        );
        console.log(`%c✓ Cita ${id} actualizada exitosamente`, 'color: orange;', response);
        return response;
     } catch(error) {
        console.error(`%c✗ Error al actualizar cita ${id}:`, 'color: red; font-weight: bold;', error);
        throw error;
     }
};

// --- deleteCita ---
export const deleteCita = async (id: string): Promise<void> => {
    console.log(`%c=== ELIMINAR CITA ${id} ===`, 'color: red; font-weight: bold;');
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            CITAS_COLLECTION_ID,
            id
        );
        console.log(`%c✓ Cita ${id} eliminada exitosamente`, 'color: red;');
    } catch (error) {
        console.error(`%c✗ Error al eliminar cita ${id}:`, 'color: red; font-weight: bold;', error);
        throw error;
    }
};