// ==========================================================================
// mejorar_datos.js - Post-procesador de cpc_data.json y cpo_data.json
// Corrige: dificultad (inferida de comentarios), sujetos CPO ruidosos,
// duplicados y horarios invalidos. Se ejecuta con: node mejorar_datos.js
// ==========================================================================
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const readJson = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
const writeJson = (f, d) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(d, null, 2) + '\n', 'utf8');

const stripAccents = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function titleCase(s) {
    const small = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'en', 'a', 'para', 'por', 'con', 'su', 'al', 'e', 'o', 'u', 'i', 'l']);
    return s.split(' ').map(w => {
        if (!w) return w;
        if (small.has(w.toLowerCase())) return w.toLowerCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ').trim().replace(/\s+(con|de|del|a|y|el|la|los|las|o|u|e)\s*$/, '');
}

// Tokens genericos -> nombre real, o null para descartar (fallbacks de hoja)
const GENERIC_MAP = {
    'CPO': null,
    'PUBLICO': null,
    'PENAL ARRANCA EN MARZO': null,
    'PENAL ARRANCA EL AGOSTO': null,
    'CONTRATOS ARRANCA EN MARZO': null,
    'CONTRATOS ARRANCA EN AGOSTO': null,
    'PRACTICO': 'Practica Profesional',
    'TRADU': 'Traductorado',
    'INGLES': 'Ingles',
    'LECTO': 'Lectocomprension',
    'CONCURSOS': 'Concursos y Quiebras',
    'METODOS': 'Metodos Alternativos para el Abordaje de Conflictos',
    'FILO': 'Filosofia del Derecho',
    'FILOSOFIA': 'Filosofia del Derecho',
    'SOCIALES': 'Ciencias Sociales',
    'NOTARIAL': 'Orientacion Notarial',
    'INTEGRACION': 'Derecho de la Integracion',
    'INTEGRACIÓN': 'Derecho de la Integracion'
};

function cleanSubject(subject) {
    let s = (subject || '').toString().trim();
    // Quitar codigo inicial: "308 (ECN) - CONCURSOS" / "66U (PUB) - ..." / "7X2 (PRC) - ..."
    s = s.replace(/^\s*\w{1,4}\s*(?:\([A-Za-zÁÉÍÓÚÑ]{2,4}\))?\s*[-–—]\s*/, '');
    // Quitar sufijos de area tipo " _INTDP" / " _ÁREA CON"
    s = s.replace(/\s+_[A-Za-zÁÉÍÓÚÑ]+/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    if (!s) return '';

    const key = stripAccents(s).toUpperCase();
    if (GENERIC_MAP.hasOwnProperty(key)) {
        const mapped = GENERIC_MAP[key];
        if (!mapped) return ''; // descartar
        return mapped;
    }
    return titleCase(s);
}

const HARD_KEYWORDS = [
    'dificil', 'difícil', 'muy exigente', 'exigente', 'calvario', 'no se recomienda',
    'bochan', 'desaprueban', 'dificultad alta', 'se dan de baja', 'te bochan',
    'bajo nivel de aprobacion', 'pocos aprueban', 'es un infierno', 'pesada',
    'muy estricto', 'muy estricta', 'casi nadie', 'muy complicada', 'abandonan',
    'no promociona', 'imposible promocionar', 'muy dificil', 'super dificil', 'te grita'
];

const EASY_KEYWORDS = [
    'facil', 'fácil', 'muy facil', 'accesible', 'llevadera', 'tranquila',
    'promocionable', 'muy promocionable', 'no toma parciales', 'sin parciales',
    'multiple choice', 'choice', 'no exige', 'poco exigente', 'no bocha',
    'sin animos de bochar', 'sin ánimos de bochar', 'buena predisposicion',
    'aprobacion alta', 'la mayoria aprueba', 'sencilla', 'es facil',
    'te deja promocionar', 'parciales faciles', 'super promocionable', 'tasa de aprobados alta'
];

function inferDifficulty(comments) {
    if (!comments || comments.length === 0) return 'Media';
    const text = stripAccents(comments.map(c => c.text || '').join(' ').toLowerCase());
    let hard = 0, easy = 0;
    HARD_KEYWORDS.forEach(kw => { if (text.includes(stripAccents(kw))) hard++; });
    EASY_KEYWORDS.forEach(kw => { if (text.includes(stripAccents(kw))) easy++; });
    if (hard > easy) return 'Alta';
    if (easy > hard) return 'Baja';
    return 'Media';
}

function normalizeTime(t) {
    if (!t) return null;
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 0 || h > 23 || min > 59) return null;
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

function parseTimesFromSchedule(schedule) {
    if (!schedule) return null;
    const re = /(?<!\d)((?:[01]?\d|2[0-3])(?::[0-5]\d|[.]\d{2})?)(?!\d)/g;
    const times = [];
    let m;
    while ((m = re.exec(schedule)) !== null) {
        let t = m[1].replace('.', ':');
        if (!t.includes(':')) t = t + ':00';
        const [h, mi] = t.split(':');
        times.push(String(parseInt(h, 10)).padStart(2, '0') + ':' + String(parseInt(mi, 10)).padStart(2, '0'));
    }
    if (times.length >= 2) return { time_start: times[0], time_end: times[1] };
    if (times.length === 1) {
        const [h, mi] = times[0].split(':');
        let eh = parseInt(h, 10) + 1, em = parseInt(mi, 10) + 30;
        if (em >= 60) { eh += 1; em -= 60; }
        if (eh > 23) eh = 23;
        return { time_start: times[0], time_end: String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0') };
    }
    return null;
}

function fixTimes(rec) {
    const hasValidStart = /^\d{2}:\d{2}$/.test(rec.time_start || '');
    const hasValidEnd = /^\d{2}:\d{2}$/.test(rec.time_end || '');
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const isSane = hasValidStart && hasValidEnd && toMin(rec.time_start) < toMin(rec.time_end);
    if (isSane) {
        rec.time_start = normalizeTime(rec.time_start);
        rec.time_end = normalizeTime(rec.time_end);
        return;
    }
    const parsed = parseTimesFromSchedule(rec.schedule);
    if (parsed) {
        rec.time_start = parsed.time_start;
        rec.time_end = parsed.time_end;
    } else {
        rec.time_start = null;
        rec.time_end = null;
    }
}

function processFile(filename, opts) {
    const data = readJson(filename);
    const before = data.length;

    // 1. Limpieza de sujetos + dificultad + horarios
    const cleaned = [];
    let droppedGeneric = 0;
    for (const rec of data) {
        let subject = opts.cleanSubjects ? cleanSubject(rec.subject) : (rec.subject || '').toString().trim();
        if (!subject) {
            droppedGeneric++;
            continue;
        }
        const fixed = { ...rec, subject };
        if (opts.fixDifficulty && (!fixed.difficulty || fixed.difficulty === 'Media')) {
            fixed.difficulty = inferDifficulty(fixed.comments);
        }
        if (opts.fixTimes) fixTimes(fixed);
        cleaned.push(fixed);
    }

    // 2. Deduplicacion por (sujeto normalizado, comision)
    const merged = new Map();
    for (const rec of cleaned) {
        const key = stripAccents(rec.subject).toLowerCase() + '|' + rec.commission;
        if (!merged.has(key)) {
            merged.set(key, { ...rec, sources: [...(rec.sources || [])], comments: rec.comments ? rec.comments.map(c => ({ ...c })) : [] });
            continue;
        }
        const ex = merged.get(key);
        (rec.sources || []).forEach(s => { if (!ex.sources.includes(s)) ex.sources.push(s); });
        (rec.comments || []).forEach(c => {
            if (!ex.comments.some(ec => ec.text === c.text)) ex.comments.push({ ...c });
        });
        if (ex.is_pro_student === false && rec.is_pro_student) ex.is_pro_student = true;
        if (ex.difficulty === 'Media' && rec.difficulty !== 'Media') ex.difficulty = rec.difficulty;
        if (!ex.professor || ex.professor === 'A designar') ex.professor = rec.professor;
    }

    const result = Array.from(merged.values());
    writeJson(filename, result);
    console.log(`${filename}: ${before} -> ${result.length} (descartados genericos: ${droppedGeneric}, dedup: ${before - result.length - droppedGeneric})`);
    return result;
}

const cpc = processFile('cpc_data.json', { cleanSubjects: false, fixDifficulty: true, fixTimes: true });
const cpo = processFile('cpo_data.json', { cleanSubjects: true, fixDifficulty: true, fixTimes: true });

const diffDist = arr => {
    const d = {};
    arr.forEach(x => d[x.difficulty] = (d[x.difficulty] || 0) + 1);
    return JSON.stringify(d);
};
console.log('CPC dificultad:', diffDist(cpc));
console.log('CPO dificultad:', diffDist(cpo));
console.log('CPO sujetos distintos:', new Set(cpo.map(x => stripAccents(x.subject).toLowerCase())).size);
