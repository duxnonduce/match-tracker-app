// FILE: /app/api/staff/update/route.js
// Solo il Super Operatore può modificare lo staff. Gestisce in un unico
// posto: rinomina, cambio PIN, attiva/disattiva, cambio ruolo — passa
// solo i campi che vuoi effettivamente cambiare.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../../../../lib/staffAuth';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId, staffId, fullName, newPin, active, role } = await request.json();

  const requester = requireAdmin(request, academyId);
  if (!requester) {
    return Response.json({ error: 'Solo il Super Operatore può modificare lo staff.' }, { status: 403 });
  }
  if (!staffId) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  // Non permettiamo di disattivare o retrocedere l'ULTIMO admin attivo
  // dell'Academy: significherebbe restare chiusi fuori dalla gestione.
  const wantsToRemoveAdminRights = (active === false) || (role === 'staff');
  if (wantsToRemoveAdminRights) {
    const { data: target } = await getSupabaseAdmin().from('staff').select('role').eq('id', staffId).single();
    if (target?.role === 'admin') {
      const { count } = await getSupabaseAdmin()
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('role', 'admin')
        .eq('active', true);
      if (count <= 1) {
        return Response.json({ error: 'Non puoi disattivare o retrocedere l\'unico Super Operatore rimasto. Promuovi prima qualcun altro.' }, { status: 400 });
      }
    }
  }

  const update = {};
  if (fullName) update.full_name = fullName;
  if (typeof active === 'boolean') update.active = active;
  if (role === 'admin' || role === 'staff') update.role = role;
  if (newPin) {
    if (!/^\d{4,6}$/.test(newPin)) {
      return Response.json({ error: 'Il PIN deve essere numerico, da 4 a 6 cifre.' }, { status: 400 });
    }
    const { data: existing } = await getSupabaseAdmin()
      .from('staff')
      .select('id, pin_hash')
      .eq('academy_id', academyId)
      .eq('active', true);
    const collision = (existing || []).some(s => s.id !== staffId && bcrypt.compareSync(newPin, s.pin_hash));
    if (collision) {
      return Response.json({ error: 'Questo PIN è già usato da un altro membro dello staff.' }, { status: 400 });
    }
    update.pin_hash = bcrypt.hashSync(newPin, 10);
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Nessuna modifica da salvare' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('staff').update(update).eq('id', staffId).eq('academy_id', academyId);

  if (error) {
    return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
