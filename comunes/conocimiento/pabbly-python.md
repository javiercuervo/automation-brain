# Pabbly Connect – Python Code Scripts (Knowledge Base)

**Versión**: 1.0  
**Fecha de elaboración**: Enero 2026  
**Nivel de profundidad**: Técnico/Producción  
**Lenguaje**: Español  

---

## 1. Estado actual de la funcionalidad

### ¿Es beta, experimental o estable?

Python en Pabbly Connect es una funcionalidad **estable** desde hace varios años. Funciona bajo la acción **"Run Python"** dentro del módulo **Code by Pabbly**.

- **Estado**: Producción
- **Anuncio oficial**: Disponible en la documentación oficial de Pabbly desde 2023
- **Soporte**: Documentación limitada; comunidad activa en foros

### Limitaciones conocidas

1. **Documentación incompleta**: La guía oficial no explica claramente cómo mapear inputs desde pasos anteriores hacia variables Python
2. **Sin librerías externas**: Solo se pueden usar módulos de la librería estándar de Python + `requests`
3. **Sin acceso a filesystem**: Está prohibido acceder al sistema de archivos
4. **Sin ejecución dinámica**: Funciones `exec()` y `eval()` están bloqueadas
5. **Restricción de módulos**: Los módulos `sys`, `os` y `subprocess` están explícitamente bloqueados
6. **Timeout estricto**: Máximo 25 segundos de ejecución
7. **Memoria limitada**: Máximo 128 MB de uso de memoria

### Diferencias respecto a JavaScript en Pabbly

| Aspecto | Python 3.9 | JavaScript (Node.js 18.x) |
|---------|-----------|--------------------------|
| **Pre-importados** | `requests`, `json`, `math`, `logging` | `CryptoJS`, `_` (Lodash), `moment` |
| **Librerías disponibles** | Stdlib completo + requests | AWS SDK v3, librerías npm |
| **Timeout** | 25 segundos | 25 segundos |
| **Memoria** | 128 MB | 128 MB |
| **Operaciones FS** | Bloqueadas | Bloqueadas |
| **Variables pre-declaradas** | `output`, `logger` | `output` |
| **Métodos de logging** | `print()`, `logger.info/debug/warning/error` | `console.log/error/warn/debug` |

---

## 2. Entorno de ejecución Python

### Versión exacta de Python

**Python 3.9** (confirmado en documentación oficial de Pabbly)

```bash
# Verificar versión en Pabbly
import sys
print(sys.version)  # Salida esperada: 3.9.x
```

### Librerías estándar disponibles

Todas las librerías estándar de Python 3.9 están disponibles, incluyendo:

- `datetime`, `time`, `calendar` (manipulación de fechas/horas)
- `json` (ya importado, no requiere import)
- `math` (ya importado, no requiere import)
- `re` (expresiones regulares)
- `hashlib` (hashing criptográfico)
- `hmac` (HMAC para autenticación)
- `base64` (codificación/decodificación)
- `urllib.parse` (parseo de URLs)
- `random`, `secrets` (generación de números aleatorios)
- `itertools`, `functools` (utilidades funcionales)
- `collections` (estructuras de datos especializadas)
- `decimal`, `fractions` (aritmética de precisión)

### Librerías pre-importadas (sin necesidad de import)

```python
# Ya disponibles globalmente - NO requieren import
import requests   # Para HTTP requests
import json       # Para manipulación de JSON
import math       # Para operaciones matemáticas
import logging    # Para logging

# Logger pre-configurado
logger = logging.getLogger('code')
```

### Librerías NOT permitidas

Estas están **explícitamente bloqueadas**:

- `sys` (acceso a variables del sistema)
- `os` (acceso al sistema de archivos y variables de entorno)
- `subprocess` (ejecución de procesos externos)

### Funciones bloqueadas

Aunque no hay error inmediato, estas funciones están deshabilitadas:

- `exec()` - no se puede ejecutar código dinámico
- `eval()` - no se puede evaluar strings como código
- **Operaciones de filesystem**: `open()`, `read()`, `write()`, etc.

### Límites de tiempo, memoria y ejecución

| Límite | Valor |
|--------|-------|
| **Tiempo máximo de ejecución** | 25 segundos |
| **Memoria máxima** | 128 MB |
| **Acceso a red** | ✅ Permitido (via `requests`) |
| **Salida en logs** | ✅ Permitido (via `print()` y `logger`) |

**Nota**: Si tu script excede estos límites, será abortado automáticamente sin notificación de error clara.

### Acceso a red (HTTP requests permitidas)

**SÍ, está permitido**.

Pabbly proporciona el módulo `requests` pre-importado para hacer peticiones HTTP:

```python
# GET request
response = requests.get('https://api.ejemplo.com/datos')

# POST request
response = requests.post(
    'https://api.ejemplo.com/crear',
    json={'campo': 'valor'},
    headers={'Authorization': 'Bearer token_aqui'}
)

# Siempre validar respuesta
response.raise_for_status()  # Lanza excepción si status != 2xx
```

---

## 3. Inputs en Python (MUY IMPORTANTE)

### Cómo recibe datos un script Python desde pasos anteriores

**HALLAZGO CRÍTICO**: NO existe una variable `input_data` accesible directamente en Python en Pabbly Connect.

La forma correcta de recibir datos es:

1. **En la UI de Pabbly**, en el paso "Run Python", despliega la sección **"Input"**
2. **Haz clic en "Add Field"** para crear campos de entrada
3. **Mapea datos** de pasos anteriores a esos campos Input
4. **Los datos mapeados se inyectan automáticamente como variables nombradas** en tu código

### Ejemplo de mapeo de inputs

Supongamos que necesitas recibir `email` y `nombre` de un paso anterior:

**En la UI (configuración del paso Python):**
```
Input Section:
  - Campo 1: email          → Mapear desde: [Paso anterior - email_field]
  - Campo 2: nombre         → Mapear desde: [Paso anterior - nombre_field]
```

**En tu código Python:**
```python
# Las variables están disponibles automáticamente
# NO uses input_data["email"], simplemente usa:

email = email  # Variable inyectada automáticamente
nombre = nombre  # Variable inyectada automáticamente

# Procesar datos
resultado = {
    "email_procesado": email.lower().strip(),
    "nombre_procesado": nombre.upper()
}

return resultado
```

### Cómo funciona el Iterator con Python

El Iterator de Pabbly **extrae filas de arrays** y las procesa una a una. Cada fila se expone como un objeto individual a los pasos posteriores (incluyendo Code steps).

**Flujo:**
1. Un paso anterior retorna un array de objetos: `[{id:1, nombre:"A"}, {id:2, nombre:"B"}]`
2. El Iterator **descompone** el array
3. Para **CADA elemento**, los pasos posteriores (incluyendo Python) se ejecutan
4. Los datos del elemento se mapean automáticamente

**Ejemplo con Iterator + Python:**

```python
# Primer elemento: {id: 1, nombre: "Alice"}
# Segundo elemento: {id: 2, nombre: "Bob"}
# Dentro del Iterator, cada ejecución recibe UN elemento

# En tu código Python (ejecutado para CADA fila):
elemento_id = elemento_id  # Ej: 1 (primera ejecución), 2 (segunda)
elemento_nombre = elemento_nombre  # Ej: "Alice", luego "Bob"

resultado = {
    "procesado": f"{elemento_id}-{elemento_nombre}",
    "timestamp": str(datetime.datetime.now())
}

return resultado
```

### Variables disponibles (equivalente a inputData en JS)

**NO hay una variable `inputData` global en Python.**

Las variables disponibles automáticamente son:

| Variable | Descripción |
|----------|-------------|
| `output` | Variable predefinida para retornar resultados |
| `logger` | Logger pre-configurado con ID='code' |
| **[Tus campos Input mapeados]** | Cada campo que mapees en la sección "Input" |

### Errores comunes de mapeo

❌ **INCORRECTO:**
```python
# NO funciona en Python
email = input_data["email_field"]  # input_data no existe
```

✅ **CORRECTO:**
```python
# Mapea en la UI y usa directamente
email = email  # Si mapeaste un campo llamado "email" en Input
```

❌ **INCORRECTO:**
```python
# No intentes acceder a respuestas de pasos anteriores directamente
nombre = step_1.response["nombre"]  # Esto NO funciona
```

✅ **CORRECTO:**
```python
# Mapea en la sección Input del paso Python
# En Input: Campo "nombre" → [Paso anterior - campo_nombre]
nombre = nombre  # Ya está disponible
```

### Ejemplos reales de input correcto

**Ejemplo 1: Recibir datos de Google Sheets**

```
Trigger: Google Sheets → New Row
    Response: {email: "user@example.com", estado: "activo"}

↓

Code by Pabbly (Run Python)
    Input Section:
      - Field "email" → Map from: [Trigger - email]
      - Field "estado" → Map from: [Trigger - estado]
    
    Code:
    email = email
    estado = estado
    
    resultado = {
        "es_activo": estado == "activo",
        "email_lowercase": email.lower()
    }
    return resultado
```

**Ejemplo 2: Recibir datos de API**

```
API by Pabbly → GET request
    Response: {usuarios: [{id: 1, name: "Juan"}, ...]}

↓

Iterator → Over: [API response - usuarios]

↓

Code by Pabbly (Run Python) - Ejecutado POR CADA usuario
    Input Section:
      - Field "user_id" → Map from: [Iterator - id]
      - Field "user_name" → Map from: [Iterator - name]
    
    Code:
    user_id = user_id
    user_name = user_name
    
    return {
        "id": user_id,
        "slug": user_name.lower().replace(" ", "-")
    }
```

---

## 4. Outputs esperados

### Formato de retorno válido

Python acepta **cualquier tipo JSON-serializable** como return:

```python
# ✅ Válidos:
return {"clave": "valor"}  # Diccionario
return ["item1", "item2"]  # Array/List
return "texto simple"      # String
return 123                 # Número
return True                # Boolean
return None                # Null (devuelve null)

# ❌ Inválidos (causarán error):
return {"fecha": datetime.now()}  # datetime no es serializable
return lambda x: x**2            # Funciones no son serializables
return set([1,2,3])              # Sets no son serializables
```

### Cómo devolver múltiples campos

```python
# Opción 1: Diccionario (RECOMENDADO)
return {
    "email": "user@example.com",
    "estado": "procesado",
    "timestamp": "2026-01-27T12:34:56"
}

# Opción 2: Array de objetos
return [
    {"id": 1, "nombre": "Juan"},
    {"id": 2, "nombre": "María"}
]

# Opción 3: Objeto anidado
return {
    "usuario": {
        "email": "user@example.com",
        "perfil": {
            "nombre": "Juan",
            "edad": 30
        }
    },
    "estadisticas": {
        "logins": 5,
        "ultima_actividad": "2026-01-27"
    }
}
```

### Diferencia entre Simple / Advanced / Raw

En la configuración de Pabbly, hay tres opciones para el tipo de respuesta:

| Tipo | Descripción | Cuándo usar |
|------|-------------|-----------|
| **Simple** | Intenta simplificar arrays en objetos individuales | Cuando retornas objetos simples |
| **Advanced** | Mantiene la estructura exacta (arrays como arrays) | Cuando retornas arrays o estructuras complejas |
| **Raw** | Retorna la respuesta exacta sin procesar | Para casos especiales o debugging |

**Recomendación:** Usa **Advanced** para máxima compatibilidad y control.

### Errores comunes al devolver datos

❌ **Incorrecto:**
```python
# No retornar nada - salida será None
return

# Retornar objeto no serializable
import datetime
return {"fecha": datetime.datetime.now()}  # ERROR

# Retornar función/clase
def procesar():
    pass
return procesar  # ERROR
```

✅ **Correcto:**
```python
import datetime

# Convertir datetime a string
timestamp = datetime.datetime.now().isoformat()
return {"fecha": timestamp}

# Serializar complejos manualmente
return {
    "items": [1, 2, 3],
    "metadata": {"count": 3, "timestamp": str(datetime.datetime.now())}
}
```

### Uso de la variable `output`

Alternativa a `return` - útil para composición de lógica:

```python
# Método 1: return (más directo)
resultado = {"campo": "valor"}
return resultado

# Método 2: output (más legible en lógica compleja)
output = {"campo": "valor"}
# El último valor asignado a output se retorna automáticamente

# Método 3: Combinación
try:
    resultado = operacion_peligrosa()
    output = {"exito": True, "datos": resultado}
except Exception as e:
    output = {"exito": False, "error": str(e)}
# output se retorna automáticamente
```

---

## 5. Manejo de errores

### Cómo lanzar errores controlados

```python
# Opción 1: Retornar error en la salida
return {
    "exito": False,
    "error": "El email no es válido",
    "codigo_error": "INVALID_EMAIL"
}

# Opción 2: Lanzar excepción (el workflow se detiene)
raise ValueError("El email no es válido")

# Opción 3: Lanzar excepción personalizada
raise Exception("Error crítico: base de datos no accesible")
```

### Cómo evitar que el workflow se rompa

```python
# ✅ RECOMENDADO: Capturar excepciones y retornar error
try:
    response = requests.post(
        'https://api.ejemplo.com/crear',
        json={"email": email}
    )
    response.raise_for_status()
    return {"exito": True, "datos": response.json()}
except requests.exceptions.Timeout:
    return {"exito": False, "error": "Timeout: la API tardó demasiado"}
except requests.exceptions.ConnectionError as e:
    return {"exito": False, "error": f"Error de conexión: {str(e)}"}
except Exception as e:
    return {"exito": False, "error": f"Error inesperado: {str(e)}"}

# Si necesitas que el workflow se detenga, usa raise:
# raise Exception("Condición crítica no se cumplió")
```

### Patrones de try/except recomendados

**Patrón 1: API calls robusto**

```python
def hacer_api_call(url, datos):
    try:
        response = requests.post(
            url,
            json=datos,
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()  # Lanza error si status >= 400
        return {"exito": True, "datos": response.json()}
    except requests.exceptions.Timeout:
        logger.warning(f"Timeout al llamar {url}")
        return {"exito": False, "error": "Timeout", "codigo": "TIMEOUT"}
    except requests.exceptions.ConnectionError:
        logger.error(f"Error de conexión a {url}")
        return {"exito": False, "error": "Conexión rechazada", "codigo": "CONN_ERROR"}
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP Error: {e.response.status_code}")
        return {"exito": False, "error": f"HTTP {e.response.status_code}", "codigo": "HTTP_ERROR"}
    except Exception as e:
        logger.exception(f"Error inesperado: {str(e)}")
        return {"exito": False, "error": "Error inesperado", "codigo": "UNKNOWN"}

# Usar:
resultado = hacer_api_call("https://api.ejemplo.com/datos", {"id": 123})
if resultado["exito"]:
    return resultado["datos"]
else:
    return resultado  # Incluye detalles del error
```

**Patrón 2: Validación de datos**

```python
def validar_email(email):
    import re
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(patron, email):
        raise ValueError(f"Email inválido: {email}")
    return email.lower()

try:
    email_valido = validar_email(email)
    return {"email": email_valido, "valido": True}
except ValueError as e:
    logger.warning(f"Validación fallida: {str(e)}")
    return {"email": email, "valido": False, "motivo": str(e)}
```

**Patrón 3: Manejo de JSON malformado**

```python
try:
    # Si recibes datos que podrían no ser JSON válido
    if isinstance(datos, str):
        datos = json.loads(datos)
    elif isinstance(datos, dict):
        pass  # Ya es un dict
    else:
        datos = json.loads(json.dumps(datos))
    
    return {"procesado": True, "datos": datos}
except json.JSONDecodeError as e:
    logger.error(f"JSON inválido: {str(e)}")
    return {"procesado": False, "error": "JSON malformado"}
except Exception as e:
    logger.error(f"Error al procesar: {str(e)}")
    return {"procesado": False, "error": "Error inesperado"}
```

---

## 6. Ejemplos prácticos

### Ejemplo 1: Normalización de datos

```python
# Escenario: Normalizar datos de clientes desde Google Sheets
# Input: nombre, email, teléfono
# Output: datos normalizados, validados y listos para Stackby

import re

def limpiar_nombre(nombre):
    """Normalizar nombre: trim, capitalize cada palabra"""
    return ' '.join(word.capitalize() for word in nombre.strip().split())

def validar_email(email):
    """Validar formato de email"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(patron, email.lower()))

def normalizar_telefono(telefono):
    """Normalizar teléfono: remover caracteres especiales, formato estandarizado"""
    # Remover todo excepto dígitos
    solo_digitos = re.sub(r'\D', '', str(telefono))
    
    # Si tiene 10 dígitos (US), formatear como +1-XXX-XXX-XXXX
    if len(solo_digitos) == 10:
        return f"+1-{solo_digitos[0:3]}-{solo_digitos[3:6]}-{solo_digitos[6:]}"
    # Si tiene 11 (US con 1 al inicio)
    elif len(solo_digitos) == 11:
        return f"+{solo_digitos[0]}-{solo_digitos[1:4]}-{solo_digitos[4:7]}-{solo_digitos[7:]}"
    else:
        # Devolver como internacional
        return f"+{solo_digitos}" if solo_digitos else "INVALIDO"

# Recibir datos mapeados en Input (nombreOriginal, emailOriginal, telefonoOriginal)
try:
    nombre_normalizado = limpiar_nombre(nombreOriginal)
    email_normalizado = emailOriginal.lower().strip()
    telefono_normalizado = normalizar_telefono(telefonoOriginal)
    
    # Validar
    if not validar_email(email_normalizado):
        return {
            "exito": False,
            "error": "Email inválido",
            "email_recibido": emailOriginal
        }
    
    return {
        "exito": True,
        "nombre": nombre_normalizado,
        "email": email_normalizado,
        "telefono": telefono_normalizado,
        "timestamp": str(__import__('datetime').datetime.now())
    }
except Exception as e:
    logger.error(f"Error en normalización: {str(e)}")
    return {"exito": False, "error": str(e)}
```

### Ejemplo 2: Validación de campos

```python
# Escenario: Validar un formulario completo antes de guardar en DB
# Input: email, edad, país, contraseña
# Output: validación completa con mensajes de error específicos

import re

def validar_formulario(email, edad, pais, contrasena):
    """Validación completa de un formulario"""
    
    errores = []
    warnings = []
    
    # Validar email
    if not email or not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        errores.append("Email inválido")
    
    # Validar edad
    try:
        edad_int = int(edad)
        if edad_int < 18:
            errores.append("Debe ser mayor de 18 años")
        elif edad_int > 120:
            warnings.append("Edad parece inusual")
    except ValueError:
        errores.append("Edad debe ser un número")
    
    # Validar país (lista de ejemplo)
    paises_validos = ["ES", "PT", "MX", "AR", "CO"]
    if pais.upper() not in paises_validos:
        errores.append(f"País no soportado. Válidos: {', '.join(paises_validos)}")
    
    # Validar contraseña
    if len(str(contrasena)) < 8:
        errores.append("Contraseña debe tener mínimo 8 caracteres")
    
    if not any(c.isupper() for c in str(contrasena)):
        errores.append("Contraseña debe tener al menos 1 mayúscula")
    
    if not any(c.isdigit() for c in str(contrasena)):
        errores.append("Contraseña debe tener al menos 1 número")
    
    # Retornar resultado
    return {
        "valido": len(errores) == 0,
        "errores": errores,
        "warnings": warnings,
        "email": email.lower() if errores == [] else None,
        "pais": pais.upper() if errores == [] else None
    }

# Usar
resultado = validar_formulario(email, edad, pais, contrasena)
return resultado
```

### Ejemplo 3: Generación de claves idempotentes

```python
# Escenario: Generar ID único para una fila (evitar duplicados)
# Input: email, nombre, fecha_creacion
# Output: id_unico (hash SHA256 para idempotencia)

import hashlib
import json

def generar_id_idempotente(email, nombre, fecha):
    """
    Generar ID idempotente (determinista) basado en campos únicos.
    Mismo input = Mismo output (incluso en ejecuciones diferentes)
    """
    # Normalizar inputs
    email_norm = email.lower().strip()
    nombre_norm = nombre.lower().strip()
    fecha_norm = str(fecha).strip()
    
    # Crear string representativo
    datos_para_hash = f"{email_norm}|{nombre_norm}|{fecha_norm}"
    
    # Generar hash SHA256 (determinista)
    hash_objeto = hashlib.sha256(datos_para_hash.encode())
    id_unico = hash_objeto.hexdigest()[:16]  # Primeros 16 caracteres
    
    return id_unico

def generar_id_corto(base_text):
    """Generar ID corto única basado en texto"""
    import time
    timestamp = int(time.time())
    hash_base = hashlib.sha256(base_text.encode()).hexdigest()[:8]
    return f"{hash_base}-{timestamp}"

# Ejemplo 1: ID idempotente (recomendado para evitar duplicados)
id_idempotente = generar_id_idempotente(email, nombre, fecha_signup)

return {
    "id_unico": id_idempotente,
    "email": email.lower(),
    "nombre": nombre,
    "tipo_id": "idempotente"  # Mismo input siempre da mismo ID
}

# Ejemplo 2: ID único con timestamp (para nuevos registros)
id_unico = generar_id_corto(email)

return {
    "id": id_unico,
    "email": email,
    "timestamp": str(__import__('datetime').datetime.now()),
    "tipo_id": "único_con_timestamp"  # Cada ejecución da diferente ID
}
```

### Ejemplo 4: Transformación de filas de Google Sheets

```python
# Escenario: Procesar varias filas de Google Sheets via Iterator
# Input: producto, cantidad, precio_unitario
# Output: fila completa con cálculos, lista para Stackby

import datetime

def procesar_fila_inventario(producto, cantidad, precio_unitario):
    """Procesar una fila de inventario: calcular totales, aplicar impuestos, etc."""
    
    try:
        # Convertir tipos
        cantidad = int(cantidad)
        precio_unitario = float(precio_unitario)
        
        # Validar
        if cantidad <= 0:
            return {
                "exito": False,
                "error": "Cantidad debe ser mayor a 0",
                "producto": producto
            }
        
        if precio_unitario < 0:
            return {
                "exito": False,
                "error": "Precio no puede ser negativo",
                "producto": producto
            }
        
        # Calcular
        subtotal = cantidad * precio_unitario
        impuesto = subtotal * 0.21  # 21% IVA (ejemplo España)
        total = subtotal + impuesto
        costo_promedio = total / cantidad if cantidad > 0 else 0
        
        # Normalizar producto
        producto_slug = producto.lower().replace(" ", "_")
        
        # Resultado
        return {
            "exito": True,
            "producto": producto,
            "producto_slug": producto_slug,
            "cantidad": cantidad,
            "precio_unitario": f"{precio_unitario:.2f}",
            "subtotal": f"{subtotal:.2f}",
            "impuesto_21porciento": f"{impuesto:.2f}",
            "total": f"{total:.2f}",
            "costo_promedio": f"{costo_promedio:.2f}",
            "procesado_en": datetime.datetime.now().isoformat(),
            "estado": "procesado"
        }
    
    except (ValueError, TypeError) as e:
        logger.error(f"Error al procesar fila: {str(e)}")
        return {
            "exito": False,
            "error": "Datos inválidos (cantidad y precio deben ser números)",
            "producto": producto,
            "datos_recibidos": {
                "cantidad": str(cantidad),
                "precio": str(precio_unitario)
            }
        }
    except Exception as e:
        logger.exception(f"Error inesperado: {str(e)}")
        return {
            "exito": False,
            "error": "Error inesperado al procesar",
            "producto": producto
        }

# Usar dentro de Iterator (ejecutado por cada fila):
return procesar_fila_inventario(producto, cantidad, precio_unitario)
```

### Ejemplo 5: Preparación de payloads para APIs (ej. Stackby)

```python
# Escenario: Transformar datos de Google Sheets en payload para Stackby API
# Input: id_cliente, nombre_completo, email, telefono, estado
# Output: JSON formateado para POST a Stackby

import json
import datetime

def preparar_payload_stackby(id_cliente, nombre_completo, email, telefono, estado):
    """
    Transformar datos brutos en payload optimizado para Stackby.
    Stackby espera cierto formato en sus requests.
    """
    
    # Normalizar estado
    estados_validos = ["activo", "inactivo", "pendiente"]
    estado_normalizado = estado.lower() if estado.lower() in estados_validos else "pendiente"
    
    # Crear payload
    payload = {
        "Tabla_ID": id_cliente,  # Nombre de campo en Stackby
        "Nombre": nombre_completo.title(),  # Title case
        "Email": email.lower().strip(),
        "Telefono": telefono.strip(),
        "Estado": estado_normalizado,
        "Fecha_Registro": datetime.datetime.now().isoformat(),
        "Fuente": "google_sheets",
        "Procesado": True
    }
    
    # Validar que no hay campos vacíos críticos
    campos_requeridos = ["Nombre", "Email", "Estado"]
    campos_vacios = [c for c in campos_requeridos if not payload.get(c)]
    
    if campos_vacios:
        return {
            "exito": False,
            "error": f"Campos requeridos vacíos: {', '.join(campos_vacios)}",
            "payload": None
        }
    
    return {
        "exito": True,
        "payload": payload,
        "payload_json": json.dumps(payload),  # Para visualización/debug
        "fecha_preparacion": datetime.datetime.now().isoformat()
    }

# Usar:
resultado = preparar_payload_stackby(
    id_cliente,
    nombre_completo,
    email,
    telefono,
    estado
)

if resultado["exito"]:
    return resultado["payload"]  # Retornar para next step (Stackby action)
else:
    return resultado  # Error
```

---

## 7. Comparativa Python vs JavaScript en Pabbly

### Cuándo usar Python

✅ **Usa Python cuando:**

- Necesites **lógica de transformación compleja** (regexes, validaciones múltiples)
- Debas **calcular valores** (matemáticas, estadísticas)
- Requieras **APIs calls complejas** con reintentos y manejo sofisticado de errores
- Necesites **manipulación de strings** intensiva
- Hagas **criptografía** (hashes, HMAC, codificación)
- El equipo tenga más experiencia en Python que JavaScript
- Necesites **reproducibilidad**: Python suele ser más predecible

**Casos de uso:**
```
- Normalización de datos
- Validación de múltiples campos
- Generación de claves/hashes
- Transformación de formatos (XML, CSV, JSON)
- Consultas a bases de datos via API
```

### Cuándo NO usar Python

❌ **NO uses Python cuando:**

- Necesites manipulación de **fechas complejas** (mejor moment.js)
- Requieras **criptografía avanzada** (mejor CryptoJS)
- Necesites **filtrado de arrays complejos** (mejor Lodash)
- Sea solo una **transformación simple** (usa Text Formatter de Pabbly)
- Necesites **máximo rendimiento** (JavaScript es más rápido en algunos casos)

### Rendimiento

| Operación | Python | JavaScript | Ganador |
|-----------|--------|-----------|---------|
| String manipulation | Muy rápido | Rápido | Python |
| Arrays grandes (>1000) | Rápido | Muy rápido | JavaScript |
| Regex complejas | Muy rápido | Rápido | Python |
| JSON parsing | Rápido | Muy rápido | JavaScript |
| Operaciones matemáticas | Muy rápido | Rápido | Python |
| API calls | Igual | Igual | Empate |
| **Veredicto general** | **Producción** | **Prototipos** | **Python** |

### Mantenibilidad

| Aspecto | Python | JavaScript | Ganador |
|---------|--------|-----------|---------|
| Legibilidad | Excelente | Buena | Python |
| Debugging | Excelente (logger) | Bueno (console) | Python |
| Librerías | Vasta stdlib | npm (limitadas) | Python |
| Tipado | Dinámico | Dinámico | Empate |
| Documentación | Abundante | Moderada | Python |
| Curva aprendizaje | Media | Media | Empate |

### Encaje con Claude Code

**Claude Code** generará automáticamente código para ti en ambos lenguajes.

**Recomendación para Claude:**

```
Usa Python para:
1. Lógica de transformación de datos
2. Validaciones complejas
3. Operaciones matemáticas
4. Hashing/criptografía

Usa JavaScript para:
1. Fechas complejas (usa moment)
2. Filtrado de arrays grandes
3. Cuando necesites librerías npm específicas
```

---

## 8. Buenas prácticas recomendadas

### Estilo de código

```python
# ✅ RECOMENDADO: PEP 8 compatible

import re
import json
import hashlib
import datetime

def validar_email(email: str) -> bool:
    """Documentar qué hace, inputs, outputs"""
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(patron, email))

def procesar_datos(datos: dict, modo: str = "normal") -> dict:
    """
    Procesar datos según modo especificado.
    
    Args:
        datos: Dict con los datos a procesar
        modo: "normal" o "estricto"
    
    Returns:
        Dict con resultado
    """
    try:
        resultado = {}
        # Lógica
        return {"exito": True, "resultado": resultado}
    except Exception as e:
        logger.error(f"Error en procesar_datos: {str(e)}")
        return {"exito": False, "error": str(e)}

# Usar
resultado = procesar_datos({"campo": "valor"}, modo="normal")
return resultado

# ❌ MAL: Sin estructura, nombres poco claros, sin documentación
def f(d):
    x = d['a']
    y = d['b']
    z = x + y
    return z
```

### Naming conventions

```python
# ✅ RECOMENDADO

# Variables: snake_case
email_usuario = "user@example.com"
fecha_creacion = "2026-01-27"
es_activo = True

# Constantes: UPPER_SNAKE_CASE
TIMEOUT_SEGUNDOS = 30
PAISES_SOPORTADOS = ["ES", "PT"]
MAX_REINTENTOS = 3

# Funciones: snake_case
def validar_email(email):
    pass

def obtener_datos_usuario(user_id):
    pass

# Clases (si las usas): PascalCase
class UsuarioValidator:
    pass

# Métodos: snake_case
class Procesador:
    def procesar_fila(self, fila):
        pass
```

### Versionado de scripts

**Estrategia recomendada:**

1. Mantén tus scripts en **GitHub** (repositorio privado o público)
2. Crea una rama para **cada script**: `script/validacion-emails`, `script/normalizacion-datos`
3. **Documenta versiones** en comentarios:

```python
"""
Script: Normalización de datos de clientes
Versión: 1.2
Autor: Tu nombre
Fecha: 2026-01-27
Cambios en v1.2:
  - Añadido soporte para teléfonos internacionales
  - Mejorado manejo de errores
Cambios en v1.1:
  - Normalización de nombres mejorada
  - Añadido logging
"""

__version__ = "1.2"
__author__ = "tu_nombre"
__date__ = "2026-01-27"
```

4. **Commit message claro:**
```
feat: añadir soporte para números internacionales

- Detectar código de país
- Formatear según estándar E.164
- Incluir validación mejorada
```

### Qué NO hacer en Python en Pabbly

❌ **NUNCA:**

```python
# NO: Importar módulos bloqueados
import os  # Bloqueado
import sys  # Bloqueado
import subprocess  # Bloqueado

# NO: Usar eval/exec
eval("return email")  # Bloqueado
exec("output = {'result': 'value'}")  # Bloqueado

# NO: Operaciones de filesystem
with open("archivo.txt", "w") as f:  # Bloqueado
    f.write("datos")

# NO: Lógica que tarda > 25 segundos
import time
time.sleep(30)  # Script será abortado

# NO: Consumir > 128 MB
lista_gigante = [i for i in range(100_000_000)]  # OOM

# NO: Hardcodear credenciales
api_key = "sk-1234567890abcdef"  # INSEGURO
email_cuenta = "mi_email@gmail.com"  # INSEGURO

# NO: Confiar en módulos no estándar
import pandas  # No disponible
import requests_retry  # No disponible (solo requests)

# NO: Asumir variables que no existen
print(input_data["campo"])  # input_data NO existe en Python
```

---

## 9. Integración con repositorios Git

### Cómo versionar scripts Python usados en Pabbly

**Estructura recomendada:**

```
automation-brain/
├── README.md
├── scripts/
│   ├── python/
│   │   ├── normalizacion/
│   │   │   ├── __init__.py
│   │   │   ├── normalizar_emails.py
│   │   │   ├── normalizar_telefonos.py
│   │   │   └── README.md
│   │   ├── validacion/
│   │   │   ├── validar_formularios.py
│   │   │   ├── validar_campos_stackby.py
│   │   │   └── README.md
│   │   └── transformacion/
│   │       ├── google_sheets_a_stackby.py
│   │       └── preparar_payloads_api.py
│   └── javascript/
│       └── [scripts JavaScript...]
├── tests/
│   └── test_python_scripts.py
└── docs/
    └── guia_scripts.md
```

### Cómo copiarlos/pegarlos desde VS Code

**Workflow recomendado:**

1. **En VS Code**, abre el archivo del script Python
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. **En Pabbly Connect**, ve al paso "Run Python"
4. **Pega en el campo de código** (Ctrl+V)
5. **Configura los Inputs** en la sección Input
6. **Prueba con "Save and Test Request"**

### Cómo documentarlos para que Claude Code los entienda

**Template de documentación:**

```python
"""
================================================================================
SCRIPT: [Nombre del script]
================================================================================

DESCRIPCIÓN:
Explica qué hace el script en 2-3 líneas claras.

INPUTS (Mapear en Pabbly):
  - campo_1 (string): Descripción
  - campo_2 (int): Descripción
  - campo_3 (bool, opcional): Descripción

OUTPUT ESPERADO:
  {
    "exito": bool,
    "datos": {...},
    "error": string (si exito=False)
  }

DEPENDENCIAS:
  - requests (ya importado en Pabbly)
  - json (ya importado)
  - re (importar)
  - datetime (importar)

LIMITACIONES:
  - Máximo 25 segundos de ejecución
  - Máximo 128 MB de memoria
  - No puede acceder a filesystem

VERSIÓN: 1.0
AUTOR: [Tu nombre]
FECHA: 2026-01-27
ÚLTIMA ACTUALIZACIÓN: 2026-01-27

CAMBIOS RECIENTES:
  v1.0: Versión inicial

EJEMPLOS DE USO:

  Input:
    campo_1: "test@example.com"
    campo_2: "Juan"
  
  Output:
    {
      "exito": true,
      "datos": {"email_normalizado": "test@example.com", ...}
    }

================================================================================
"""

import re
import json
import datetime

# TU CÓDIGO AQUÍ
```

---

## 10. Checklist para Claude Code

Usa este checklist para validar que Claude Code genere scripts Python compatibles con Pabbly:

### ✅ Antes de generar código

- [ ] He definido claramente los **inputs** (qué datos recibirá)
- [ ] He definido claramente los **outputs** (qué debe retornar)
- [ ] He documentado los **casos de error** esperados
- [ ] Sé qué **transformaciones** necesito
- [ ] Estimé que la lógica cabe en **< 25 segundos**

### ✅ Validación del código generado

- [ ] El script **NO importa `sys`, `os`, o `subprocess`**
- [ ] El script **NO usa `eval()` o `exec()`**
- [ ] El script **NO accede al filesystem** (`open()`, `read()`, etc.)
- [ ] El script **retorna valores JSON-serializables**
- [ ] El script **usa try/except para APIs** y operaciones peligrosas
- [ ] El script **loguea errores** usando `logger.error()` o `print()`
- [ ] El script **NO asume variables globales** que no mapeaste en Input

### ✅ Testeo en Pabbly

- [ ] Configuré correctamente los **campos Input** en Pabbly
- [ ] Mapeé **datos de pasos anteriores** a esos campos Input
- [ ] El script funciona con el botón **"Save and Test Request"**
- [ ] La **salida es válida JSON** (verifica en Response)
- [ ] Los **logs aparecen** en la sección Logs (si usaste `logger`)
- [ ] Testeé con **múltiples valores** (casos normales y edge cases)

### ✅ Integración en workflow

- [ ] El script está en **Git** con documentación
- [ ] La **estructura es clara** (funciones, nombres, comentarios)
- [ ] Los **errores son manejados** apropiadamente
- [ ] El **rendimiento es aceptable** (< 10 segundos en promedio)
- [ ] Documenté qué **pasos anteriores** alimentan el script
- [ ] Documenté qué **pasos posteriores** usan la salida

### ✅ Ejemplo completo validado

```python
"""
Script: Validación y normalización de emails para Stackby
Versión: 1.0
"""

import re
import json

def validar_y_normalizar_email(email_bruto):
    """Validar y normalizar email"""
    
    try:
        # Normalizar
        email = email_bruto.lower().strip()
        
        # Validar formato
        patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(patron, email):
            return {
                "exito": False,
                "error": "Email inválido",
                "email_original": email_bruto
            }
        
        # Retornar éxito
        return {
            "exito": True,
            "email_normalizado": email,
            "dominio": email.split('@')[1],
            "usuario": email.split('@')[0]
        }
    
    except Exception as e:
        logger.error(f"Error al procesar email: {str(e)}")
        return {
            "exito": False,
            "error": f"Error inesperado: {str(e)}",
            "email_original": str(email_bruto)
        }

# ENTRADA: emailInput (mapeado en Pabbly)
# VALIDACIÓN:
resultado = validar_y_normalizar_email(emailInput)

# SALIDA:
return resultado

# VERIFICACIÓN DEL CHECKLIST:
# ✅ NO usa sys, os, subprocess
# ✅ NO usa eval/exec
# ✅ NO accede filesystem
# ✅ Retorna dict (JSON-serializable)
# ✅ Maneja errores con try/except
# ✅ Loguea con logger.error()
# ✅ Variables inyectadas: emailInput
```

---

## RESUMEN EJECUTIVO

| Concepto | Detalles |
|----------|----------|
| **Versión** | Python 3.9 |
| **Timeout** | 25 segundos máx. |
| **Memoria** | 128 MB máx. |
| **Pre-importados** | `requests`, `json`, `math`, `logging` |
| **Bloqueados** | `sys`, `os`, `subprocess`, `eval()`, `exec()`, filesystem |
| **Retorno** | `return` o variable `output` (debe ser JSON-serializable) |
| **Inputs** | Se mapean en sección "Input" de Pabbly (NO `input_data`) |
| **Outputs** | Diccionarios, arrays, strings, números, booleanos |
| **Errores** | Try/except recomendado; lanzar `Exception()` para detener |
| **Logging** | `print()` o `logger.info/debug/warning/error()` |
| **Casos de uso** | Transformación de datos, validación, hashing, API calls |
| **Recomendación** | Úsalo para lógica compleja; usa Text Formatter para lo simple |

---

## RECURSOS ADICIONALES

### Documentación Oficial
- [Pabbly Connect - Documentación Python](https://forum.pabbly.com/threads/python-code-by-pabbly.12014/)
- [Pabbly Connect - Integrations](https://www.pabbly.com/connect/)
- [Python 3.9 Docs](https://docs.python.org/3.9/)

### Herramientas Recomendadas
- **VS Code**: Editor para desarrollar scripts
- **GitHub**: Versionado de código
- **Claude Code**: Generación automática de scripts
- **Mendeley/Endnote**: Gestión de referencias

### Comunidad
- Foro Pabbly: forum.pabbly.com
- Stack Overflow: [tag] pabbly-connect
- Reddit: r/automation

---

**Última actualización**: Enero 2026  
**Mantener actualizado**: Revisar cambios mensuales en documentación oficial Pabbly