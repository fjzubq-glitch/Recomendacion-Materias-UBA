import os
import re
import json
import pandas as pd

cpc_dir = r"c:\Users\User\Downloads\WIN10PRO64NOV-XYZ\Desktop\Proyectos Antigravity\Recomendacion Materias UBA\Recomendacion Materias UBA\Recomendaciones CPC"
cpo_dir = r"c:\Users\User\Downloads\WIN10PRO64NOV-XYZ\Desktop\Proyectos Antigravity\Recomendacion Materias UBA\Recomendacion Materias UBA\Recomendaciones CPO"

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
    'INTER. PRIVADO': 'Derecho Internacional Privado'
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
    days = [x for x in days if not (x in seen or seen.add(x))]
    return days

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

def get_sheet_data(df, source_name):
    # Detect row header index
    header_idx = -1
    for i in range(min(10, len(df))):
        row_vals = [str(x).upper() for x in df.iloc[i].values]
        if any("COMISIÓN" in x or "COMISION" in x for x in row_vals) or any("N°" in x or "Nº" in x for x in row_vals) or any("CÁTEDRA" in x or "CATEDRA" in x for x in row_vals):
            header_idx = i
            break
            
    if header_idx == -1:
        # Fallback to 0 if not detected
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
        
    # Find commission number
    comm = ""
    for k in ['COMISIÓN', 'COMISION', 'N°', 'Nº', 'N° DE COMISIÓN']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comm = str(row_dict[k]).split('.')[0].strip()
            break
    if not comm:
        # Fallback to column index
        for idx, val in enumerate(row):
            if headers[idx] in ['', 'NAN', 'UNNAMED: 0', '📚'] and not pd.isna(val):
                sval = str(val).split('.')[0].strip()
                if sval.isdigit() and len(sval) >= 3:
                    comm = sval
                    break
    if not comm or not comm.isdigit():
        return None
        
    # Subject name
    subject = SUBJECT_MAP_CPC.get(sheet_name.strip().upper(), sheet_name.strip())
    
    # Professor
    prof = "A designar"
    for k in ['CÁTEDRA', 'CATEDRA', 'COMISIÓN', 'COMISION', 'DOCENTE', 'DOCENTE ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            # If La Campora used COMISIÓN for both number and professor, we need to handle it.
            # But wait, in La Campora, COMISIÓN column Unnamed: 1 was the professor, and 📚 column was the number.
            if not sval.isdigit():
                prof = clean_professor(sval)
                break
                
    # Schedule & Days
    days = []
    time_start, time_end = "08:30", "10:00"
    schedule_str = ""
    
    # Check if there is a Turno/Horario column
    turno_horario = ""
    for k in ['TURNO/HORARIO', 'HORARIO', 'HORARIO ', 'DÍA Y HORARIO', 'DÍA/HORARIO']:
        if k in row_dict and not pd.isna(row_dict[k]):
            turno_horario = str(row_dict[k]).strip()
            break
            
    # Days column
    dias_val = ""
    for k in ['DÍAS', 'DIAS', 'DÍAS ', 'DIAS ']:
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
        # Search hours in other columns
        for k in ['HORARIO', 'HORARIO ']:
            if k in row_dict and not pd.isna(row_dict[k]):
                time_start, time_end = parse_hours(row_dict[k])
                schedule_str = f"{dias_val} {row_dict[k]}"
                break
                
    if not days:
        days = ["LU", "JU"] # Default fallback
    if not schedule_str:
        days_str = "-".join(days)
        schedule_str = f"{days_str} {time_start} a {time_end}"
        
    # Modality
    mod = "Presencial"
    for k in ['MODALIDAD', 'MODALIDAD ', 'PRESENCIAL\nREMOTA']:
        if k in row_dict and not pd.isna(row_dict[k]):
            mod = clean_modality(row_dict[k])
            break
            
    # Difficulty
    diff = "Media"
    for k in ['NIVEL', 'NIVEL ', 'DIFICULTAD']:
        if k in row_dict and not pd.isna(row_dict[k]):
            diff = clean_difficulty(row_dict[k])
            break
            
    # Comment
    comment_text = ""
    for k in ['COMENTARIO', 'COMENTARIO ', 'OPINIÓN', 'OPINION', 'RECOMENDACIÓN ', 'RECOMENDACIÓN', 'RECOMENDACION', 'COMENTARIOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comment_text = str(row_dict[k]).strip()
            break
            
    # Corte
    corte = "0"
    for k in ['CORTE', 'CORTE 1° CUATRI', 'ULTIMO CORTE', 'PUNTOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            corte = str(row_dict[k]).strip()
            break
            
    # Aula
    aula = ""
    for k in ['AULA', 'AULAS2C']:
        if k in row_dict and not pd.isna(row_dict[k]):
            aula = str(row_dict[k]).strip()
            break
            
    return {
        'subject': subject,
        'commission': comm,
        'professor': prof,
        'days': days,
        'time_start': time_start,
        'time_end': time_end,
        'schedule': schedule_str,
        'modality': mod,
        'difficulty': diff,
        'comment': comment_text,
        'corte_puntos': corte,
        'aula': aula
    }

def parse_cpo_row(headers, row, sheet_name, source_name):
    row_dict = {}
    for h, v in zip(headers, row):
        row_dict[h] = v
        
    # Commission
    comm = ""
    for k in ['COMISIÓN', 'COMISION', 'COMISIÓN ', 'COMISION ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comm = str(row_dict[k]).split('.')[0].strip()
            break
    if not comm:
        # Fallback to column index checking digit
        for idx, val in enumerate(row):
            if not pd.isna(val):
                sval = str(val).split('.')[0].strip()
                if sval.isdigit() and len(sval) >= 2:
                    comm = sval
                    break
    if not comm or not comm.isdigit():
        return None
        
    # Subject/Materia
    subject = ""
    # In some sheets, the subject is in CÁTEDRA or MATERIA column
    for k in ['MATERIA', 'MATERIA ', 'CÁTEDRA', 'CATEDRA']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and len(sval) > 4:
                subject = sval
                break
    if not subject:
        # In Recomellas CPO, the first column ' ' has the materia name
        for k in [' ', 'UNNAMED: 0', '📚 CÁTEDRAS RECOMENDADAS - 2º CUATRI 2026 - LA CÁMPORA 📚']:
            if k in row_dict and not pd.isna(row_dict[k]):
                sval = str(row_dict[k]).strip()
                if not sval.isdigit() and len(sval) > 4:
                    subject = sval
                    break
    if not subject:
        # Fallback to sheet name
        subject = sheet_name
        
    # Professor
    prof = "A designar"
    for k in ['DOCENTE', 'DOCENTE ', 'CÁTEDRA', 'CATEDRA', 'COMISIÓN', 'COMISION']:
        if k in row_dict and not pd.isna(row_dict[k]):
            sval = str(row_dict[k]).strip()
            if not sval.isdigit() and sval != subject:
                prof = clean_professor(sval)
                break
                
    # Schedule & Days
    days = []
    time_start, time_end = "08:30", "10:00"
    schedule_str = ""
    
    # Check if there is a Turno/Horario column
    turno_horario = ""
    for k in ['TURNO/HORARIO', 'HORARIO', 'HORARIO ', 'DÍA Y HORARIO', 'DÍA/HORARIO', 'HORARIOS ', 'HORARIOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            turno_horario = str(row_dict[k]).strip()
            break
            
    # Days column
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
        # Search hours
        for k in ['HORARIO', 'HORARIO ']:
            if k in row_dict and not pd.isna(row_dict[k]):
                time_start, time_end = parse_hours(row_dict[k])
                schedule_str = f"{dias_val} {row_dict[k]}"
                break
                
    if not days:
        days = ["LU", "JU"]
    if not schedule_str:
        days_str = "-".join(days)
        schedule_str = f"{days_str} {time_start} a {time_end}"
        
    # Modality
    mod = "Presencial"
    for k in ['MODALIDAD', 'MODALIDAD ', 'PRESENCIAL\nREMOTA', 'PRESENCIAL\nREMOTA ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            mod = clean_modality(row_dict[k])
            break
            
    # Difficulty
    diff = "Media"
    for k in ['NIVEL', 'NIVEL ', 'DIFICULTAD']:
        if k in row_dict and not pd.isna(row_dict[k]):
            diff = clean_difficulty(row_dict[k])
            break
            
    # Comment
    comment_text = ""
    for k in ['COMENTARIO', 'COMENTARIO ', 'OPINIÓN', 'OPINION', 'RECOMENDACIÓN ', 'RECOMENDACIÓN', 'RECOMENDACION', 'COMENTARIOS', 'RESEÑA ', 'RESEÑA', 'RESEÑA  ']:
        if k in row_dict and not pd.isna(row_dict[k]):
            comment_text = str(row_dict[k]).strip()
            break
            
    # Corte
    corte = "0"
    for k in ['CORTE', 'ULTIMO CORTE', 'PUNTOS', 'PTOS']:
        if k in row_dict and not pd.isna(row_dict[k]):
            corte = str(row_dict[k]).strip()
            break
            
    # Aula
    aula = ""
    
    return {
        'subject': subject,
        'commission': comm,
        'professor': prof,
        'days': days,
        'time_start': time_start,
        'time_end': time_end,
        'schedule': schedule_str,
        'modality': mod,
        'difficulty': diff,
        'comment': comment_text,
        'corte_puntos': corte,
        'aula': aula
    }

def process_directory(directory, is_cpo_dir=False):
    db = {}
    
    for filename in os.listdir(directory):
        if not filename.endswith('.xlsx') or filename.startswith('~$'):
            continue
            
        filepath = os.path.join(directory, filename)
        print(f"Parsing: {filename}")
        
        # Determine source
        source_name = "Recomellas"
        if "CAMPORA" in filename.upper() or "CÁMPORA" in filename.upper():
            source_name = "La Campora"
        elif "CENTENO" in filename.upper():
            source_name = "La Centeno"
        elif "NEXO" in filename.upper():
            source_name = "Nexo"
            
        try:
            xl = pd.ExcelFile(filepath)
            for sheet in xl.sheet_names:
                # Exclude administrative sheets
                if sheet.strip().upper() in ['ÍNDICE', 'INDICE', 'CORTE', 'AULAS2C', 'INSTRUCCIONES', 'INSTRUCCIONES ', 'COMISIONES RECOMENDADAS POR LA ', 'COMISIONES RECOMENDADAS POR LA']:
                    continue
                    
                df = pd.read_excel(filepath, sheet_name=sheet)
                
                # Check if it should be CPO based on sheet name
                is_cpo_sheet = sheet.strip().upper() in CPO_SHEETS or is_cpo_dir
                
                rows_data = get_sheet_data(df, source_name)
                
                for headers, row in rows_data:
                    if is_cpo_sheet:
                        parsed = parse_cpo_row(headers, row, sheet, source_name)
                    else:
                        parsed = parse_cpc_row(headers, row, sheet, source_name)
                        
                    if not parsed:
                        continue
                        
                    # Normalize values
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
                        
                    # Add comment if present and not empty
                    if comment_txt and comment_txt != "nan" and len(comment_txt.strip()) > 3:
                        # Avoid duplicates
                        existing_comments = [c['text'].lower() for c in db[key]['comments']]
                        if comment_txt.lower() not in existing_comments:
                            db[key]['comments'].append({
                                'source': source_name,
                                'text': comment_txt
                            })
                            
                    if source_name not in db[key]['sources']:
                        db[key]['sources'].append(source_name)
                        
                    # Check pro-alumno
                    if db[key]['is_pro_student'] == False:
                        if is_pro_student(comment_txt):
                            db[key]['is_pro_student'] = True
                            
        except Exception as e:
            print(f"Error reading {filename} sheet {sheet if 'sheet' in locals() else 'unknown'}: {e}")
            
    # Convert dict to list
    return list(db.values())

print("Parsing CPC directory...")
cpc_data = process_directory(cpc_dir, is_cpo_dir=False)

print("Parsing CPO directory...")
cpo_data = process_directory(cpo_dir, is_cpo_dir=True)

# Write to JSON files
with open("cpc_data.json", "w", encoding="utf-8") as f:
    json.dump(cpc_data, f, ensure_ascii=False, indent=2)
    
with open("cpo_data.json", "w", encoding="utf-8") as f:
    json.dump(cpo_data, f, ensure_ascii=False, indent=2)

print(f"Done! CPC items: {len(cpc_data)}, CPO items: {len(cpo_data)}")
