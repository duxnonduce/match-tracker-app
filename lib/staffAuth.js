// FILE: /lib/staffAuth.js
// Helper server-side per verificare CHI, tra lo staff, sta chiamando una
// API — e se ha il ruolo admin. Import SOLO da codice server.

import jwt from 'jsonwebtoken';

/** Ritorna il payload dello staff (staffId, academyId, fullName, role) o null se il token manca/non è valido. */
export function getStaffFromToken(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.STAFF_JWT_SECRET);
    return payload;
  } catch (e) {
    return null; // token scaduto o non valido
  }
}

/**
 * Come sopra, ma richiede ANCHE che lo staff sia admin E appartenga
 * all'Academy indicata — usato per gestire abbonamento/staff/dati
 * amministrativi, che solo il Super Operatore può toccare.
 */
export function requireAdmin(request, academyId) {
  const staff = getStaffFromToken(request);
  if (!staff) return null;
  if (staff.role !== 'admin') return null;
  if (academyId && staff.academyId !== academyId) return null;
  return staff;
}
