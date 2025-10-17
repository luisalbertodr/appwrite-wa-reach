import { databases, DATABASE_ID, ARTICULOS_COLLECTION_ID, FAMILIAS_COLLECTION_ID } from '@/lib/appwrite';
import { Articulo, Familia, LipooutUserInput } from '@/types'; // Import LipooutUserInput
import { ID, Query, Models } from 'appwrite'; // Import Models

// --- API de Familias ---

export const getFamilias = async (): Promise<Familia[]> => {
  const response = await databases.listDocuments<Familia>(
    DATABASE_ID,
    FAMILIAS_COLLECTION_ID,
    [Query.limit(100)]
  );
  return response.documents;
};

// --- API de Artículos ---

// Usamos el helper LipooutUserInput
export type CreateArticuloInput = LipooutUserInput<Articulo>;
// Update es Partial del Create type
export type UpdateArticuloInput = Partial<CreateArticuloInput>;

export const getArticulos = async (familiaId?: string): Promise<Articulo[]> => {
  const queries = [Query.limit(100)];
  if (familiaId) {
    queries.push(Query.equal('familia_id', familiaId));
  }
  // Añadimos selección explícita para asegurar que familia se trae (si Appwrite lo permite)
  // o ajustamos el tipo Articulo si 'familia' no viene anidado por defecto
  const response = await databases.listDocuments<Articulo>(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    queries
  );
  return response.documents;
};

export const createArticulo = (articuloInput: CreateArticuloInput) => {
   // Appwrite no permite crear/actualizar con objetos anidados directamente
   // Nos aseguramos de enviar solo los campos permitidos y el ID de relación
   const { familia, ...rest } = articuloInput; // Quitamos el objeto 'familia'
   const articuloToSave = {
     ...rest,
     familia_id: articuloInput.familia_id // Aseguramos que el ID de familia está
   };

   // Validamos que los campos requeridos como 'precio' y 'tipo' están
   if (articuloToSave.precio === undefined || !articuloToSave.tipo || !articuloToSave.familia_id) {
       throw new Error("Faltan campos requeridos para crear el artículo (nombre, precio, tipo, familia_id).");
   }


  return databases.createDocument<Articulo & Models.Document>( // Añadimos Models.Document para el retorno
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    ID.unique(),
    articuloToSave // Enviamos el objeto sin 'familia' anidada
  );
};

export const updateArticulo = (id: string, articuloInput: UpdateArticuloInput) => {
   // Similar a create, quitamos 'familia' si está presente
   const { familia, ...articuloToUpdate } = articuloInput;
  return databases.updateDocument<Articulo & Models.Document>( // Añadimos Models.Document para el retorno
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id,
    articuloToUpdate
  );
};

export const deleteArticulo = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id
  );
};