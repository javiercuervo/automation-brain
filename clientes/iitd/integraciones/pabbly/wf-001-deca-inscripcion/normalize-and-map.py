import re
def ns(v):return None if v is None or str(v).strip()=="" else re.sub(r'\s+',' ',str(v).strip())
def ne(v):return None if not ns(v) else ns(v).lower()
def np(v):return None if not v else (None if len(re.sub(r'[^\d+]','',str(v)))<9 else re.sub(r'[^\d+]','',str(v)))
def nd(v):return None if not v else re.sub(r'[\s-]','',str(v)).upper()
def nx(v):m={"Hombre":"Masculino","Mujer":"Femenino","HOMBRE":"Masculino","MUJER":"Femenino"};return None if not ns(v) else m.get(ns(v),ns(v))
def pd(v):
    if not v:return None
    c=re.sub(r'^Date:\s*','',str(v),flags=re.IGNORECASE).strip();m={'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'};x=re.match(r'(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})',c);return f"{x.group(3)}-{m.get(x.group(2),'01')}-{x.group(1).zfill(2)}" if x else None
def pdt(v):
    if not v:return None
    m={'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'};x=re.match(r'(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})',str(v));return f"{x.group(3)}-{m.get(x.group(2),'01')}-{x.group(1).zfill(2)}T{x.group(4).zfill(2)}:{x.group(5)}:00Z" if x else None
def sc(v):return [] if not v else [i.strip() for i in str(v).split(',') if i.strip()]

# === MAPEA ESTOS VALORES DESDE PABBLY (haz clic en cada "" y selecciona del Iterator) ===
submitted_on = ""
email = ""
nombre = ""
apellidos = ""
dni = ""
tipo_matricula = ""
seleccion_modulos = ""
titulo_civil = ""
indique_titulo = ""
calle = ""
numero_piso = ""
centro_asociado = ""
nombre_centro = ""
poblacion = ""
codigo_postal = ""
provincia = ""
fecha_nacimiento = ""
estado_civil = ""
sexo = ""
telefono = ""
firma = ""
thank_you = ""
# === FIN DE MAPEO ===

n1=ns(nombre);n2=ns(indique_titulo);nom=n1 or n2;otro=None if (not n1 and n2) else n2
em=ne(email);dn=nd(dni);sub=pdt(submitted_on);ap=ns(apellidos)
err=[]
if not em:err.append("Email")
if not nom:err.append("Nombre")
if not ap:err.append("Apellidos")
if not dn:err.append("DNI")
if not sub:err.append("Fecha")
targets={
    "Submitted On (UTC)":sub,
    "¿En qué se desea matricular?":ns(tipo_matricula),
    "Selección de módulos":sc(seleccion_modulos),
    "Título civil":ns(titulo_civil),
    "Especificar otro título":otro,
    "Nombre":nom,
    "Apellidos":ap,
    "Calle (vía)":ns(calle),
    "Número, piso, puerta":ns(numero_piso),
    "Centro asociado al que pertenece":ns(centro_asociado),
    "Indique el nombre del centro":ns(nombre_centro),
    "Población":ns(poblacion),
    "Código postal":ns(codigo_postal),
    "Provincia":ns(provincia),
    "DNI / Pasaporte / NIE":dn,
    "Fecha de nacimiento":pd(fecha_nacimiento),
    "Estado civil":ns(estado_civil),
    "Sexo":nx(sexo),
    "Teléfono de contacto":np(telefono),
    "Correo electrónico":em,
    "Firma del solicitante":ns(firma),
    "Thank You Screen":ns(thank_you),
    "ACEPTADO EN":"PENDIENTE"
}
output={'action':"ERROR" if err else "UPSERT",'reason':", ".join(err)+" vacios" if err else "OK",'targets':targets,'idempotency_key':f"{em}:{sub}"}
