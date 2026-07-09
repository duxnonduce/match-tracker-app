export const RESULT_TYPES = [
  {key:'winner', label:'Winner'},
  {key:'errori_forzati', label:'Errori Forzati'},
  {key:'errori_non_forzati', label:'Errori Non Forzati'}
];

export const SUBFASI = [
  {key:'attacco', label:'Attacco'},
  {key:'manovra', label:'Manovra'},
  {key:'difesa', label:'Difesa'}
];

export const GROUPED_SHOTS = [
  {key:'diritto', label:'Diritto', color:'#59a6ff'},
  {key:'rovescio', label:'Rovescio', color:'#d16fe0'}
];

export const SIMPLE_SHOTS = [
  {key:'volee', label:'Volée', color:'#f0932b'},
  {key:'smash', label:'Smash', color:'#f1d430'},
  {key:'dropshot', label:'Drop Shot', color:'#3ecf6e'},
  {key:'back', label:'Back', color:'#5c7cfa'}
];

export const RISPOSTA_FASI = [
  {key:'prima', label:'1ª Palla'},
  {key:'seconda', label:'2ª Palla'}
];

export function emptyLeaf(){ return {allievo:0, avversario:0}; }

export function emptyResultSet(){
  const o = {};
  RESULT_TYPES.forEach(r => o[r.key] = emptyLeaf());
  return o;
}

export function initStats(){
  const s = {};
  GROUPED_SHOTS.forEach(g=>{
    s[g.key] = {};
    SUBFASI.forEach(f => s[g.key][f.key] = emptyResultSet());
  });
  SIMPLE_SHOTS.forEach(sh=>{ s[sh.key] = emptyResultSet(); });
  s.servizio = { ace: emptyLeaf(), doppio_fallo: emptyLeaf() };
  s.risposta = {};
  RISPOSTA_FASI.forEach(f => s.risposta[f.key] = emptyResultSet());
  return s;
}

export function otherPlayer(p){ return p === 'allievo' ? 'avversario' : 'allievo'; }

export function createMatchState(format){
  const ms = {
    format,
    matchOver:false, winner:null,
    setsWon:{allievo:0, avversario:0},
    completedSets:[],
    currentSetGames:{allievo:0, avversario:0},
    currentGamePoints:{allievo:0, avversario:0},
    inTiebreak:false,
    tiebreakPoints:{allievo:0, avversario:0},
    tiebreakTarget:null,
    _setConfig:null
  };
  if(format.matchType === 'tiebreakOnly'){
    ms.inTiebreak = true;
    ms.tiebreakTarget = format.tbPoints;
  } else {
    configureSet(ms);
  }
  return ms;
}

export function currentSetIndex(ms){ return ms.setsWon.allievo + ms.setsWon.avversario + 1; }

export function totalSetsInMatch(ms){ return ms.format.setsToWin * 2 - 1; }

export function isDecidingSetSlot(ms){
  if(ms.format.setsToWin === 1) return false;
  return currentSetIndex(ms) === totalSetsInMatch(ms);
}

export function configureSet(ms){
  const singleSetMatch = ms.format.setsToWin === 1;
  let tbEnabled, tbPoints, tiebreakDecidesMatch = false;
  if(!singleSetMatch && isDecidingSetSlot(ms) && (ms.format.finalSetRule === 'mtb10' || ms.format.finalSetRule === 'mtb7')){
    tiebreakDecidesMatch = true;
    tbEnabled = true;
    tbPoints = ms.format.finalSetRule === 'mtb10' ? 10 : 7;
  } else if(!singleSetMatch && isDecidingSetSlot(ms) && ms.format.finalSetRule === 'advantage'){
    tbEnabled = false; tbPoints = null;
  } else if(!singleSetMatch && isDecidingSetSlot(ms) && ms.format.finalSetRule === 'normal10'){
    tbEnabled = true; tbPoints = 10;
  } else {
    tbEnabled = ms.format.regularTB !== null && ms.format.regularTB !== undefined;
    tbPoints = ms.format.regularTB;
  }
  ms._setConfig = { tbEnabled, tbPoints, gamesTarget: ms.format.gamesPerSet, tiebreakDecidesMatch };
  if(tiebreakDecidesMatch){
    ms.inTiebreak = true;
    ms.tiebreakTarget = tbPoints;
    ms.tiebreakPoints = {allievo:0, avversario:0};
  }
}

export function scorePoint(ms, winner){
  if(!ms || ms.matchOver) return;
  if(ms.format.matchType === 'tiebreakOnly'){ scoreTiebreakOnly(ms, winner); return; }
  if(ms.inTiebreak){ scoreTiebreakPoint(ms, winner); }
  else { scoreGamePoint(ms, winner); }
}

export function scoreGamePoint(ms, winner){
  const pts = ms.currentGamePoints;
  pts[winner]++;
  const p = pts[winner], o = pts[otherPlayer(winner)];
  let gameWon = false;
  if(ms.format.deuce === 'noad'){ if(p >= 4 && p > o) gameWon = true; }
  else { if(p >= 4 && (p - o) >= 2) gameWon = true; }
  if(gameWon) winGame(ms, winner);
}

export function winGame(ms, winner){
  ms.currentGamePoints = {allievo:0, avversario:0};
  ms.currentSetGames[winner]++;
  const a = ms.currentSetGames.allievo, v = ms.currentSetGames.avversario;
  const target = ms._setConfig.gamesTarget;
  const lead = Math.abs(a - v);
  const leader = a > v ? 'allievo' : 'avversario';
  if(Math.max(a,v) >= target && lead >= 2){
    winSet(ms, leader, {allievo:a, avversario:v, tiebreak:null});
  } else if(ms._setConfig.tbEnabled && a === target && v === target){
    ms.inTiebreak = true;
    ms.tiebreakTarget = ms._setConfig.tbPoints;
    ms.tiebreakPoints = {allievo:0, avversario:0};
  }
}

export function scoreTiebreakPoint(ms, winner){
  const pts = ms.tiebreakPoints;
  pts[winner]++;
  const p = pts[winner], o = pts[otherPlayer(winner)];
  if(p >= ms.tiebreakTarget && (p - o) >= 2){
    let setScore;
    if(ms._setConfig.tiebreakDecidesMatch){
      setScore = {allievo:pts.allievo, avversario:pts.avversario, tiebreak:null, isMatchTiebreak:true};
    } else {
      ms.currentSetGames[winner] += 1;
      setScore = {allievo:ms.currentSetGames.allievo, avversario:ms.currentSetGames.avversario, tiebreak:{allievo:pts.allievo, avversario:pts.avversario}};
    }
    winSet(ms, winner, setScore);
  }
}

export function scoreTiebreakOnly(ms, winner){
  const pts = ms.tiebreakPoints;
  pts[winner]++;
  const p = pts[winner], o = pts[otherPlayer(winner)];
  if(p >= ms.format.tbPoints && (p - o) >= 2){
    ms.completedSets.push({allievo:pts.allievo, avversario:pts.avversario, isMatchTiebreak:true});
    endMatch(ms, winner);
  }
}

export function winSet(ms, winner, setScoreSnapshot){
  ms.completedSets.push(setScoreSnapshot);
  ms.setsWon[winner]++;
  ms.currentSetGames = {allievo:0, avversario:0};
  ms.currentGamePoints = {allievo:0, avversario:0};
  ms.inTiebreak = false;
  ms.tiebreakPoints = {allievo:0, avversario:0};
  if(ms.setsWon[winner] >= ms.format.setsToWin){
    endMatch(ms, winner);
  } else {
    configureSet(ms);
  }
}

export function endMatch(ms, winner){
  ms.matchOver = true;
  ms.winner = winner;
}

export function gamePointLabel(a, b){
  const L = ['0','15','30','40'];
  if(a < 3 || b < 3) return [L[Math.min(a,3)], L[Math.min(b,3)]];
  if(a === b) return ['40','40'];
  if(a - b === 1) return ['Ad','40'];
  if(b - a === 1) return ['40','Ad'];
  return [String(a), String(b)];
}

export const PRESETS = [
  // 2 set su 3 - set normali
  {id:'p01', group:'2 set su 3 (set normali)', label:'2 set su 3 con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'normal7'}, note:'Set normali a 6 game, tie-break a 7 sul 6-6, vantaggi nei game.'},
  {id:'p02', group:'2 set su 3 (set normali)', label:'2 set su 3 no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'normal7'}, note:'Come sopra, ma punto secco sul 40-40.'},
  {id:'p03', group:'2 set su 3 (set normali)', label:'2 su 3 con vantaggi, 3° set advantage', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'advantage'}, note:'Il 3° set non ha tie-break: si vince con 2 game di vantaggio.'},
  {id:'p04', group:'2 set su 3 (set normali)', label:'2 su 3 no-ad, 3° set advantage', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'advantage'}, note:'3° set senza tie-break, punto secco nei game.'},
  {id:'p05', group:'2 set su 3 (set normali)', label:'2 su 3 con vantaggi, tie-break a 10 sul 6-6 del 3° set', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'normal10'}, note:'3° set normale, ma se arriva 6-6 si gioca un tie-break a 10.'},
  {id:'p06', group:'2 set su 3 (set normali)', label:'2 su 3 no-ad, tie-break a 10 sul 6-6 del 3° set', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'normal10'}, note:'Come sopra, punto secco sul 40-40.'},

  // match tie-break al posto del 3° set
  {id:'p07', group:'2 set su 3 — match tie-break al posto del 3° set', label:'Match tie-break a 10 al posto del 3° set, con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'mtb10'}, note:'Sull\'1 set pari, invece del 3° set si gioca subito un tie-break a 10.'},
  {id:'p08', group:'2 set su 3 — match tie-break al posto del 3° set', label:'Match tie-break a 10 al posto del 3° set, no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'mtb10'}, note:'Come sopra, con punto secco nei primi due set.'},
  {id:'p09', group:'2 set su 3 — match tie-break al posto del 3° set', label:'Match tie-break a 7 al posto del 3° set, con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'mtb7'}, note:'Sull\'1 set pari si gioca un tie-break a 7 al posto del 3° set.'},
  {id:'p10', group:'2 set su 3 — match tie-break al posto del 3° set', label:'Match tie-break a 7 al posto del 3° set, no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'mtb7'}, note:'Come sopra, punto secco nei primi due set.'},

  // 3 set su 5
  {id:'p11', group:'3 set su 5', label:'3 set su 5 con vantaggi', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'normal7'}, note:'Vince chi arriva a 3 set; tie-break a 7 sul 6-6 in ogni set.'},
  {id:'p12', group:'3 set su 5', label:'3 set su 5 no-ad', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'normal7'}, note:'Come sopra, punto secco sul 40-40.'},
  {id:'p13', group:'3 set su 5', label:'3 su 5 con vantaggi, 5° set advantage', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'advantage'}, note:'Il 5° set non ha tie-break: si continua a oltranza con 2 game di vantaggio.'},
  {id:'p14', group:'3 set su 5', label:'3 su 5 no-ad, 5° set advantage', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'advantage'}, note:'5° set senza tie-break, punto secco negli altri set.'},
  {id:'p15', group:'3 set su 5', label:'3 su 5 con vantaggi, tie-break a 10 sul 6-6 del 5° set', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'normal10'}, note:'5° set normale, ma sul 6-6 si gioca un tie-break a 10.'},
  {id:'p16', group:'3 set su 5', label:'3 su 5 no-ad, tie-break a 10 sul 6-6 del 5° set', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'normal10'}, note:'Come sopra, punto secco sul 40-40.'},

  // match tie-break al posto del 5° set
  {id:'p17', group:'3 set su 5 — match tie-break al posto del 5° set', label:'Match tie-break a 10 al posto del 5° set, con vantaggi', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'mtb10'}, note:'Sul 2 set pari, invece del 5° set si gioca un tie-break a 10.'},
  {id:'p18', group:'3 set su 5 — match tie-break al posto del 5° set', label:'Match tie-break a 10 al posto del 5° set, no-ad', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'mtb10'}, note:'Come sopra, punto secco negli altri set.'},
  {id:'p19', group:'3 set su 5 — match tie-break al posto del 5° set', label:'Match tie-break a 7 al posto del 5° set, con vantaggi', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:'mtb7'}, note:'Sul 2 set pari si gioca un tie-break a 7 al posto del 5° set.'},
  {id:'p20', group:'3 set su 5 — match tie-break al posto del 5° set', label:'Match tie-break a 7 al posto del 5° set, no-ad', format:{matchType:'sets',setsToWin:3,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:'mtb7'}, note:'Come sopra, punto secco negli altri set.'},

  // short set
  {id:'p21', group:'Short set', label:'2 su 3 short set con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'ad',regularTB:7,finalSetRule:'normal7'}, note:'Set corti a 4 game, tie-break a 7 sul 4-4, vantaggi nei game.'},
  {id:'p22', group:'Short set', label:'2 su 3 short set no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'noad',regularTB:7,finalSetRule:'normal7'}, note:'Set corti a 4 game, punto secco sul 40-40.'},
  {id:'p23', group:'Short set', label:'2 su 3 short set + match tie-break a 10 al 3° set, con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'ad',regularTB:7,finalSetRule:'mtb10'}, note:'Primi due set corti; sull\'1 pari, tie-break a 10 al posto del 3°.'},
  {id:'p24', group:'Short set', label:'2 su 3 short set + match tie-break a 10 al 3° set, no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'noad',regularTB:7,finalSetRule:'mtb10'}, note:'Come sopra, punto secco nei set corti.'},
  {id:'p25', group:'Short set', label:'2 su 3 short set + match tie-break a 7 al 3° set, con vantaggi', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'ad',regularTB:7,finalSetRule:'mtb7'}, note:'Primi due set corti; sull\'1 pari, tie-break a 7 al posto del 3°.'},
  {id:'p26', group:'Short set', label:'2 su 3 short set + match tie-break a 7 al 3° set, no-ad', format:{matchType:'sets',setsToWin:2,gamesPerSet:4,deuce:'noad',regularTB:7,finalSetRule:'mtb7'}, note:'Come sopra, punto secco nei set corti.'},
  {id:'p27', group:'Short set', label:'Short set con tie-break a 5 punti, con vantaggi', format:{matchType:'sets',setsToWin:1,gamesPerSet:4,deuce:'ad',regularTB:5,finalSetRule:null}, note:'Un solo set corto a 4 game; sul 4-4 tie-break ridotto a 5 punti.'},
  {id:'p28', group:'Short set', label:'Short set con tie-break a 5 punti, no-ad', format:{matchType:'sets',setsToWin:1,gamesPerSet:4,deuce:'noad',regularTB:5,finalSetRule:null}, note:'Come sopra, con punto secco sul 40-40: il formato più rapido.'},

  // set unico
  {id:'p29', group:'Set unico', label:'Set unico a 6 game con vantaggi', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'ad',regularTB:null,finalSetRule:null}, note:'Un solo set normale, senza tie-break: si vince con 2 game di vantaggio.'},
  {id:'p30', group:'Set unico', label:'Set unico a 6 game no-ad', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'noad',regularTB:null,finalSetRule:null}, note:'Un solo set, senza tie-break, punto secco sul 40-40.'},
  {id:'p31', group:'Set unico', label:'Set unico con tie-break a 7 sul 6-6, con vantaggi', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'ad',regularTB:7,finalSetRule:null}, note:'Set singolo classico con tie-break a 7 sul 6-6.'},
  {id:'p32', group:'Set unico', label:'Set unico con tie-break a 7 sul 6-6, no-ad', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'noad',regularTB:7,finalSetRule:null}, note:'Come sopra, punto secco sul 40-40.'},
  {id:'p33', group:'Set unico', label:'Set unico con tie-break a 10 sul 6-6, con vantaggi', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'ad',regularTB:10,finalSetRule:null}, note:'Set singolo con tie-break lungo a 10 sul 6-6.'},
  {id:'p34', group:'Set unico', label:'Set unico con tie-break a 10 sul 6-6, no-ad', format:{matchType:'sets',setsToWin:1,gamesPerSet:6,deuce:'noad',regularTB:10,finalSetRule:null}, note:'Come sopra, punto secco sul 40-40.'},
  {id:'p35', group:'Set unico', label:'Short set unico con vantaggi', format:{matchType:'sets',setsToWin:1,gamesPerSet:4,deuce:'ad',regularTB:7,finalSetRule:null}, note:'Un solo set corto a 4 game, tie-break a 7 sul 4-4.'},
  {id:'p36', group:'Set unico', label:'Short set unico no-ad', format:{matchType:'sets',setsToWin:1,gamesPerSet:4,deuce:'noad',regularTB:7,finalSetRule:null}, note:'Un solo set corto, punto secco sul 40-40.'},

  // solo tie-break
  {id:'p37', group:'Solo tie-break', label:'Tie-break secco a 7', format:{matchType:'tiebreakOnly',tbPoints:7}, note:'Si gioca solo un tie-break: vince chi arriva a 7 con 2 punti di vantaggio.'},
  {id:'p38', group:'Solo tie-break', label:'Tie-break secco a 10', format:{matchType:'tiebreakOnly',tbPoints:10}, note:'Si gioca solo un match tie-break a 10 punti, vantaggio di 2.'},
  {id:'p39', group:'Solo tie-break', label:'Tie-break secco a 5', format:{matchType:'tiebreakOnly',tbPoints:5}, note:'Versione lampo: vince chi arriva a 5 punti con 2 di vantaggio.'},
];

export function getPath(obj, path){
  let cur = obj;
  for(const p of path){ cur = cur[p]; }
  return cur;
}
/**
 * Ricostruisce da zero statistiche e stato del punteggio a partire dal
 * formato del match e dalla lista di episodi (log). Serve per applicare
 * in modo coerente la modifica o la cancellazione di UN episodio passato:
 * non basta cambiare quella riga, bisogna far "ripartire" il punteggio
 * da lì in poi esattamente come farebbe il tracker dal vivo.
 */
export function rebuildMatchFromLog(format, log) {
  const stats = initStats();
  const ms = createMatchState(JSON.parse(JSON.stringify(format)));
  const newLog = [];
  for (const entry of log) {
    const path = entry.path;
    const player = entry.player;
    const leaf = getPath(stats, path);
    leaf[player] += 1;
    const resultKey = path[path.length - 1];
    const pointWinner = (resultKey === 'winner' || resultKey === 'ace') ? player : otherPlayer(player);
    const msBefore = JSON.parse(JSON.stringify(ms));
    const setNumber = currentSetIndex(ms);
    const gameNumber = ms.currentSetGames.allievo + ms.currentSetGames.avversario + 1;
    scorePoint(ms, pointWinner);
    newLog.push({ path: path.slice(), player, ts: entry.ts, pointWinner, set: setNumber, game: gameNumber, msBefore });
  }
  return { stats, match: ms, log: newLog };
}

const SHOT_LABEL_LOOKUP = {
  diritto: 'Diritto', rovescio: 'Rovescio', volee: 'Volée', smash: 'Smash',
  dropshot: 'Drop Shot', back: 'Back',
};
const SUBFASE_LABEL_LOOKUP = { attacco: 'Attacco', manovra: 'Manovra', difesa: 'Difesa' };
const RESULT_LABEL_LOOKUP = { winner: 'Winner', errori_forzati: 'Errore Forzato', errori_non_forzati: 'Errore Non Forzato' };
const RISPOSTA_LABEL_LOOKUP = { prima: '1ª Palla', seconda: '2ª Palla' };

/**
 * Trasforma un path tipo ['diritto','attacco','winner'] in una descrizione
 * leggibile: "Diritto · Attacco · Winner". Copre tutte le sezioni della
 * scheda (colpi con fase, colpi semplici, servizio, risposta).
 */
export function pathToLabel(path) {
  const [a, b, c] = path;
  if (a === 'servizio') {
    return b === 'ace' ? 'Servizio · Ace' : 'Servizio · Doppio Fallo';
  }
  if (a === 'risposta') {
    return `Risposta · ${RISPOSTA_LABEL_LOOKUP[b] || b} · ${RESULT_LABEL_LOOKUP[c] || c}`;
  }
  if (a === 'diritto' || a === 'rovescio') {
    return `${SHOT_LABEL_LOOKUP[a]} · ${SUBFASE_LABEL_LOOKUP[b] || b} · ${RESULT_LABEL_LOOKUP[c] || c}`;
  }
  return `${SHOT_LABEL_LOOKUP[a] || a} · ${RESULT_LABEL_LOOKUP[b] || b}`;
}

/** Ritorna un net {allievo, avversario} per un blocco {winner, errori_forzati, errori_non_forzati}. */
function netOf(rs) {
  return {
    allievo: rs.winner.allievo - (rs.errori_forzati.allievo + rs.errori_non_forzati.allievo),
    avversario: rs.winner.avversario - (rs.errori_forzati.avversario + rs.errori_non_forzati.avversario),
  };
}

/**
 * Aggrega le statistiche di più partite (l'array dei valori della colonna
 * "stats" salvata per ciascuna partita) per capire, nel tempo, quale colpo
 * rende di più e quale di meno per l'allievo (net = winner - errori).
 * Usato per lo storico progressi nella scheda allievo.
 */
export function aggregateShotPerformance(statsList) {
  const categories = [
    ...GROUPED_SHOTS.map(g => g.key),
    ...SIMPLE_SHOTS.map(s => s.key),
  ];
  const totals = {};
  categories.forEach(key => { totals[key] = 0; });

  for (const stats of statsList) {
    if (!stats) continue;
    GROUPED_SHOTS.forEach(g => {
      SUBFASI.forEach(f => {
        const block = stats[g.key]?.[f.key];
        if (block) totals[g.key] += netOf(block).allievo;
      });
    });
    SIMPLE_SHOTS.forEach(s => {
      const block = stats[s.key];
      if (block) totals[s.key] += netOf(block).allievo;
    });
  }

  const labelOf = { diritto: 'Diritto', rovescio: 'Rovescio', volee: 'Volée', smash: 'Smash', dropshot: 'Drop Shot', back: 'Back' };
  const entries = categories.map(key => ({ key, label: labelOf[key], net: totals[key] }));
  entries.sort((a, b) => b.net - a.net);
  return { entries, best: entries[0], worst: entries[entries.length - 1] };
}

/** Ricostruisce il path a partire dalle scelte fatte nel form di modifica. */
export function buildPath({ category, subfase, result }) {
  if (category === 'servizio') return ['servizio', result]; // result = 'ace' | 'doppio_fallo'
  if (category === 'risposta_prima') return ['risposta', 'prima', result];
  if (category === 'risposta_seconda') return ['risposta', 'seconda', result];
  if (category === 'diritto' || category === 'rovescio') return [category, subfase, result];
  return [category, result]; // volee, smash, dropshot, back
}

/* ============================================================
   SERVIZIO — chi serve, rotazione, break point
   Aggiunto per calcolare ace%, prima in campo, punti vinti con la
   prima/seconda, break point salvati/convertiti — senza dover ripetere
   la logica altrove: tutto si deriva dai tag salvati su ogni punto.
============================================================ */

/** Quanti game sono già stati completati in tutta la partita (set precedenti + set corrente). */
export function getTotalGamesPlayed(ms) {
  const fromCompletedSets = ms.completedSets.reduce((sum, s) => {
    if (s.isMatchTiebreak) return sum; // un match-tiebreak non è un "game" nella rotazione
    return sum + s.allievo + s.avversario;
  }, 0);
  return fromCompletedSets + ms.currentSetGames.allievo + ms.currentSetGames.avversario;
}

/**
 * Chi sta servendo ADESSO, dato chi ha servito per primo nella partita.
 * Nei game normali il servizio alterna ogni game. Nel tie-break, il primo
 * a servire fa 1 solo punto, poi si alterna ogni 2 punti.
 */
export function getCurrentServer(ms, firstServer) {
  const other = otherPlayer(firstServer);
  if (ms.inTiebreak) {
    // chi avrebbe servito il prossimo game "naturale" apre il tie-break
    const tbFirstServer = (getTotalGamesPlayed(ms) % 2 === 0) ? firstServer : other;
    const pointIndex = ms.tiebreakPoints.allievo + ms.tiebreakPoints.avversario + 1; // 1-based, il punto che sta per essere giocato
    if (pointIndex === 1) return tbFirstServer;
    const pairIndex = Math.floor((pointIndex - 2) / 2);
    return (pairIndex % 2 === 0) ? otherPlayer(tbFirstServer) : tbFirstServer;
  }
  const gamesPlayed = getTotalGamesPlayed(ms);
  return (gamesPlayed % 2 === 0) ? firstServer : other;
}

/** Il punto che sta per essere giocato farebbe vincere il game a chi lo riceve, se lo vince lui? */
export function wouldWinGame(myPoints, oppPoints, deuceRule) {
  const p = myPoints + 1;
  if (deuceRule === 'noad') return p >= 4 && p > oppPoints;
  return p >= 4 && (p - oppPoints) >= 2;
}

function pct(num, den) { return den > 0 ? Math.round(100 * num / den) : null; }

/**
 * Aggrega dal log (già taggato per ogni punto con server/serveNumber/
 * wasBreakPoint/breakPointResult) tutte le statistiche derivate sul
 * servizio. Ignora silenziosamente le partite/punti registrati prima di
 * questa funzionalità (che non hanno questi tag).
 */
export function computeServeStats(log) {
  const blank = () => ({
    servicePoints: 0, firstIn: 0, wonOnFirst: 0, secondPlayed: 0, wonOnSecond: 0,
    bpFaced: 0, bpSaved: 0, bpConverted: 0,
  });
  const s = { allievo: blank(), avversario: blank() };
  let taggedPoints = 0;

  for (const e of log) {
    if (!e.server || !e.serveNumber) continue;
    taggedPoints++;
    const server = e.server;
    const won = e.pointWinner === server;
    s[server].servicePoints++;
    if (e.serveNumber === 1) {
      s[server].firstIn++;
      if (won) s[server].wonOnFirst++;
    } else {
      s[server].secondPlayed++;
      if (won) s[server].wonOnSecond++;
    }
    if (e.wasBreakPoint) {
      s[server].bpFaced++;
      if (e.breakPointResult === 'saved') s[server].bpSaved++;
      else if (e.breakPointResult === 'converted') s[otherPlayer(server)].bpConverted++;
    }
  }

  if (taggedPoints === 0) return null;

  for (const p of ['allievo', 'avversario']) {
    const d = s[p];
    d.firstInPct = pct(d.firstIn, d.servicePoints);
    d.wonOnFirstPct = pct(d.wonOnFirst, d.firstIn);
    d.wonOnSecondPct = pct(d.wonOnSecond, d.secondPlayed);
    d.bpSavedPct = pct(d.bpSaved, d.bpFaced);
  }
  return s;
}
