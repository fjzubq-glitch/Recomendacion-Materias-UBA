import os
import re
import json
import urllib.request
import shutil
import pandas as pd

# Define directories
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
CPC_DIR = os.path.join(WORKSPACE_DIR, "Recomendaciones CPC")
CPO_DIR = os.path.join(WORKSPACE_DIR, "Recomendaciones CPO")
TEMP_DIR = os.path.join(WORKSPACE_DIR, "temp_downloads")

# Ensure directories exist
os.makedirs(CPC_DIR, exist_ok=True)
os.makedirs(CPO_DIR, exist_ok=True)

# Google Sheets IDs & URLs
SHEET_RESOURCES = [
    {"name": "La Campora CPC", "id": "1reYA9Y4UwJDRLKE21TKkbKWJditcxAr0", "dest_dir": CPC_DIR},
    {"name": "La Campora CPO", "id": "1ITaX9NYIEONrQ90Iw5v3dEehPm0MEp4Wi_83-38Xkf8", "dest_dir": CPO_DIR},
    {"name": "Nexo CPC", "id": "1rieoJRgJdGU4cv2YmdLpF74o3Uo9i5IQnn_0EigsKKA", "dest_dir": CPC_DIR},
    {"name": "Nexo CPO", "id": "1is5EcMteZ6mEWekkKVGqwotyaPtYOp86ikveshTmYhs", "dest_dir": CPO_DIR},
    {"name": "Recomellas CPC", "id": "1h2FzuceIkrnV8tuJgNiU_3H0kxcr4olK", "dest_dir": CPC_DIR},
    {"name": "Recomellas CPO", "id": "1Zo_9DZlSSvVJ-U_0JyIG5wYHUBfjYRO-", "dest_dir": CPO_DIR},
    {"name": "Nuevo Derecho CPC", "id": "13FlbgduPyDrkNAhcMMmg5bGa8jw0EY3Ps1qIpZFcQYc", "dest_dir": CPC_DIR},
    {"name": "Franja Morada CPC", "id": "1U5jmNt22Mr_y0KFdB9Dp1FYLNky-iyjAxYF_4DyvThQ", "dest_dir": CPC_DIR}
]

# Google Drive folder with La Centeno PDFs
CENTENO_DRIVE_FOLDER = "https://drive.google.com/drive/folders/1gFGp3XTpPTtr06AsxAeIen0V5Vpj3vto"

SUBJECT_MAP_CPC = {
    'TGD': 'Teoría General del Derecho',
    'TDE': 'Teoría del Estado',
    'T. ESTADO': 'Teoría del Estado',
    'T. DEL ESTADO': 'Teoría del Estado',
    'CIVIL': 'Elementos de Derecho Civil',
    'DDHH': 'Derechos Humanos y Garantías',
    'ANÁLISIS': 'Elementos de Análisis Económico y Financiero',
    'ANÁLISIS ': 'Elementos de Análisis Económico y Financiero',
    'CONSTITUCIONAL': 'Elementos de Derecho Constitucional',
    'CONSTITUCIONAL ': 'Elementos de Derecho Constitucional',
    'OBLIGACIONES': 'Obligaciones Civiles y Comerciales',
    'OBLIGACIONES ': 'Obligaciones Civiles y Comerciales',
    'REALES': 'Elementos de Derechos Reales',
    'COMERCIAL': 'Elementos de Derecho Comercial',
    'COMERCIAL ': 'Elementos de Derecho Comercial',
    'PROCESAL': 'Elementos de Derecho Procesal Civil y Comercial',
    'PROCESAL CIVIL': 'Elementos de Derecho Procesal Civil y Comercial',
    'PENAL': 'Elementos de Derecho Penal y Procesal Penal',
    'PENAL arranca en MARZO': 'Elementos de Derecho Penal y Procesal Penal',
    'PENAL arranca el AGOSTO': 'Elementos de Derecho Penal y Procesal Penal',
    'PENAL 1°C': 'Elementos de Derecho Penal y Procesal Penal',
    'PENAL 2°C': 'Elementos de Derecho Penal y Procesal Penal',
    'CONTRATOS': 'Contratos Civiles y Comerciales',
    'CONTRATOS arranca en MARZO': 'Contratos Civiles y Comerciales',
    'CONTRATOS arranca en AGOSTO': 'Contratos Civiles y Comerciales',
    'CONTRATOS 1°C': 'Contratos Civiles y Comerciales',
    'CONTRATOS 2°C': 'Contratos Civiles y Comerciales',
    'ADMINISTRATIVO': 'Derecho Administrativo',
    'ADMINISTRATIVO ': 'Derecho Administrativo',
    'LABORAL': 'Derecho del Trabajo y de la Seguridad Social',
    'SOCIEDADES': 'Derecho Comercial (Sociedades)',
    'TRIBUTARIO': 'Derecho Tributario y Finanzas Públicas',
    'FAMILIA': 'Derecho de Familia y Sucesiones',
    'DIP': 'Derecho Internacional Público',
    'INT. PÚBLICO': 'Derecho Internacional Público',
    'INT. PÚBLICO ': 'Derecho Internacional Público',
    'INTER. PÚBLICO': 'Derecho Internacional Público',
    'DIPr': 'Derecho Internacional Privado',
    'INT. PRIVADO': 'Derecho Internacional Privado',
    'INTER. PRIVADO': 'Derecho Internacional Privado',
    'INT PRIVADO': 'Derecho Internacional Privado',
    'INT PUBLICO': 'Derecho Internacional Público',
    'ANALISIS': 'Elementos de Análisis Económico y Financiero'
}

CPO_SHEETS = [
    'SOCIALES', 'DEPTO. SOCIALES', 'FILO', 'DEPTO. FILO', 'FILOSOFÍA', 'FILOSOFIA', 'PROCESAL', 'DEPTO. PROCESAL',
    'CONCURSOS', 'MÉTODOS', 'METODOS', 'LABORAL', 'DEPTO. LABORAL', 'PENAL', 'DEPTO.PENAL', 'DEPTO. PENAL',
    'PRIVADO', 'DEPTO. PRIVADO', 'PUBLICO', 'DEPTO.PÚBLICO', 'DEPTO. PÚBLICO', 'EMPRESARIAL', 'EMPRESARIAL ',
    'DEPTO.EMPRESARIAL', 'DEPTO. EMPRESARIAL', 'NOTARIAL', 'ORIENTACIÓN NOTARIAL', 'INTEGRACION', 'INTEGRACIÓN',
    'TRIBUTARIO', 'ORIENTACIÓN TRIBUTARIO', 'INGLES', 'Inglés', 'PRACTICO', 'LECTOCOMPRENSIÓN', 'LECTO'
]

def parse_days(text):
    text = str(text).upper()
    days = []
    day_map = {
        'LU': 'LU', 'LUN': 'LU', 'LUNES': 'LU',
        'MA': 'MA', 'MAR': 'MA', 'MARTES': 'MA',
        'MI': 'MI', 'MIE': 'MI', 'MIÉ': 'MI', 'MIÉRCOLES': 'MI', 'MIERCOLES': 'MI',
        'JU': 'JU', 'JUE': 'JU', 'JUEVES': 'JU',
        'VI': 'VI', 'VIE': 'VI', 'VIERNES': 'VI',
        'SA': 'SA', 'SAB': 'SA', 'SÁBADO': 'SA', 'SABADO': 'SA'
    }
    tokens = re.findall(r'[A-ZÁÉÍÓÚÑ]+', text)
    for tok in tokens:
        if tok in day_map:
            days.append(day_map[tok])
        elif tok.startswith('LU'): days.append('LU')
        elif tok.startswith('MA'): days.append('MA')
        elif tok.startswith('MI'): days.append('MI')
        elif tok.startswith('JU'): days.append('JU')
        elif tok.startswith('VI'): days.append('VI')
        elif tok.startswith('SA'): days.append('SA')
    
    seen = set()
    return [x for x in days if not (x in seen or seen.add(x))]

def parse_hours(text):
    text = str(text).lower()
    time_matches = re.findall(r'(\d{1,2})(?::(\d{2}))?', text)
    times = []
    for h, m in time_matches:
        hour = int(h)
        minute = int(m) if m else 0
        times.append(f"{hour:02d}:{minute:02d}")
    
    if len(times) >= 2:
        return times[0], times[1]
    elif len(times) == 1:
        h, m = map(int, times[0].split(':'))
        end_h = h + 1
        end_m = m + 30
        if end_m >= 60:
            end_h += 1
            end_m -= 60
        return times[0], f"{end_h:02d}:{end_m:02d}"
    return "08:30", "10:00"

def clean_professor(prof):
    if pd.isna(prof) or not str(prof).strip():
        return "A designar"
    prof = str(prof).strip().upper()
    prof = re.sub(r'\s+', ' ', prof)
    return prof

def clean_modality(mod):
    if pd.isna(mod):
        return "Presencial"
    mod = str(mod).lower()
    is_presencial = 'presencial' in mod or 'presencual' in mod
    is_virtual = 'virtual' in mod or 'remota' in mod or 'remoto' in mod or 'zoom' in mod
    if is_presencial and is_virtual:
        return "Mixta"
    elif is_virtual:
        return "Virtual"
    return "Presencial"

def clean_difficulty(diff):
    if pd.isna(diff):
        return "Media"
    diff = str(diff).upper().strip()
    if 'BAJA' in diff or 'BAJO' in diff:
        return "Baja"
    elif 'ALTA' in diff or 'ALTO' in diff:
        return "Alta"
    return "Media"

def is_pro_student(comment_text):
    pos_keywords = [
        r'pro-alumno', r'pro alumno', r'recomiendo', r'muy recomendada', r'muy recomendable',
        r'sin animos de bochar', r'sin ánimos de bochar', r'buena predisposición', r'buena predisposicion',
        r'accesible', r'llevadera', r'generoso', r'generosa', r'buen trato', r'cero animos de bochar',
        r'cero ánimos de bochar'
    ]
    comment_text_lower = str(comment_text).lower()
    for kw in pos_keywords:
        if re.search(kw, comment_text_lower):
            return True
    return False

def get_sheet_data(df):
    header_idx = -1
    for i in range(min(10, len(df))):
        row_vals = [str(x).upper() for x in df.iloc[i].values]
        if any("COMISIÓN" in x or "COMISION" in x for x in row_vals) or any("N°" in x or "Nº" in x for x in row_vals) or any("CÁTEDRA" in x or "CATEDRA" in x for x in row_vals):
            header_idx = i
            break
    if header_idx == -1:
        header_idx = 0
    headers = [str(x).strip().upper() for x in df.iloc[header_idx].values]
    data_rows = []
    for r_idx in range(header_idx + 1, len(df)):
        row = df.iloc[r_idx]
        data_rows.append((headers, row))
    return data_rows

def parse_cpc_row(headers, row, sheet_name, source_name):
    row_dict = {}
    for h, v in zip(headers, row):
        row_dict[h] = v
        
    comm = ""
    for k in ['COMISIÓN', 'COMISION', 'N°', 'Nº', 'N° DE COMISIÓN']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comm = str(row_dict[k]).split('.')[0].strip()
            break
            
    if not comm or not comm.isdigit():
        return None
        
    subject = ""
    for k in ['MATERIA', 'MATERIA ', 'CÁTEDRA', 'CATEDRA']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and len(sval) > 4:
                subject = sval
                break
    if not subject:
        for k in [' ', 'UNNAMED: 0', '📚 CÁTEDRAS RECOMENDADAS - 2º CUATRI 2026 - LA CÁMPORA 📚']:
            if k in row_dict and not pd.isna(row_dict[k]):
                sval = str(row_dict[k]).strip()
                if not sval.isdigit() and len(sval) > 4:
                    subject = sval
                    break
    if not subject:
        subject = sheet_name
        
    prof = "A designar"
    for k in ['DOCENTE', 'DOCENTE ', 'CÁTEDRA', 'CATEDRA', 'COMISIÓN', 'COMISION']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and sval != subject:
                prof = clean_professor(sval)
                break
                
    days = []
    time_start, time_end = "08:30", "10:00"
    schedule_str = ""
    
    turno_horario = ""
    for k in ['TURNO/HORARIO', 'HORARIO', 'HORARIO ', 'DÍA Y HORARIO', 'DÍA/HORARIO', 'HORARIOS ', 'HORARIOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            turno_horario = str(row_dict[k]).strip()
            break
            
    dias_val = ""
    for k in ['DIA/S', 'DÍAS', 'DIAS', 'DÍAS ', 'DIAS ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            dias_val = str(row_dict[k]).strip()
            break
            
    if turno_horario:
        days = parse_days(turno_horario)
        time_start, time_end = parse_hours(turno_horario)
        schedule_str = turno_horario
        if dias_val and not days:
            days = parse_days(dias_val)
    elif dias_val:
        days = parse_days(dias_val)
        for k in ['HORARIO', 'HORARIO ']:
            if k in row_dict and not pd.isna(row_dict[k]):
                time_start, time_end = parse_hours(row_dict[k])
                schedule_str = f"{dias_val} {row_dict[k]}"
                break
        if not schedule_str:
            schedule_str = dias_val
            
    modality = "Presencial"
    for k in ['MODALIDAD', 'MODALIDAD ', 'TIPO']:
        if k in row_dict and not pd.isna(row_dict[k]):
            modality = clean_modality(row_dict[k])
            break
            
    difficulty = "Media"
    for k in ['DIFICULTAD', 'DIFICULTAD ', 'RECOMENDACIÓN', 'RECOMENDACION']:
        if k in row_dict and not pd.isna(row_dict[k]):
            difficulty = clean_difficulty(row_dict[k])
            break
            
    comment = ""
    for k in ['COMENTARIOS', 'COMENTARIO', 'OBSERVACIONES', 'OBSERVACION', 'RESEÑA', 'RESENA', 'OPINIÓN', 'OPINION', 'OPINIONES']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comment = str(row_dict[k]).strip()
            break
            
    corte_p = "-"
    for k in ['PUNTAJE', 'CORTE', 'PUNTOS', 'CORTE 1C 2026', 'CORTE 2026']:
        if k in row_dict and not pd.isna(row_dict[k]):
            corte_p = str(row_dict[k]).strip()
            break
            
    aula = ""
    for k in ['AULA', 'AULA ', 'SALÓN', 'SALON']:
        if k in row_dict and not pd.isna(row_dict[k]):
            aula = str(row_dict[k]).strip()
            break
            
    # Subject name normalization
    subject_upper = subject.upper()
    for key, mapped in SUBJECT_MAP_CPC.items():
        if key in subject_upper:
            subject = mapped
            break
            
    return {
        'subject': subject,
        'commission': comm,
        'professor': prof,
        'days': days,
        'time_start': time_start,
        'time_end': time_end,
        'schedule': schedule_str if schedule_str else f"{'-'.join(days)} {time_start} a {time_end}",
        'modality': modality,
        'difficulty': difficulty,
        'corte_puntos': corte_p,
        'aula': aula,
        'comment': comment
    }

def parse_cpo_row(headers, row, sheet_name, source_name):
    row_dict = {}
    for h, v in zip(headers, row):
        row_dict[h] = v
        
    comm = ""
    for k in ['COMISIÓN', 'COMISION', 'N°', 'Nº', 'N° DE COMISIÓN']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comm = str(row_dict[k]).split('.')[0].strip()
            break
            
    if not comm or not comm.isdigit():
        return None
        
    subject = ""
    for k in ['MATERIA', 'MATERIA ', 'CÁTEDRA', 'CATEDRA']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and len(sval) > 4:
                subject = sval
                break
    if not subject:
        for k in [' ', 'UNNAMED: 0']:
            if k in row_dict and not pd.isna(row_dict[k]):
                sval = str(row_dict[k]).strip()
                if not sval.isdigit() and len(sval) > 4:
                    subject = sval
                    break
    if not subject:
        subject = sheet_name
        
    prof = "A designar"
    for k in ['DOCENTE', 'DOCENTE ', 'CÁTEDRA', 'CATEDRA', 'COMISIÓN', 'COMISION']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and sval != subject:
                prof = clean_professor(sval)
                break
                
    days = []
    time_start, time_end = "08:30", "10:00"
    schedule_str = ""
    
    turno_horario = ""
    for k in ['TURNO/HORARIO', 'HORARIO', 'HORARIO ', 'DÍA Y HORARIO', 'DÍA/HORARIO', 'HORARIOS ', 'HORARIOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            turno_horario = str(row_dict[k]).strip()
            break
            
    dias_val = ""
    for k in ['DIA/S', 'DÍAS', 'DIAS', 'DÍAS ', 'DIAS ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            dias_val = str(row_dict[k]).strip()
            break
            
    if turno_horario:
        days = parse_days(turno_horario)
        time_start, time_end = parse_hours(turno_horario)
        schedule_str = turno_horario
        if dias_val and not days:
            days = parse_days(dias_val)
    elif dias_val:
        days = parse_days(dias_val)
        for k in ['HORARIO', 'HORARIO ']:
            if k in row_dict and not pd.isna(row_dict[k]):
                time_start, time_end = parse_hours(row_dict[k])
                schedule_str = f"{dias_val} {row_dict[k]}"
                break
        if not schedule_str:
            schedule_str = dias_val
            
    modality = "Presencial"
    for k in ['MODALIDAD', 'MODALIDAD ', 'TIPO']:
        if k in row_dict and not pd.isna(row_dict[k]):
            modality = clean_modality(row_dict[k])
            break
            
    difficulty = "Media"
    for k in ['DIFICULTAD', 'DIFICULTAD ', 'RECOMENDACIÓN', 'RECOMENDACION']:
        if k in row_dict and not pd.isna(row_dict[k]):
            difficulty = clean_difficulty(row_dict[k])
            break
            
    comment = ""
    for k in ['COMENTARIOS', 'COMENTARIO', 'OBSERVACIONES', 'OBSERVACION', 'RESEÑA', 'RESENA', 'OPINIÓN', 'OPINION', 'OPINIONES']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comment = str(row_dict[k]).strip()
            break
            
    corte_p = "-"
    for k in ['PUNTAJE', 'CORTE', 'PUNTOS', 'CORTE 1C 2026', 'CORTE 2026']:
        if k in row_dict and not pd.isna(row_dict[k]):
            corte_p = str(row_dict[k]).strip()
            break
            
    aula = ""
    for k in ['AULA', 'AULA ', 'SALÓN', 'SALON']:
        if k in row_dict and not pd.isna(row_dict[k]):
            aula = str(row_dict[k]).strip()
            break
            
    # Subject name normalization for CPO elements
    subject_upper = subject.upper()
    for key, mapped in SUBJECT_MAP_CPC.items():
        if key in subject_upper:
            subject = mapped
            break
            
    return {
        'subject': subject,
        'commission': comm,
        'professor': prof,
        'days': days,
        'time_start': time_start,
        'time_end': time_end,
        'schedule': schedule_str if schedule_str else f"{'-'.join(days)} {time_start} a {time_end}",
        'modality': modality,
        'difficulty': difficulty,
        'corte_puntos': corte_p,
        'aula': aula,
        'comment': comment
    }

def parse_centeno_pdf(filepath):
    try:
        import pypdf
    except ImportError:
        print("  Instalando pypdf...")
        import subprocess
        subprocess.check_call(["pip", "install", "pypdf"])
        import pypdf

    filename = os.path.basename(filepath).upper()
    subject = ""
    for kw, full_name in SUBJECT_MAP_CPC.items():
        if kw in filename:
            subject = full_name
            break
            
    if not subject:
        if "CIVIL" in filename: subject = "Elementos de Derecho Civil"
        elif "PENAL" in filename: subject = "Elementos de Derecho Penal y Procesal Penal"
        elif "OBLIGACIONES" in filename: subject = "Obligaciones Civiles y Comerciales"
        elif "TGD" in filename: subject = "Teoría General del Derecho"
        elif "TDE" in filename: subject = "Teoría del Estado"
        elif "CONTRATOS" in filename: subject = "Contratos Civiles y Comerciales"
        elif "CONSTITUCIONAL" in filename: subject = "Elementos de Derecho Constitucional"
        elif "DDHH" in filename: subject = "Derechos Humanos y Garantías"
        elif "REALES" in filename: subject = "Elementos de Derechos Reales"
        elif "COMERCIAL" in filename: subject = "Elementos de Derecho Comercial"
        elif "PROCESAL" in filename: subject = "Elementos de Derecho Procesal Civil y Comercial"
        elif "ADMINISTRATIVO" in filename: subject = "Derecho Administrativo"
        elif "LABORAL" in filename: subject = "Derecho del Trabajo y de la Seguridad Social"
        elif "SOCIEDADES" in filename: subject = "Derecho Comercial (Sociedades)"
        elif "TRIBUTARIO" in filename: subject = "Derecho Tributario y Finanzas Públicas"
        elif "FAMILIA" in filename: subject = "Derecho de Familia y Sucesiones"
        else: subject = filename.split(".")[0].split()[0]
        
    print(f"  [PDF La Centeno] Asignando materia: {subject}")
    
    reader = pypdf.PdfReader(filepath)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
        
    pattern = r'(\d{4})\s+(Presencial|Virtual|Mixta|Remoto|A\s+designar|Presenciales|Virtuales|Mixtas)'
    matches = list(re.finditer(pattern, text, re.IGNORECASE))
    
    parsed_items = []
    for idx, match in enumerate(matches):
        start_pos = match.start()
        end_pos = matches[idx+1].start() if idx + 1 < len(matches) else len(text)
        
        block = text[start_pos:end_pos].strip()
        lines = block.split('\n')
        first_line = lines[0]
        rest = " ".join(lines[1:])
        
        m = re.match(r'^(\d{4})\s+(Presencial|Virtual|Mixta|Remoto|A\s+designar)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s\-\.]+)', first_line, re.IGNORECASE)
        if m:
            comm = m.group(1)
            modality = m.group(2)
            prof = m.group(3).strip()
            
            full_rest = first_line[m.end():] + " " + rest
            full_rest = re.sub(r'\s+', ' ', full_rest).strip()
            
            corte_match = re.search(r'Corte\s+[^:]+:\s*([^\s]+)', full_rest, re.IGNORECASE)
            corte_val = "-"
            if corte_match:
                corte_val = corte_match.group(1).strip()
                comment_part = full_rest[corte_match.end():].strip()
            else:
                comment_part = full_rest
                
            days = parse_days(full_rest)
            time_start, time_end = parse_hours(full_rest)
            
            for d in ['Lun', 'Mar', 'Mie', 'Mier', 'Jue', 'Vie', 'Sab']:
                if prof.endswith(' ' + d) or prof.endswith(' ' + d.upper()):
                    prof = prof[:-len(d)-1].strip()
            
            parsed_items.append({
                'subject': subject,
                'commission': comm,
                'professor': prof,
                'days': days,
                'time_start': time_start,
                'time_end': time_end,
                'schedule': full_rest.split('Corte')[0].strip(),
                'modality': clean_modality(modality),
                'difficulty': clean_difficulty(comment_part),
                'corte_puntos': corte_val,
                'aula': '',
                'comment': comment_part,
                'source': 'La Centeno'
            })
            
    return parsed_items

def download_online_databases():
    print("\n=== DESCARGANDO RECOMENDACIONES EN LÍNEA ===")
    
    # 1. Download Google Sheets directly
    for res in SHEET_RESOURCES:
        url = f"https://docs.google.com/spreadsheets/d/{res['id']}/export?format=xlsx"
        filename = f"{res['name']}.xlsx"
        filepath = os.path.join(res['dest_dir'], filename)
        
        print(f"Descargando Google Sheet '{res['name']}'...")
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                with open(filepath, 'wb') as out_file:
                    out_file.write(response.read())
            print(f"  [OK] Guardado en: {filename}")
        except Exception as e:
            print(f"  [ERROR] No se pudo descargar {res['name']}: {e}")
            
    # 2. Download La Centeno PDFs using gdown
    print("\nDescargando PDFs de La Centeno desde Google Drive...")
    try:
        import gdown
        os.makedirs(TEMP_DIR, exist_ok=True)
        # Download files from Centeno Drive folder to temp_downloads
        gdown.download_folder(CENTENO_DRIVE_FOLDER, output=TEMP_DIR, quiet=True, use_cookies=False)
        print("  [OK] Descarga de PDFs finalizada.")
        
        # Copy PDFs to Recomendaciones CPC
        copied_count = 0
        for f in os.listdir(TEMP_DIR):
            if f.endswith('.pdf'):
                shutil.copy(os.path.join(TEMP_DIR, f), os.path.join(CPC_DIR, f))
                copied_count += 1
        print(f"  [OK] Copiados {copied_count} PDFs a 'Recomendaciones CPC'.")
    except Exception as e:
        print(f"  [ERROR] No se pudo descargar la carpeta de Drive de La Centeno: {e}")
        print("  (Asegúrate de que 'gdown' esté instalado y que el Drive sea público).")
        
    # Cleanup temp directory
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

def compile_database():
    print("\n=== COMPILANDO BASE DE DATOS LOCAL ===")
    
    # We will output two databases
    for is_cpo_dir, dir_path, output_json in [(False, CPC_DIR, "cpc_data.json"), (True, CPO_DIR, "cpo_data.json")]:
        print(f"\nProcesando ciclo {'CPO' if is_cpo_dir else 'CPC'} en: {os.path.basename(dir_path)}")
        db = {}
        
        if not os.path.exists(dir_path):
            continue
            
        for filename in os.listdir(dir_path):
            filepath = os.path.join(dir_path, filename)
            source_name = "Otros"
            filename_upper = filename.upper()
            
            if "CAMPORA" in filename_upper or "CÁMPORA" in filename_upper:
                source_name = "La Cámpora"
            elif "MELLA" in filename_upper or "RECOMELLAS" in filename_upper:
                source_name = "Recomellas"
            elif "CENTENO" in filename_upper:
                source_name = "La Centeno"
            elif "NEXO" in filename_upper:
                source_name = "Nexo"
            elif "NUEVO DERECHO" in filename_upper or "NUEVODERECHO" in filename_upper:
                source_name = "Nuevo Derecho"
            elif "FRANJA" in filename_upper:
                source_name = "Franja Morada"
                
            # Parse Excel files
            if filename.endswith('.xlsx') or filename.endswith('.xls'):
                print(f"  Procesando planilla: {filename} ({source_name})")
                try:
                    xl = pd.ExcelFile(filepath)
                    for sheet in xl.sheet_names:
                        if sheet.strip().upper() in ['ÍNDICE', 'INDICE', 'CORTE', 'AULAS2C', 'INSTRUCCIONES', 'INSTRUCCIONES ', 'COMISIONES RECOMENDADAS POR LA ', 'COMISIONES RECOMENDADAS POR LA']:
                            continue
                            
                        df = pd.read_excel(filepath, sheet_name=sheet)
                        is_cpo_sheet = sheet.strip().upper() in CPO_SHEETS or is_cpo_dir
                        rows_data = get_sheet_data(df)
                        
                        for headers, row in rows_data:
                            if is_cpo_sheet:
                                parsed = parse_cpo_row(headers, row, sheet, source_name)
                            else:
                                parsed = parse_cpc_row(headers, row, sheet, source_name)
                                
                            if not parsed:
                                continue
                                
                            subj = parsed['subject']
                            comm = parsed['commission']
                            prof = parsed['professor']
                            comment_txt = parsed['comment']
                            
                            if not subj or subj == "nan" or not comm:
                                continue
                                
                            key = (subj, comm)
                            if key not in db:
                                db[key] = {
                                    'subject': subj,
                                    'commission': comm,
                                    'professor': prof,
                                    'days': parsed['days'],
                                    'time_start': parsed['time_start'],
                                    'time_end': parsed['time_end'],
                                    'schedule': parsed['schedule'],
                                    'modality': parsed['modality'],
                                    'difficulty': parsed['difficulty'],
                                    'corte_puntos': parsed['corte_puntos'],
                                    'aula': parsed['aula'],
                                    'comments': [],
                                    'sources': [],
                                    'is_pro_student': False
                                }
                                
                            if comment_txt and comment_txt != "nan" and len(comment_txt.strip()) > 3:
                                existing = [c['text'].lower() for c in db[key]['comments']]
                                if comment_txt.lower() not in existing:
                                    db[key]['comments'].append({
                                        'source': source_name,
                                        'text': comment_txt
                                    })
                                    
                            if source_name not in db[key]['sources']:
                                db[key]['sources'].append(source_name)
                                
                            if db[key]['is_pro_student'] == False and is_pro_student(comment_txt):
                                db[key]['is_pro_student'] = True
                except Exception as e:
                    print(f"    [Error] Falló al leer el excel {filename}: {e}")
                    
            # Parse PDF files (Centeno PDFs)
            elif filename.endswith('.pdf'):
                print(f"  Procesando PDF: {filename} ({source_name})")
                try:
                    parsed_items = parse_centeno_pdf(filepath)
                    for parsed in parsed_items:
                        subj = parsed['subject']
                        comm = parsed['commission']
                        prof = parsed['professor']
                        comment_txt = parsed['comment']
                        
                        if not subj or not comm:
                            continue
                            
                        key = (subj, comm)
                        if key not in db:
                            db[key] = {
                                'subject': subj,
                                'commission': comm,
                                'professor': prof,
                                'days': parsed['days'],
                                'time_start': parsed['time_start'],
                                'time_end': parsed['time_end'],
                                'schedule': parsed['schedule'],
                                'modality': parsed['modality'],
                                'difficulty': parsed['difficulty'],
                                'corte_puntos': parsed['corte_puntos'],
                                'aula': '',
                                'comments': [],
                                'sources': [],
                                'is_pro_student': False
                            }
                            
                        if comment_txt and comment_txt != "nan" and len(comment_txt.strip()) > 3:
                            existing = [c['text'].lower() for c in db[key]['comments']]
                            if comment_txt.lower() not in existing:
                                db[key]['comments'].append({
                                    'source': source_name,
                                    'text': comment_txt
                                })
                                
                        if source_name not in db[key]['sources']:
                            db[key]['sources'].append(source_name)
                            
                        if db[key]['is_pro_student'] == False and is_pro_student(comment_txt):
                            db[key]['is_pro_student'] = True
                except Exception as e:
                    print(f"    [Error] Falló al procesar el PDF {filename}: {e}")
                    
        # Write to JSON
        final_list = list(db.values())
        output_filepath = os.path.join(WORKSPACE_DIR, output_json)
        with open(output_filepath, 'w', encoding='utf-8') as f:
            json.dump(final_list, f, ensure_ascii=False, indent=4)
        print(f"  [OK] Guardado catálogo compilado: {output_json} ({len(final_list)} comisiones)")

if __name__ == "__main__":
    # 1. Download online sheets & drive folders
    download_online_databases()
    
    # 2. Re-compile local files
    compile_database()
    
    print("\n=== PROCESO DE ACTUALIZACIÓN FINALIZADO CON ÉXITO ===")
