import { databases, DATABASE_ID, ARTICULOS_COLLECTION_ID, FAMILIAS_COLLECTION_ID } from '@/lib/appwrite';
import { Articulo, ArticuloInput, Familia, LipooutUserInput } from '@/types'; // Import LipooutUserInput
import { ID, Query, Models } from 'appwrite';

// --- API de Familias ---

// (NUEVO) Tipo Input para Familia
export type FamiliaInput = LipooutUserInput<Familia>;

export const getFamilias = async (): Promise<(Familia & Models.Document)[]> => {
  const response = await databases.listDocuments<Familia & Models.Document>(
    DATABASE_ID,
    FAMILIAS_COLLECTION_ID,
    [Query.limit(100)]
  );
  return response.documents;
};

// (NUEVO)
export const createFamilia = (familiaInput: FamiliaInput) => {
    return databases.createDocument<Familia & Models.Document>(
        DATABASE_ID,
        FAMILIAS_COLLECTION_ID,
        ID.unique(),
        familiaInput
    );
};

// (NUEVO)
export const updateFamilia = (id: string, familiaInput: Partial<FamiliaInput>) => {
    return databases.updateDocument<Familia & Models.Document>(
        DATABASE_ID,
        FAMILIAS_COLLECTION_ID,
        id,
        familiaInput
    );
};

// (NUEVO)
export const deleteFamilia = (id: string) => {
    return databases.deleteDocument(
        DATABASE_ID,
        FAMILIAS_COLLECTION_ID,
        id
    );
    // TODO: Considerar qué pasa con los artículos que tienen esta familia_id
    // Se podría necesitar una función de Appwrite para actualizar artículos
};


// --- API de Artículos ---

// Usamos el tipo ArticuloInput directamente
export type CreateArticuloInput = ArticuloInput;
// Update es Partial del Create type
export type UpdateArticuloInput = Partial<CreateArticuloInput>;

export const getArticulos = async (familiaId?: string): Promise<(Articulo & Models.Document)[]> => {
  const queries = [Query.limit(100)];
  if (familiaId) {
    queries.push(Query.equal('familia_id', familiaId));
  }
  // TODO: Appwrite por defecto no expande relaciones (como 'familia')
  // Para que 'familia.nombre' funcione, necesitaríamos hacer un "join" manual
  // o Appwrite 1.5+ tendría soporte para relaciones.
  // Por ahora, 'familia' será solo un ID o faltará.
  
  const response = await databases.listDocuments<Articulo & Models.Document>(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    queries
  );

  // --- Workaround para "poblar" la familia ---
  // Esto es ineficiente (N+1 query) pero necesario sin Relaciones de Appwrite
  // Una mejor solución sería cachear familias en el cliente
  const familias = await getFamilias();
  const familiaMap = new Map(familias.map(f => [f.$id, f]));

  return response.documents.map(articulo => ({
      ...articulo,
      familia: familiaMap.get(articulo.familia_id) // "Poblamos" la familia usando familia_id
  }));
};

export const createArticulo = (articuloInput: CreateArticuloInput) => {
   const articuloToSave: any = {
     ...articuloInput,
   };
   
   if (articuloToSave.precio === undefined || !articuloToSave.tipo || !articuloToSave.familia_id) {
       throw new Error("Faltan campos requeridos para crear el artículo (nombre, precio, tipo, familia_id).");
   }
   
   // Limpiar campos undefined para evitar errores en Appwrite
   Object.keys(articuloToSave).forEach(key => {
     if (articuloToSave[key] === undefined) {
       delete articuloToSave[key];
     }
   });

  return databases.createDocument(
    DATABASE_ID,
    ARTICULOS_COLLECTION_ID,
    ID.unique(),
    articuloToSave
  ) as Promise<Articulo & Models.Document>;
};

export const updateArticulo = (id: string, articuloInput: UpdateArticuloInput) => {
   console.log('🔍 updateArticulo - Input recibido:', articuloInput);
   const articuloToUpdate: any = { ...articuloInput };
   
   // Limpiar campos undefined para evitar errores en Appwrite
   Object.keys(articuloToUpdate).forEach(key => {
     if (articuloToUpdate[key] === undefined) {
       delete articuloToUpdate[key];
     }
   });
   
   console.log('📤 updateArticulo - Datos a enviar a Appwrite:', articuloToUpdate);
   console.log('📋 updateArticulo - ID del documento:', id);
   
  return databases.updateDocument(
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
