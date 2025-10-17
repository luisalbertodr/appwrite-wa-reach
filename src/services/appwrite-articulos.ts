import { databases, DATABASE_ID, ARTICULOS_COLLECTION_ID, FAMILIAS_COLLECTION_ID } from '@/lib/appwrite';
import { Articulo, ArticuloInput, Familia } from '@/types'; // Import ArticuloInput
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

// Usamos el tipo ArticuloInput directamente
export type CreateArticuloInput = ArticuloInput;
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
   const articuloToSave = {
     ...articuloInput,
   };

   // Validamos que los campos requeridos como 'precio' y 'tipo' están
   if (articuloToSave.precio === undefined || !articuloToSave.tipo || !articuloToSave.familia_id) {
       throw new Error("Faltan campos requeridos para crear el artículo (nombre, precio, tipo, familia_id).");
   }


  return databases.createDocument( // Añadimos Models.Document para el retorno
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    ID.unique(),
    articuloToSave // Enviamos el objeto sin 'familia' anidada
  ) as Promise<Articulo & Models.Document>;
};

export const updateArticulo = (id: string, articuloInput: UpdateArticuloInput) => {
   // Similar a create, quitamos 'familia' si está presente
   const articuloToUpdate = { ...articuloInput };
  return databases.updateDocument( // Añadimos Models.Document para el retorno
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id,
    articuloToUpdate
  ) as Promise<Articulo & Models.Document>;
};

export const deleteArticulo = (id: string) => {
  return databases.deleteDocument(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    id
  );
};
