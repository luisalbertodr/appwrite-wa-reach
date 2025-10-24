import { Client } from "@/types";

export const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const validateDniNie = (dni: string) => {
  if (!dni) return false;
  dni = dni.toUpperCase().trim();
  const dniRegex = /^(\d{8})([A-Z])$/;
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  const letterMap = 'TRWAGMYFPDXBNJZSQVHLCKE';

  if (dniRegex.test(dni)) {
      const [, num, letter] = dni.match(dniRegex)!;
      const expectedLetter = letterMap[parseInt(num) % 23];
      return letter === expectedLetter;
  } else if (nieRegex.test(dni)) { 
      const niePrefix = dni.charAt(0);
      const nieNum = (niePrefix === 'X' ? '0' : niePrefix === 'Y' ? '1' : '2') + dni.substring(1, 8);
      const letter = dni.charAt(8);
      const expectedLetter = letterMap[parseInt(nieNum) % 23];
      return letter === expectedLetter;
  }
  return false;
};

export const validateMobilePhone = (phone: string) => {
  if (!phone) return false;
  const mobileRegex = /^[67]\d{8}$/; 
  return mobileRegex.test(phone);
};

export const validateClient = (clientData: Partial<Client>, isStrict = true): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!clientData.codcli || !/^\d{6}$/.test(clientData.codcli)) {
    errors.codcli = 'El código de cliente es requerido y debe tener 6 dígitos.';
  }

  if ((isStrict || clientData.nomcli) && !clientData.nomcli) {
    errors.nomcli = 'El nombre es requerido.';
  }

  if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) {
    errors.email = 'Email inválido.';
  } else if (isStrict && !clientData.email) {
    errors.email = 'Email requerido.';
  }
  
  if (clientData.dnicli && !validateDniNie(clientData.dnicli)) {
    errors.dnicli = 'DNI/NIE inválido.';
  } else if (isStrict && !clientData.dnicli) {
    errors.dnicli = 'DNI/NIE requerido.';
  }

  if ((isStrict || clientData.tel2cli) && !clientData.tel2cli) {
    errors.tel2cli = 'Teléfono móvil principal requerido.';
  } else if (clientData.tel2cli && !validateMobilePhone(clientData.tel2cli)) {
    errors.tel2cli = 'Teléfono principal inválido (debe empezar por 6 o 7 y tener 9 dígitos).';
  }

  if (clientData.fecnac && calculateAge(clientData.fecnac) < 0) {
      errors.fecnac = 'La fecha de nacimiento no puede ser futura.';
  }

  return errors;
};