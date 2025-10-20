import { PDFDownloadLink } from '@react-pdf/renderer';
import { FacturaPDF } from './FacturaPDF';
import { Factura, Configuracion } from '@/types';
import { Models } from 'appwrite';
import LoadingSpinner from '../LoadingSpinner';

interface DownloadFacturaPDFProps {
  factura: Factura;
  config: Configuracion & Models.Document;
  children: React.ReactNode;
  className?: string; // Para pasar el className al componente hijo
}

/**
 * Este componente envuelve el botón/enlace de descarga.
 * Utiliza PDFDownloadLink para generar el PDF en el cliente.
 */
export const DownloadFacturaPDF = ({ factura, config, children, className }: DownloadFacturaPDFProps) => {
  const docTitle = factura.estado === 'presupuesto' ? 'Presupuesto' : 'Factura';
  const fileName = `${docTitle}-${factura.numeroFactura.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;

  return (
    <PDFDownloadLink
      document={<FacturaPDF factura={factura} config={config} />}
      fileName={fileName}
    >
      {({ blob, url, loading, error }) =>
        loading ? (
            // Clonamos el children (DropdownMenuItem) y le ponemos estado 'disabled'
             React.cloneElement(children as React.ReactElement, {
                disabled: true,
                className: `${className} opacity-50`,
                children: <> <LoadingSpinner className="w-4 h-4 mr-2" /> Generando...</>
             })
        ) : (
            // Clonamos el children (DropdownMenuItem) y le pasamos el className
             React.cloneElement(children as React.ReactElement, { className })
        )
      }
    </PDFDownloadLink>
  );
};