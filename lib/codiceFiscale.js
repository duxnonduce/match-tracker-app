// Validatore del Codice Fiscale italiano — algoritmo ufficiale completo
// (formato + carattere di controllo + coerenza con nome/cognome/data di nascita).
// NB: non validiamo la parte "luogo di nascita" (richiederebbe l'elenco
// ufficiale dei ~8000 codici catastali dei comuni), ma tutto il resto sì.

const MONTH_CODES = { 1:'A', 2:'B', 3:'C', 4:'D', 5:'E', 6:'H', 7:'L', 8:'M', 9:'P', 10:'R', 11:'S', 12:'T' };

const ODD_VALUES = { // posizioni dispari (1ª, 3ª, 5ª... carattere)
  '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
  A:1,B:0,C:5,D:7,E:9,F:13,G:15,H:17,I:19,J:21,K:2,L:4,M:18,N:20,O:11,P:3,Q:6,R:8,S:12,T:14,U:16,V:10,W:22,X:25,Y:24,Z:23
};
const EVEN_VALUES = { // posizioni pari (2ª, 4ª, 6ª... carattere)
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
  A:0,B:1,C:2,D:3,E:4,F:5,G:6,H:7,I:8,J:9,K:10,L:11,M:12,N:13,O:14,P:15,Q:16,R:17,S:18,T:19,U:20,V:21,W:22,X:23,Y:24,Z:25
};
const REMAINDER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function stripToLetters(str) {
  return (str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
}
function consonants(str) { return str.match(/[BCDFGHJKLMNPQRSTVWXYZ]/g) || []; }
function vowels(str) { return str.match(/[AEIOU]/g) || []; }

function surnameCode(surname) {
  const s = stripToLetters(surname);
  const code = consonants(s).join('') + vowels(s).join('') + 'XXX';
  return code.slice(0, 3);
}
function nameCode(name) {
  const s = stripToLetters(name);
  const cons = consonants(s);
  let code;
  if (cons.length >= 4) code = cons[0] + cons[2] + cons[3];
  else code = (cons.join('') + vowels(s).join('') + 'XXX').slice(0, 3);
  return code;
}
function checksumChar(cf15) {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = cf15[i];
    sum += (i % 2 === 0) ? ODD_VALUES[c] : EVEN_VALUES[c]; // posizione 1 = indice 0 (dispari)
  }
  return REMAINDER_LETTERS[sum % 26];
}

/**
 * Valida un codice fiscale confrontandolo con nome, cognome e data di nascita forniti.
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateCodiceFiscale(cfRaw, { firstName, lastName, birthDate }) {
  const errors = [];
  const cf = (cfRaw || '').toUpperCase().trim();

  if (!/^[A-Z]{6}[0-9]{2}[A-EHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf)) {
    return { valid: false, errors: ['Formato non valido: deve essere di 16 caratteri (es. RSSMRA85M01H501Z).'] };
  }

  if (checksumChar(cf.slice(0, 15)) !== cf[15]) {
    errors.push('Il carattere di controllo finale non corrisponde: probabile errore di battitura.');
  }

  if (lastName) {
    const expected = surnameCode(lastName);
    if (cf.slice(0, 3) !== expected) errors.push(`Le prime 3 lettere (${cf.slice(0,3)}) non corrispondono al cognome inserito (atteso ${expected}).`);
  }
  if (firstName) {
    const expected = nameCode(firstName);
    if (cf.slice(3, 6) !== expected) errors.push(`Le lettere 4-6 (${cf.slice(3,6)}) non corrispondono al nome inserito (atteso ${expected}).`);
  }

  if (birthDate) {
    const d = new Date(birthDate + 'T00:00:00');
    if (!isNaN(d)) {
      const expectedYear = String(d.getFullYear()).slice(-2);
      const expectedMonth = MONTH_CODES[d.getMonth() + 1];
      const day = d.getDate();
      const cfYear = cf.slice(6, 8);
      const cfMonth = cf[8];
      const cfDay = parseInt(cf.slice(9, 11), 10);

      if (cfYear !== expectedYear) errors.push(`L'anno nel codice (${cfYear}) non corrisponde alla data di nascita inserita.`);
      if (cfMonth !== expectedMonth) errors.push(`Il mese nel codice (${cfMonth}) non corrisponde alla data di nascita inserita.`);
      // il giorno è codificato +40 per le donne: accettiamo entrambe le varianti
      if (cfDay !== day && cfDay !== day + 40) errors.push(`Il giorno nel codice (${cf.slice(9,11)}) non corrisponde alla data di nascita inserita.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
