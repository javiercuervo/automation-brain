import re

# Funciones de normalización
def norm_str(v):
    return None if v is None or str(v).strip() == "" else re.sub(r'\s+', ' ', str(v).strip())

def norm_email(v):
    return None if not norm_str(v) else norm_str(v).lower()

def norm_phone(v):
    return None if not v else (None if len(re.sub(r'[^\d+]', '', str(v))) < 9 else re.sub(r'[^\d+]', '', str(v)))

def norm_dni(v):
    return None if not v else re.sub(r'[\s-]', '', str(v)).upper()

def norm_sexo(v):
    m = {"Hombre": "Masculino", "Mujer": "Femenino", "HOMBRE": "Masculino", "MUJER": "Femenino"}
    return None if not norm_str(v) else m.get(norm_str(v), norm_str(v))

def parse_date(v):
    if not v:
        return None
    c = re.sub(r'^Date:\s*', '', str(v), flags=re.IGNORECASE).strip()
    m = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'}
    x = re.match(r'(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})', c)
    return f"{x.group(3)}-{m.get(x.group(2),'01')}-{x.group(1).zfill(2)}" if x else None

def parse_dt(v):
    if not v:
        return None
    m = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'}
    x = re.match(r'(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})', str(v))
    return f"{x.group(3)}-{m.get(x.group(2),'01')}-{x.group(1).zfill(2)}T{x.group(4).zfill(2)}:{x.group(5)}:00Z" if x else None

def split_c(v):
    return [] if not v else [i.strip() for i in str(v).split(',') if i.strip()]

# Obtener datos de input
r = {
    'submitted_on': input.get('submitted_on'),
    'email': input.get('email'),
    'nombre': input.get('nombre'),
    'apellidos': input.get('apellidos'),
    'dni': input.get('dni'),
    'tipo_matricula': input.get('tipo_matricula'),
    'seleccion_modulos': input.get('seleccion_modulos'),
    'titulo_civil': input.get('titulo_civil'),
    'indique_titulo': input.get('indique_titulo'),
    'calle': input.get('calle'),
    'numero_piso': input.get('numero_piso'),
    'centro_asociado': input.get('centro_asociado'),
    'nombre_centro': input.get('nombre_centro'),
    'poblacion': input.get('poblacion'),
    'codigo_postal': input.get('codigo_postal'),
    'provincia': input.get('provincia'),
    'fecha_nacimiento': input.get('fecha_nacimiento'),
    'estado_civil': input.get('estado_civil'),
    'sexo': input.get('sexo'),
    'telefono': input.get('telefono'),
    'firma': input.get('firma'),
    'thank_you': input.get('thank_you')
}

# Procesar
has_data = any(v for v in r.values() if v is not None and v != "")

if not has_data:
    output = {'action': 'SKIP', 'reason': 'Fila vacía', 'targets': {}}
else:
    n1 = norm_str(r['nombre'])
    n2 = norm_str(r['indique_titulo'])
    nombre = n1 or n2
    otro_titulo = None if (not n1 and n2) else n2
    email = norm_email(r['email'])
    dni = norm_dni(r['dni'])
    submitted = parse_dt(r['submitted_on'])
    apellidos = norm_str(r['apellidos'])

    err = []
    if not email:
        err.append("Email vacío")
    if not nombre:
        err.append("Nombre vacío")
    if not apellidos:
        err.append("Apellidos vacío")
    if not dni:
        err.append("DNI vacío")
    if not submitted:
        err.append("Fecha vacía")

    targets = {
        "Submitted On (UTC)": submitted,
        "¿En qué se desea matricular?": norm_str(r['tipo_matricula']),
        "Selección de módulos": split_c(r['seleccion_modulos']),
        "Título civil": norm_str(r['titulo_civil']),
        "Especificar otro título": otro_titulo,
        "Nombre": nombre,
        "Apellidos": apellidos,
        "Calle (vía)": norm_str(r['calle']),
        "Número, piso, puerta": norm_str(r['numero_piso']),
        "Centro asociado al que pertenece": norm_str(r['centro_asociado']),
        "Indique el nombre del centro": norm_str(r['nombre_centro']),
        "Población": norm_str(r['poblacion']),
        "Código postal": norm_str(r['codigo_postal']),
        "Provincia": norm_str(r['provincia']),
        "DNI / Pasaporte / NIE": dni,
        "Fecha de nacimiento": parse_date(r['fecha_nacimiento']),
        "Estado civil": norm_str(r['estado_civil']),
        "Sexo": norm_sexo(r['sexo']),
        "Teléfono de contacto": norm_phone(r['telefono']),
        "Correo electrónico": email,
        "Firma del solicitante": norm_str(r['firma']),
        "Thank You Screen": norm_str(r['thank_you'])
    }

    output = {
        'action': "ERROR" if err else "UPSERT",
        'reason': "; ".join(err) if err else "OK",
        'errors': err,
        'targets': targets
    }
