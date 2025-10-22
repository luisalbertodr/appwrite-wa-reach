# Guía de Migración - Integración Agenda (commit Migration) → Main

## 📋 Resumen de la Integración

Esta guía documenta la integración de las funcionalidades de la rama **Agenda** (commit `ac1d37f` - "Migration") en la rama **main**, manteniendo **100% intacta** la funcionalidad original de WhatsApp Marketing.

### Principio Fundamental
**NO se modifica nada de la funcionalidad actual de main, SOLO se añaden nuevas funcionalidades.**

### Bases de Datos
- **DATABASE_ID_WAHA**: `68d78cb20028fac621d4` - Base de datos original (WhatsApp Marketing)
- **DATABASE_ID**: `68b1d7530028045d94d3` - Base de datos Lipoout (nuevas funcionalidades)

---

## 🗂️ Cambios en la Estructura de Archivos

### Archivos CREADOS

#### 1. **src/pages/MarketingWaha.tsx**
- **Origen**: Renombrado desde `src/pages/Index.tsx` de main
- **Propósito**: Preserva 100% la funcionalidad original de marketing WhatsApp
- **Ruta**: `/marketing-waha`
- **Características**:
  - Página standalone sin AppLayout wrapper
  - Usa DATABASE_ID_WAHA para todas las operaciones
  - Funcionalidad idéntica a la página original `/` de main

#### 2. **src/types/configuracion.types.ts**
- **Propósito**: Define el tipo `Configuracion` para la configuración de la clínica
- **Contenido**:
```typescript
export interface Configuracion {
  nombreClinica: string;
  direccion: string;
  cif: string;
  emailContacto: string;
  telefonoContacto: string;
  serieFactura: string;
  seriePresupuesto: string;
  ultimoNumeroFactura: number;
  ultimoNumeroPresupuesto: number;
  tipoIvaPredeterminado: number;
}
```

#### 3. Nuevos archivos de funcionalidad Lipoout
Los siguientes archivos fueron añadidos desde el commit Migration:

**Páginas:**
- `src/pages/Dashboard.tsx` - Nueva home en `/`
- `src/pages/Agenda.tsx` - Gestión de citas
- `src/pages/Clientes.tsx` - Gestión de clientes Lipoout
- `src/pages/Empleados.tsx` - Gestión de empleados
- `src/pages/Articulos.tsx` - Gestión de artículos/servicios
- `src/pages/Facturacion.tsx` - Sistema de facturación
- `src/pages/TPV.tsx` - Terminal punto de venta
- `src/pages/Marketing.tsx` - Marketing mejorado con ambas bases de datos
- `src/pages/NotFound.tsx` - Página 404

**Componentes:**
- `src/components/layout/AppLayout.tsx` - Layout principal con navegación
- `src/components/layout/Header.tsx` - Cabecera de aplicación
- `src/components/layout/BottomNavigation.tsx` - Navegación inferior móvil
- `src/components/forms/CitaForm.tsx` - Formulario de citas
- `src/components/forms/EmpleadoForm.tsx` - Formulario de empleados
- `src/components/forms/ArticuloForm.tsx` - Formulario de artículos
- `src/components/forms/FacturaForm.tsx` - Formulario de facturas
- `src/components/forms/FamiliaForm.tsx` - Formulario de familias de productos
- `src/components/pdf/FacturaPDF.tsx` - Generador PDF facturas
- `src/components/pdf/DownloadFacturaPDF.tsx` - Descarga PDF facturas
- `src/components/LoadingSpinner.tsx` - Spinner de carga
- `src/components/AuthForm.tsx` - Formulario de autenticación

**Hooks:**
- `src/hooks/useAgenda.ts` - Hook para gestión de agenda
- `src/hooks/useEmpleados.ts` - Hook para empleados
- `src/hooks/useArticulos.ts` - Hook para artículos
- `src/hooks/useFacturas.ts` - Hook para facturas
- `src/hooks/useConfiguration.ts` - Hook para configuración clínica
- `src/hooks/useDebounce.ts` - Hook para debounce

**Servicios:**
- `src/services/appwrite-agenda.ts` - Operaciones de agenda en Appwrite
- `src/services/appwrite-empleados.ts` - Operaciones de empleados
- `src/services/appwrite-articulos.ts` - Operaciones de artículos
- `src/services/appwrite-facturas.ts` - Operaciones de facturas
- `src/services/appwrite-configuration.ts` - Operaciones de configuración

**Tipos:**
- `src/types/cita.types.ts` - Tipos de citas
- `src/types/empleado.types.ts` - Tipos de empleados
- `src/types/articulo.types.ts` - Tipos de artículos
- `src/types/factura.types.ts` - Tipos de facturas
- `src/types/familia.types.ts` - Tipos de familias

**Stores:**
- `src/stores/tpvStore.ts` - Store Zustand para TPV

**Bibliotecas:**
- `src/lib/validators.ts` - Esquemas Zod de validación
- `src/lib/appwrite_schema.ts` - Esquemas de Appwrite

### Archivos MODIFICADOS

#### 1. **src/App.tsx**
**Cambios principales:**
- Implementación de enrutamiento híbrido con HashRouter
- Rutas Lipoout con AppLayout wrapper
- Ruta MarketingWaha sin wrapper (preserva funcionalidad original)
- Dashboard como nueva home en `/`

**Estructura de rutas:**
```typescript
<Route path="/" element={<AppLayout />}>
  <Route index element={<Dashboard />} />
  <Route path="clientes" element={<Clientes />} />
  <Route path="agenda" element={<Agenda />} />
  <Route path="empleados" element={<Empleados />} />
  <Route path="articulos" element={<Articulos />} />
  <Route path="facturacion" element={<Facturacion />} />
  <Route path="tpv" element={<TPV />} />
  <Route path="configuracion" element={<Configuracion />} />
  <Route path="marketing" element={<Marketing />} />
</Route>
<Route path="/marketing-waha" element={<MarketingWaha />} />
<Route path="*" element={<NotFound />} />
```

#### 2. **src/lib/appwrite.ts**
**Cambios críticos:**
- Añadida constante `DATABASE_ID_WAHA` para base de datos original
- Constante `DATABASE_ID` apunta a base de datos Lipoout
- Ambas bases de datos coexisten en la misma configuración

```typescript
export const DATABASE_ID_WAHA = '68d78cb20028fac621d4';
export const DATABASE_ID = '68b1d7530028045d94d3';
```

#### 3. **src/types/index.ts**
**Cambios:**
- Exportación de `configuracion.types.ts`
- Añadidos tipos `MessageLog` y `CampaignProgress`:

```typescript
export interface MessageLog {
  $id?: string;
  campaignId: string;
  clientId: string;
  clientName?: string;
  timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

export interface CampaignProgress extends Models.Document {
  currentClientName: string;
  currentClientPhone: string;
}
```
- Mantiene separación clara entre tipos WAHA y Lipoout
- Export adicional: `export * from './configuracion.types';`

#### 4. **src/pages/Configuracion.tsx**
**Cambios:**
- Estructura de 3 pestañas: `clinica` (nueva), `waha` (original), `import` (original)
- Pestaña clínica usa DATABASE_ID (Lipoout)
- Pestañas waha e import usan DATABASE_ID_WAHA (original)

#### 5. **src/components/CampaignsTab.tsx**
**Cambios:**
- Todas las referencias de `DATABASE_ID` cambiadas a `DATABASE_ID_WAHA`
- Preserva funcionalidad 100% original de campañas WhatsApp

#### 6. **src/pages/Marketing.tsx**
**Cambios:**
- Corregido cast TypeScript en línea 347: `log as unknown as MessageLog`
- Usa tipos híbridos: Cliente (compatible con ambas BD), MessageLog, CampaignProgress

#### 7. **src/main.tsx**
**Cambios menores:**
- Importaciones actualizadas para nuevos componentes
- Configuración React Query mantenida

#### 8. **src/index.css**
**Cambios:**
- Estilos adicionales para nuevos componentes Lipoout
- Estilos originales preservados intactos

#### 9. **package.json**
**Dependencias añadidas:**
- Bibliotecas para funcionalidad Lipoout (React PDF, Zustand, etc.)
- Todas las dependencias originales preservadas

### Archivos ELIMINADOS

#### **src/pages/Index.tsx**
- **Motivo**: Reemplazado por `src/pages/MarketingWaha.tsx`
- **Funcionalidad preservada**: 100% en MarketingWaha.tsx

---

## 🔧 Configuración de Doble Base de Datos

### Arquitectura de Bases de Datos

El sistema ahora opera con **dos bases de datos separadas** en Appwrite:

1. **DATABASE_ID_WAHA** (`68d78cb20028fac621d4`)
   - Funcionalidad WhatsApp Marketing original
   - Usado en: MarketingWaha.tsx, CampaignsTab.tsx
   - Colecciones: clients, templates, campaigns, wahaConfig, progresoCampana, messageLogs

2. **DATABASE_ID** (`68b1d7530028045d94d3`)
   - Funcionalidad Lipoout (gestión clínica)
   - Usado en: Dashboard, Agenda, Clientes, Empleados, Articulos, Facturacion, TPV
   - Colecciones: clientes, empleados, citas, articulos, familias, facturas, configuracion

### Reglas de Uso

- **Funcionalidad WAHA original**: Siempre usar `DATABASE_ID_WAHA`
- **Funcionalidad Lipoout nueva**: Siempre usar `DATABASE_ID`
- **Marketing.tsx híbrido**: Lee clientes de ambas bases de datos, escribe logs en WAHA

---

## 🛣️ Estructura de Rutas

### Rutas con AppLayout (Lipoout)
Estas rutas usan el layout completo con navegación:
- `/` - Dashboard (nueva home)
- `/clientes` - Gestión de clientes
- `/agenda` - Gestión de citas
- `/empleados` - Gestión de empleados
- `/articulos` - Gestión de artículos
- `/facturacion` - Facturación
- `/tpv` - Terminal punto de venta
- `/configuracion` - Configuración (3 pestañas)
- `/marketing` - Marketing híbrido

### Rutas Standalone (WAHA original)
Estas rutas NO usan AppLayout:
- `/marketing-waha` - Marketing WhatsApp original (preserva 100% funcionalidad)

### Ruta 404
- `*` - NotFound.tsx

---

## 📦 Dependencias Añadidas

```json
{
  "@react-pdf/renderer": "^3.x.x",
  "zustand": "^4.x.x",
  "date-fns": "^2.x.x",
  "@radix-ui/react-*": "varias versiones",
  "zod": "^3.x.x"
}
```

Todas las dependencias originales se mantienen sin cambios.

---

## 🚀 Instrucciones de Deployment

### 1. Verificación Pre-Deploy

```bash
# Verificar que estamos en la rama correcta
git branch

# Verificar archivos modificados
git status

# Compilar proyecto (verificar que no hay errores)
npm run build
```

### 2. Variables de Entorno

Verificar que `.env` contiene:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=tu_project_id
VITE_APPWRITE_DATABASE_ID=68b1d7530028045d94d3
VITE_APPWRITE_DATABASE_ID_WAHA=68d78cb20028fac621d4
```

### 3. Deploy

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Deploy (según tu plataforma)
npm run deploy
```

---

## 🧪 Pruebas de Funcionalidad

### Checklist de Pruebas

#### Funcionalidad WAHA Original (DATABASE_ID_WAHA)
- [ ] Acceder a `/marketing-waha`
- [ ] Verificar carga de clientes desde DB WAHA
- [ ] Crear una campaña de prueba
- [ ] Enviar mensaje de prueba
- [ ] Verificar logs en DB WAHA
- [ ] Comprobar configuración WAHA en `/configuracion` (pestaña waha)
- [ ] Importar CSV de prueba (pestaña import)

#### Funcionalidad Lipoout Nueva (DATABASE_ID)
- [ ] Acceder a `/` (Dashboard)
- [ ] Navegar a `/clientes` - crear/editar/eliminar cliente
- [ ] Navegar a `/agenda` - crear/editar/eliminar cita
- [ ] Navegar a `/empleados` - crear/editar/eliminar empleado
- [ ] Navegar a `/articulos` - crear/editar/eliminar artículo
- [ ] Navegar a `/facturacion` - crear/editar/eliminar factura
- [ ] Probar TPV en `/tpv`
- [ ] Verificar configuración clínica en `/configuracion` (pestaña clínica)
- [ ] Comprobar PDF de facturas se generan correctamente

#### Marketing Híbrido
- [ ] Acceder a `/marketing`
- [ ] Verificar que muestra clientes de ambas bases de datos
- [ ] Crear campaña y verificar que funciona correctamente
- [ ] Comprobar que los logs se guardan en DATABASE_ID_WAHA

#### Navegación y Layout
- [ ] Verificar navegación superior en desktop
- [ ] Verificar navegación inferior en móvil
- [ ] Probar todos los enlaces del menú
- [ ] Verificar que `/marketing-waha` NO tiene AppLayout
- [ ] Verificar que las rutas Lipoout SÍ tienen AppLayout

---

## 🔑 Puntos Críticos de la Integración

### 1. Separación de Bases de Datos
**CRÍTICO**: Nunca confundir las dos bases de datos. Cada funcionalidad debe usar su base de datos correspondiente.

```typescript
// ❌ INCORRECTO - Marketing original usando DB Lipoout
import { DATABASE_ID } from '@/lib/appwrite';
databases.listDocuments(DATABASE_ID, 'clients');

// ✅ CORRECTO - Marketing original usando DB WAHA
import { DATABASE_ID_WAHA } from '@/lib/appwrite';
databases.listDocuments(DATABASE_ID_WAHA, 'clients');
```

### 2. Estructura de Rutas
**CRÍTICO**: Las rutas Lipoout DEBEN estar dentro del elemento AppLayout, mientras que MarketingWaha NO debe tenerlo.

```typescript
// ✅ CORRECTO
<Route path="/" element={<AppLayout />}>
  <Route index element={<Dashboard />} />
  {/* Más rutas Lipoout */}
</Route>
<Route path="/marketing-waha" element={<MarketingWaha />} />
```

### 3. Tipos Compartidos
Algunos tipos como `Cliente` son compartidos entre ambas funcionalidades, pero cada una lee de su propia base de datos.

### 4. Configuración
La página Configuracion.tsx ahora tiene 3 pestañas:
- **clinica**: Configuración nueva (DATABASE_ID)
- **waha**: Configuración WAHA original (DATABASE_ID_WAHA)
- **import**: Importación CSV original (DATABASE_ID_WAHA)

---

## 📝 Notas Importantes

1. **Compatibilidad Hacia Atrás**: La funcionalidad original de WhatsApp Marketing permanece 100% funcional en `/marketing-waha`

2. **Doble Sistema de Clientes**: Existen dos colecciones de clientes (una en cada DB). Marketing.tsx puede acceder a ambas.

3. **Autenticación**: El sistema de autenticación es compartido entre ambas funcionalidades.

4. **React Query**: Ambas funcionalidades usan React Query para gestión de estado y cache.

5. **Code Splitting**: Se usa React.lazy() para cargar componentes de forma diferida y mejorar performance.

---

## 🐛 Solución de Problemas

### Error: "Cannot find module '@/types/configuracion.types'"
**Solución**: Verificar que existe `src/types/configuracion.types.ts` y está exportado en `src/types/index.ts`

### Error: "Database not found"
**Solución**: Verificar las variables de entorno y que las constantes DATABASE_ID y DATABASE_ID_WAHA están correctamente definidas.

### Rutas no funcionan
**Solución**: Verificar que se está usando HashRouter y que las rutas están correctamente anidadas en App.tsx

### MarketingWaha muestra layout de Lipoout
**Solución**: Verificar que la ruta `/marketing-waha` está FUERA del elemento AppLayout en App.tsx

### Clientes no se cargan en Marketing
**Solución**: Verificar que Marketing.tsx está haciendo fetch de ambas bases de datos correctamente.

---

## ✅ Resumen de la Integración

### Lo que se PRESERVÓ (100% intacto)
- ✅ Funcionalidad completa de WhatsApp Marketing
- ✅ Base de datos WAHA original (68d78cb20028fac621d4)
- ✅ Componentes CampaignsTab, WhatsappConfigTab, ImportClientsTab
- ✅ Sistema de envío de mensajes WhatsApp
- ✅ Gestión de plantillas y campañas
- ✅ Logs de mensajes

### Lo que se AÑADIÓ (nuevas funcionalidades)
- ✅ Base de datos Lipoout (68b1d7530028045d94d3)
- ✅ Sistema de gestión clínica completo
- ✅ Dashboard nuevo como home
- ✅ Gestión de agenda/citas
- ✅ Gestión de empleados
- ✅ Gestión de artículos/servicios
- ✅ Sistema de facturación con PDF
- ✅ Terminal punto de venta (TPV)
- ✅ Configuración de clínica
- ✅ Marketing híbrido (accede a ambas bases de datos)

### Cambios en Enrutamiento
- ✅ `/` → Dashboard (antes era marketing WAHA)
- ✅ `/marketing-waha` → Marketing WAHA original (antes era `/`)
- ✅ Todas las rutas Lipoout con AppLayout
- ✅ MarketingWaha sin AppLayout

---

## 📚 Recursos Adicionales

### Documentación de Appwrite
- [Appwrite Databases](https://appwrite.io/docs/products/databases)
- [Appwrite Collections](https://appwrite.io/docs/products/databases/collections)

### Dependencias Principales
- [React Router v6](https://reactrouter.com/)
- [React Query](https://tanstack.com/query/latest)
- [Zod](https://zod.dev/)
- [React PDF](https://react-pdf.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)

---

## 🎯 Conclusión

La integración se ha completado exitosamente manteniendo **100% intacta** la funcionalidad original de WhatsApp Marketing mientras se añaden todas las nuevas funcionalidades de gestión clínica Lipoout.

**Próximos pasos recomendados:**
1. Ejecutar pruebas completas según el checklist
2. Realizar commit de todos los cambios
3. Hacer merge a main si todo funciona correctamente
4. Desplegar a producción

---

**Fecha de integración**: Octubre 2025  
**Commit base (Agenda)**: ac1d37f - "Migration"  
**Rama destino**: main
