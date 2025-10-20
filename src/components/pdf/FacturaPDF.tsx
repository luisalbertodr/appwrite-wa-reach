import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Configuracion, Factura, LineaFactura } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar fuentes (opcional, pero recomendado para compatibilidad)
// Font.register({
//   family: 'Roboto',
//   fonts: [
//     { src: 'https://cdnjs.cloudflare.com/ajax/libs/roboto-fontface/0.10.0/fonts/Roboto/roboto-regular-webfont.woff' },
//     { src: 'https://cdnjs.cloudflare.com/ajax/libs/roboto-fontface/0.10.0/fonts/Roboto/roboto-bold-webfont.woff', fontWeight: 'bold' },
//   ]
// });

// Definición de Estilos
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', // Usar fuentes seguras si no se registran
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 10,
  },
  headerColumn: {
    flexDirection: 'column',
  },
  headerLogo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444444',
  },
  headerAddress: {
    fontSize: 9,
    color: '#666666',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  docInfo: {
    fontSize: 10,
    textAlign: 'right',
    color: '#444444',
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  clientColumn: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 2,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#f0f0f0',
    padding: 5,
    fontWeight: 'bold',
  },
  tableHeaderColDesc: {
    width: '50%',
  },
  tableHeaderCol: {
    width: '12.5%',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    padding: 5,
  },
  tableRowColDesc: {
    width: '50%',
  },
  tableRowCol: {
    width: '12.5%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsContainer: {
    width: '40%',
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#aaaaaa',
  },
  totalLabelBold: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalValueBold: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 8,
    color: 'grey',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 35,
    fontSize: 8,
    color: 'grey',
  },
});

// Helper para formatear moneda
const formatCurrency = (value: number) => {
    return (value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};

// Componente del Documento PDF
export const FacturaPDF = ({ factura, config }: { factura: Factura, config: Configuracion }) => {

    // Asegurarse de que las líneas estén parseadas (clave para TPV)
    let lineasParseadas: LineaFactura[] = [];
    if (typeof factura.lineas === 'string') {
        try { lineasParseadas = JSON.parse(factura.lineas); } catch (e) { }
    } else if (Array.isArray(factura.lineas)) {
        lineasParseadas = factura.lineas;
    }
    
    const docTitle = factura.estado === 'presupuesto' ? 'PRESUPUESTO' : 'FACTURA';

    return (
    <Document title={`${docTitle} - ${factura.numeroFactura}`}>
      <Page size="A4" style={styles.page}>
        
        {/* --- 1. Cabecera (Clínica y Datos Factura) --- */}
        <View style={styles.header}>
          <View style={styles.headerColumn}>
            <Text style={styles.headerLogo}>{config.nombreClinica || 'Lipoout'}</Text>
            <Text style={styles.headerAddress}>{config.direccion || 'Dirección no configurada'}</Text>
            <Text style={styles.headerAddress}>CIF: {config.cif || 'N/A'}</Text>
            <Text style={styles.headerAddress}>{config.emailContacto || ''} - {config.telefonoContacto || ''}</Text>
          </View>
          <View style={styles.headerColumn}>
            <Text style={styles.docTitle}>{docTitle}</Text>
            <Text style={styles.docInfo}>Nº: {factura.numeroFactura}</Text>
            <Text style={styles.docInfo}>Fecha: {format(parseISO(factura.fechaEmision), 'dd/MM/yyyy', { locale: es })}</Text>
            {factura.estado !== 'presupuesto' && factura.fechaVencimiento && (
                <Text style={styles.docInfo}>Vencimiento: {format(parseISO(factura.fechaVencimiento), 'dd/MM/yyyy', { locale: es })}</Text>
            )}
          </View>
        </View>

        {/* --- 2. Datos del Cliente --- */}
        <View style={styles.clientInfo}>
            <View style={styles.clientColumn}>
                <Text style={styles.label}>Cliente:</Text>
                <Text>{factura.cliente?.nombre_completo || 'Cliente no especificado'}</Text>
                <Text>{factura.cliente?.dnicli || factura.cliente?.email || ''}</Text>
            </View>
             <View style={styles.clientColumn}>
                <Text style={styles.label}>Dirección:</Text>
                <Text>{factura.cliente?.dircli || ''}</Text>
                <Text>{factura.cliente?.codposcli || ''} {factura.cliente?.pobcli || ''}</Text>
            </View>
        </View>

        {/* --- 3. Líneas de Factura (Tabla) --- */}
        <View style={styles.table}>
            {/* Cabecera Tabla */}
            <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderColDesc}>Descripción</Text>
                <Text style={styles.tableHeaderCol}>Cant.</Text>
                <Text style={styles.tableHeaderCol}>Precio U.</Text>
                <Text style={styles.tableHeaderCol}>Dto %</Text>
                <Text style={styles.tableHeaderCol}>IVA %</Text>
                <Text style={styles.tableHeaderCol}>Total</Text>
            </View>
            {/* Filas Tabla */}
            {lineasParseadas.map(linea => (
                <View style={styles.tableRow} key={linea.id}>
                    <Text style={styles.tableRowColDesc}>{linea.descripcion}</Text>
                    <Text style={styles.tableRowCol}>{linea.cantidad}</Text>
                    <Text style={styles.tableRowCol}>{linea.precioUnitario.toFixed(2)}</Text>
                    <Text style={styles.tableRowCol}>{linea.descuentoPorcentaje.toFixed(0)}%</Text>
                    <Text style={styles.tableRowCol}>{linea.tipoIva.toFixed(0)}%</Text>
                    <Text style={styles.tableRowCol}>{linea.totalSinIva.toFixed(2)}</Text>
                </View>
            ))}
        </View>
        
        {/* --- 4. Totales --- */}
        <View style={styles.totals}>
            <View style={styles.totalsContainer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Base Imponible</Text>
                    <Text style={styles.totalValue}>{formatCurrency(factura.baseImponible)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total IVA</Text>
                    <Text style={styles.totalValue}>{formatCurrency(factura.totalIva)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>{formatCurrency(factura.totalFactura)}</Text>
                </View>
                {factura.importeDescuentoGlobal > 0 && (
                     <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Dto. Global ({factura.descuentoGlobalPorcentaje}%)</Text>
                        <Text style={styles.totalValue}>-{formatCurrency(factura.importeDescuentoGlobal)}</Text>
                    </View>
                )}
                <View style={styles.totalRowBold}>
                    <Text style={styles.totalLabelBold}>TOTAL A PAGAR</Text>
                    <Text style={styles.totalValueBold}>{formatCurrency(factura.totalAPagar)}</Text>
                </View>
            </View>
        </View>

        {/* --- 5. Footer (Notas y Pago) --- */}
        {factura.metodoPago && (
             <View style={{...styles.totals, justifyContent: 'flex-start', marginTop: 10}}>
                <Text style={{fontWeight: 'bold'}}>Método de pago: </Text>
                <Text>{factura.metodoPago}</Text>
             </View>
        )}
         {factura.notas && (
             <View style={{...styles.totals, justifyContent: 'flex-start', marginTop: 10, flexDirection: 'column'}}>
                <Text style={styles.label}>Notas:</Text>
                <Text>{factura.notas}</Text>
             </View>
        )}


        {/* --- 6. Números de Página --- */}
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
        <Text style={styles.footer} fixed>
            Gracias por confiar en {config.nombreClinica || 'Lipoout'}.
        </Text>
      </Page>
    </Document>
)};