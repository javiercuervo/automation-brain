# PABBLY CONNECT: Guía Completa de Sintaxis y Tokens

**Fecha de última verificación:** 27 de enero de 2026  
**Fuentes:** Documentación oficial de Pabbly Connect y tutoriales autorizados

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Nomenclatura de Pasos y Referencias](#nomenclatura-de-pasos-y-referencias)
3. [Formato de Tokens y Variables](#formato-de-tokens-y-variables)
4. [Webhooks: Formatos de Envío](#webhooks-formatos-de-envío)
5. [Representación de Archivos y URLs](#representación-de-archivos-y-urls)
6. [Referencia a Datos de Pasos Previos](#referencia-a-datos-de-pasos-previos)
7. [Caracteres Especiales y Escape](#caracteres-especiales-y-escape)
8. [Iteradores y Arrays](#iteradores-y-arrays)
9. [Variables de Entorno, Secrets y Headers](#variables-de-entorno-secrets-y-headers)
10. [Formatos de Respuesta HTTP](#formatos-de-respuesta-http)
11. [Errores Comunes](#errores-comunes)
12. [Ejemplos de Código Listos para Usar](#ejemplos-de-código-listos-para-usar)
13. [Checklist de Integración](#checklist-de-integración)

---

## Introducción

Pabbly Connect es una plataforma de automatización que permite integrar múltiples aplicaciones mediante webhooks, acciones HTTP y scripts. Esta guía documenta la sintaxis exacta para trabajar con **tokens de variables**, **referencias de pasos**, **scripts** y **webhooks** desde la perspectiva de quien consume y mapea datos en Pabbly.

---

## Nomenclatura de Pasos y Referencias

### Estructura de Nombres de Pasos

En Pabbly Connect, cada paso tiene un número secuencial y un nombre descriptivo:

```
1. Webhook
2. Correo Electrónico
3. Validación de Datos
4. Crear Contacto
```

### Cómo Referenciar Pasos

Para referenciar un paso dentro del editor de Pabbly, utiliza el **número del paso** precedido del símbolo de almohadilla `#`:

| Contexto | Sintaxis | Ejemplo |
|----------|----------|---------|
| En campos de mapeo (UI) | `Selecciona en dropdown` | Selecciona "2. Correo Electrónico" del dropdown |
| En Code by Pabbly (JavaScript) | `data['paso']` | `data['Correo Electrónico']` |
| En filtros y condiciones | `Selecciona en dropdown` | Condición: "2. Validación" existe |
| En parámetros de URL API | `{{variable}}` | `https://api.ejemplo.com?email={{email}}` |

**Nota importante:** Pabbly diferencia entre **nombrado en la interfaz** (dropdown) y **acceso en código** (JavaScript). Los nombres con números, espacios y caracteres especiales se manejan de forma diferente según el contexto.

---

## Formato de Tokens y Variables

### Convención de Tokens en Pabbly

Los tokens (valores de salida de un paso) se presentan en dos contextos principales:

#### 1. En la Interfaz de Mapeo (Response/Output)

Cuando Pabbly captura datos de un webhook o acción previa, la salida aparece estructurada:

```json
{
  "3. Nombre": "Juan García",
  "3. Email": "juan@ejemplo.com",
  "3. Fecha De Nacimiento: Date: 07 Jul, 2004": "2004-07-07",
  "3. Teléfono": "+34 912 345 678",
  "2. Respuesta API: JSON": {...},
  "4. ID Generado: Number": 12345
}
```

#### 2. En Code by Pabbly (JavaScript)

Los tokens se acceden como propiedades del objeto `data`:

```javascript
// Acceso a valores simples
let nombre = data['3. Nombre'];
let email = data['3. Email'];

// Acceso con caracteres especiales
let telefono = data['3. Teléfono'];  // espacio y acento
let fecha = data['3. Fecha De Nacimiento: Date: 07 Jul, 2004'];  // dos puntos y espacios
```

### Tipos de Tokens y Formatos

| Tipo | Formato en UI | Formato en JSON | Acceso en JS |
|------|---------------|-----------------|--------------|
| Texto simple | `Nombre` | `"Nombre": "Juan"` | `data['Nombre']` |
| Número | `3. Edad: Number` | `"3. Edad: Number": 30` | `data['3. Edad: Number']` |
| Fecha | `3. Fecha: Date: 07 Jul, 2004` | `"3. Fecha: Date: 07 Jul, 2004": "2004-07-07"` | `data['3. Fecha: Date: 07 Jul, 2004']` |
| Array/Lista | `Items (array)` | `"Items": [{...}, {...}]` | `data['Items']` - es un array |
| Objeto JSON | `Respuesta API (JSON)` | `"Respuesta API": {...}` | `data['Respuesta API']` |
| URL de archivo | `Documento: File URL` | `"Documento: File URL": "https://..."` | `data['Documento: File URL']` |

### Nomenclatura de Campos con Números

Cuando un campo de formulario incluye un número, Pabbly añade el prefijo del número de paso:

| Campo Original | Nombre en Pabbly | Acceso |
|---|---|---|
| `email` | `2. email` | `data['2. email']` |
| `3. Nombre` | `3. 3. Nombre` (doble prefijo) | Evitar esta redundancia |
| `campo_1` | `3. campo_1` | `data['3. campo_1']` |

**Recomendación:** Evita números al inicio de nombres de campos en formularios originales.

---

## Webhooks: Formatos de Envío

### Tipos de Content-Type Soportados

Pabbly puede recibir webhooks en dos formatos principales:

#### 1. `application/json`

**Formato de envío:**
```bash
curl -X POST https://webhook.pabbly.com/xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@ejemplo.com",
    "nombre": "Juan García",
    "edad": 30,
    "subscrito": true
  }'
```

**Cómo aparece en Pabbly:**
```
Respuesta Webhook:
- email: user@ejemplo.com
- nombre: Juan García
- edad: 30
- subscrito: true
```

**Acceso en Code by Pabbly:**
```javascript
let email = data['email'];
let nombre = data['nombre'];
```

#### 2. `multipart/form-data`

**Formato de envío (con archivo):**
```bash
curl -X POST https://webhook.pabbly.com/xxxxx \
  -H "Content-Type: multipart/form-data; boundary=----WebKitFormBoundary" \
  -F "nombre=Juan García" \
  -F "email=user@ejemplo.com" \
  -F "archivo=@/ruta/documento.pdf" \
  -F "edad=30"
```

**Estructura interna con boundary:**
```
----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="nombre"

Juan García
----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="email"

user@ejemplo.com
----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="archivo"; filename="documento.pdf"
Content-Type: application/pdf

[contenido binario del archivo]
----WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Cómo aparece en Pabbly:**
```
Respuesta Webhook:
- nombre: Juan García
- email: user@ejemplo.com
- archivo: https://pabbly-storage.s3.amazonaws.com/xxxxx/documento.pdf
- edad: 30
```

**Nota sobre archivos:** Los archivos se convierten automáticamente a URLs HTTPS accesibles.

### Diferencias en Acceso según Content-Type

| Aspecto | JSON | Multipart/Form-Data |
|--------|------|-------------------|
| **Estructura** | Objeto anidado | Campos planos + URLs para archivos |
| **Archivos** | No soportados directamente | Sí, convertidos a URLs |
| **Arrays complejos** | Soportados nativamente | Limitados, mejor usar JSON |
| **Acceso en Pabbly** | `data['email']` | `data['email']` (igual) |
| **Mejor para** | APIs complejas | Formularios HTML, uploads |

---

## Representación de Archivos y URLs

### Cómo Pabbly Maneja Archivos

Cuando un formulario incluye upload de archivos, Pabbly genera una URL HTTPS accesible y de corta duración:

```
Campo original: "Documento" (file input)
Respuesta en Pabbly:
- Documento: File URL: https://pabbly-storage.s3.amazonaws.com/xxxxx-xxxxx/documento.pdf
```

### Estructura de URLs de Archivo

```
https://pabbly-storage.s3.amazonaws.com/[SUBMISSION_ID]/[FILENAME]
```

| Componente | Descripción | Ejemplo |
|-----------|-----------|---------|
| `[SUBMISSION_ID]` | ID único de la respuesta del formulario | `5f8a9c7b-d4e2-11eb-8f...` |
| `[FILENAME]` | Nombre del archivo original | `CV_Juan_Garcia.pdf` |

### Campos fileRef vs submissionId

En formularios Pabbly Form Builder:

```json
{
  "submissionId": "5f8a9c7b-d4e2-11eb-8f9c...",
  "Documento: File URL": "https://pabbly-storage.s3.amazonaws.com/5f8a9c7b-d4e2-11eb-8f9c.../documento.pdf",
  "Foto: File URL": "https://pabbly-storage.s3.amazonaws.com/5f8a9c7b-d4e2-11eb-8f9c.../foto.jpg"
}
```

**Nota:** No aparecen campos `fileRef` explícitos; Pabbly normaliza todas las referencias de archivo a URLs HTTPS directas.

### Cómo Usar URLs de Archivo

Para mapear una URL de archivo a otra acción (ej. subir a Google Drive):

1. **En el campo "URL" de acción "Subir archivo":**
   ```
   Selecciona: 1. Documento: File URL
   ```

2. **En Code by Pabbly:**
   ```javascript
   let urlArchivo = data['Documento: File URL'];
   // urlArchivo = "https://pabbly-storage.s3.amazonaws.com/.../documento.pdf"
   ```

3. **En parámetros API:**
   ```
   {{Documento: File URL}}
   ```

---

## Referencia a Datos de Pasos Previos

### Sintaxis Exacta según Contexto

#### Contexto 1: Campos de Mapeo (Interfaz de usuario)

Cuando haces clic en un campo de entrada, Pabbly abre un dropdown con todos los datos disponibles. **No necesitas escribir nada; solo selecciona:**

```
Campo: [ Nombre ]
Haz clic en dropdown → Selecciona "2. Correo Electrónico" de la lista
```

#### Contexto 2: URL API con Parámetros Dinámicos

Usa **doble llave** `{{` y `}}`:

```
Endpoint URL:
https://api.ejemplo.com/usuarios?email={{email}}&nombre={{nombre}}

En Code by Pabbly, mapea primero los parámetros en "Set Parameters":
Parámetro: email
Valor: [Selecciona del dropdown "1. email"]
```

**Importante:** No escribas `{{email}}` directamente en la URL. En su lugar:
1. Añade la variable en **Set Parameters** con clave y valor
2. Pabbly construye la URL automáticamente

#### Contexto 3: Body JSON en Acción API

```json
{
  "email": {{email_field}},
  "nombre": {{nombre_field}},
  "edad": {{edad_field}}
}
```

**Problema:** Esto puede causar error si los nombres tienen espacios o caracteres especiales.

**Solución (recomendada):**
1. No edites el JSON directamente
2. Usa **Set Parameters** en la interfaz
3. Deja que Pabbly construya el JSON

#### Contexto 4: Code by Pabbly (JavaScript)

```javascript
// Los datos de pasos previos están en el objeto 'data'
let email = data['1. email'];
let nombre = data['2. Nombre Completo'];

// Para campos con espacios y caracteres especiales:
let fecha = data['3. Fecha De Nacimiento: Date: 07 Jul, 2004'];

// Acceso anidado (si la salida anterior fue JSON):
let usuarioId = data['4. Respuesta API']['usuario']['id'];
```

### Ejemplo Completo: Referencia Multi-Paso

```
Paso 1: Webhook (captura datos del formulario)
  Salida:
  - nombre: Juan García
  - email: juan@ejemplo.com
  - edad: 30

Paso 2: Validación de Datos (filtra si edad > 18)
  Acceso en condición:
  - Selecciona "1. edad" > 18

Paso 3: Code by Pabbly (transforma datos)
  JavaScript:
  let { nombre, email, edad } = data;
  output = {
    nombre_upper: nombre.toUpperCase(),
    usuario_id: `${nombre}_${Date.now()}`
  };

Paso 4: Crear Contacto en CRM
  Mapeo:
  - Email: [Selecciona "1. email"]
  - Nombre: [Selecciona "3. nombre_upper" de Code output]
  - ID Interno: [Selecciona "3. usuario_id"]
```

---

## Caracteres Especiales y Escape

### Cómo Pabbly Maneja Caracteres Especiales

Pabbly **NO requiere escape manual** en la mayoría de casos. Sin embargo, hay matices según el contexto.

#### 1. En Nombres de Campos (Webhook Input)

| Carácter | Nombre Original | Nombre en Pabbly | Acceso en JS |
|----------|---|---|---|
| Espacio | `Nombre Completo` | `3. Nombre Completo` | `data['3. Nombre Completo']` |
| Acento | `Año` | `3. Año` | `data['3. Año']` |
| Ñ | `Teléfono` | `3. Teléfono` | `data['3. Teléfono']` |
| Dos puntos | `Fecha: ISO` | `3. Fecha: ISO` | `data['3. Fecha: ISO']` |
| Guión | `Fecha-Nac` | `3. Fecha-Nac` | `data['3. Fecha-Nac']` |
| Interrogación | `¿Confirma?` | `3. ¿Confirma?` | `data['3. ¿Confirma?']` |
| Paréntesis | `Edad (años)` | `3. Edad (años)` | `data['3. Edad (años)']` |

**Regla general:** Usa comillas simples o dobles al acceder:
```javascript
let confirma = data['3. ¿Confirma?'];  // Correcto
let edad = data['3. Edad (años)'];      // Correcto
let telefono = data["3. Teléfono"];     // También correcto
```

#### 2. En URL de Parámetros

Si un nombre tiene espacios, Pabbly **URL-encoda automáticamente**:

```
Campo: "Fecha Nacimiento"

En URL: ?fecha_nacimiento=valor  (Pabbly normaliza a snake_case)
O mapea en Set Parameters y Pabbly lo maneja
```

#### 3. En Valores JSON

Los valores (no las claves) se escapan automáticamente:

```javascript
// Entrada: nombre = "María \"Pepe\" García"
// En JSON se convierte automáticamente a:
// "nombre": "María \"Pepe\" García"

// En Code by Pabbly puedes acceder directamente:
let nombre = data['1. nombre'];
// nombre = "María \"Pepe\" García"
```

#### 4. En Strings de Code by Pabbly

Para strings con caracteres especiales:
```javascript
// Comillas simples
let msg = 'Mi nombre es "Juan"';

// Comillas dobles
let msg2 = "Mi teléfono es: +34 912 345";

// Template literals (backticks)
let msg3 = `Confirmación: ¿Aceptas los términos?`;

// Escaping si es necesario
let json_str = JSON.stringify({ 
  nombre: 'María', 
  ciudad: 'Córdoba' 
});
// json_str = '{"nombre":"María","ciudad":"Córdoba"}'
```

#### 5. Caracteres Problemáticos (Casos Raros)

| Carácter | Problema | Solución |
|----------|----------|----------|
| `{` o `}` | Puede confundir con variables | Escapa en strings: `"{}".replace(...`  |
| `$` | En template literals: `${}` | Usa comillas simples o doble `\$` |
| `\` | Barra invertida | Doble escape: `\\` |
| Saltos de línea | En JSON | Use `\n` |
| Tabulaciones | En JSON | Use `\t` |

---

## Iteradores y Arrays

### Concepto del Iterator en Pabbly

El **Iterator** divide una colección de datos (array) en valores individuales procesados uno a uno. Es equivalente a un `for loop`.

### Estructura Básica

```
Paso 1: Webhook (recibe array)
  Salida:
  {
    "items": [
      { "producto": "Zapatos", "precio": 50 },
      { "producto": "Calcetines", "precio": 5 },
      { "producto": "Corbata", "precio": 15 }
    ]
  }

Paso 2: Iterator by Pabbly
  Selecciona array a iterar: "1. items"

Paso 3: Crear producto en DB (dentro del iterator)
  Para cada iteración:
  - Nombre: [Selecciona "2. producto"]
  - Precio: [Selecciona "2. precio"]
```

### Cómo Pabbly Nombra Elementos Iterados

#### Formato de Nombres en Iterador

Cuando iteras un array, Pabbly prefija cada elemento iterado:

```
Array original: "1. items"

Dentro del Iterator (Paso 2):
- 2. producto       (elemento de primer nivel)
- 2. precio         (elemento de primer nivel)
- 2. items[0]       (acceso por índice, raramente visible en UI)
```

**En Code by Pabbly dentro del Iterator:**

```javascript
// Los datos del elemento actual están en 'data'
// Pabbly ya itera automáticamente

// Acceso simple (recomendado):
let producto = data['2. producto'];
let precio = data['2. precio'];

// Si el array es anidado:
// Array: { lineas: [ { id: 1, desc: "A" }, { id: 2, desc: "B" } ] }
let id = data['2. lineas[0].id'];        // Acceso a array anidado
let descripcion = data['2. lineas'][0].descripcion;  // O así

// Nota: El acceso exacto depende de la respuesta del webhook
```

#### Acceso a Elementos Específicos

Si necesitas acceder a un elemento concreto del array **sin iterator**:

```javascript
// Mediante Code by Pabbly (sin Iterator):
let primerProducto = data['1. items'][0];  // Primer elemento
let segundoProducto = data['1. items'][1]; // Segundo elemento
let precio_primero = data['1. items'][0].precio;

// Mediante Array Function by Pabbly (acción):
// Selecciona "Get array count" o "Get value from array by index"
```

### Ejemplo Práctico: Iterador con Formulario Repetido

```
Formulario Jotform con "Line Items" (tabla repetida):

Respuesta JSON:
{
  "submissionId": "123",
  "nombre_cliente": "Juan García",
  "lineas": [
    { "producto": "Zapatos", "cantidad": 2, "precio_unitario": 50 },
    { "producto": "Calcetines", "cantidad": 5, "precio_unitario": 5 }
  ]
}

En Pabbly Connect:

Paso 1: Webhook (Jotform)
  Salida disponible:
  - nombre_cliente
  - lineas (array)

Paso 2: Iterator by Pabbly
  Array a iterar: "1. lineas"

Paso 3: Crear línea en Google Sheets (dentro del Iterator)
  Dentro del Iterator, los datos son:
  - 2. producto
  - 2. cantidad
  - 2. precio_unitario
  
  Mapeo:
  - Producto: [Selecciona "2. producto"]
  - Cantidad: [Selecciona "2. cantidad"]
  - Precio: [Selecciona "2. precio_unitario"]
  - Total: [Code] = {{cantidad}} * {{precio_unitario}}

Paso 4: Enviar confirmación (fuera del Iterator)
  - Nombre cliente: [Selecciona "1. nombre_cliente"]
  - Ítems procesados: 2 (Pabbly cuenta automáticamente)
```

### Notas Importantes sobre Iteradores

| Aspecto | Comportamiento | Ejemplo |
|--------|---|---|
| **Límite de iteraciones** | Máximo 500 elementos | Array con 1000 items → se procesan solo 500 |
| **Datos del Iterator en pasos siguientes** | Disponibles con prefijo del paso | Dentro Iterator (Paso 2): `2. producto` |
| **Acceso a datos previos al Iterator** | Funciona normalmente | Fuera Iterator: `1. nombre_cliente` |
| **Anidación de Iterators** | No recomendado | Complica la lógica; mejor usar Code by Pabbly |
| **Output del Iterator** | Se repite para cada iteración | Cada iteración genera una nueva ejecución del paso siguiente |

---

## Variables de Entorno, Secrets y Headers

### Almacenamiento de Secrets en Pabbly

Pabbly no tiene un "vault de secrets" centralizado como otras plataformas. Los datos sensibles se manejan así:

#### 1. API Keys y Tokens en Headers

**Mejor práctica:** Almacena API keys directamente en los headers de la acción HTTP:

```
Acción: API (HTTP Request)

Paso 1: Configurar Headers
  Header Name: "X-API-Key"
  Header Value: "tu_api_key_aqui_o_mapea_desde_custom_variable"

Paso 2: O usar Authorization Bearer
  Header Name: "Authorization"
  Header Value: "Bearer {{token_del_paso_anterior}}"
```

#### 2. Variables Personalizadas para Secrets

Crea una acción "Custom Variable" para almacenar secrets:

```
Acción: Custom Variable by Pabbly

Paso 1: Crear/Actualizar Variable
  Nombre Variable: "api_key_sendgrid"
  Valor: "SG.XXXXXXXXXXXX..."  (o mapea desde un paso)

Paso 2: Usar en Acciones Posteriores
  En headers o parámetros:
  [Selecciona "Custom Variable: api_key_sendgrid" del dropdown]
```

#### 3. Headers Comunes en Pabbly

| Header | Uso | Ejemplo |
|--------|-----|---------|
| `Authorization` | Autenticación Bearer | `Bearer eyJhbGciOiJIUzI1NiIs...` |
| `X-API-Key` | API Key | `X-API-Key: sk_live_4eC39HqLyjWDarhtT...` |
| `Content-Type` | Tipo de contenido | `application/json` o `multipart/form-data` |
| `Accept` | Formato esperado | `application/json` |
| `X-Custom-Header` | Headers personalizados | `value` |

**Cómo agregar headers en Pabbly:**

```
Acción HTTP: API by Pabbly

Campos:
1. Choose Action Event: POST
2. End Point URL: https://api.ejemplo.com/usuarios
3. Authentication: No Auth (o selecciona el tipo)
4. Add Headers:
   Header Name: "X-API-Key"
   Header Value: "tu_clave_aqui" [o selecciona del dropdown]
   
   [+] Agregar más headers:
   Header Name: "Accept"
   Header Value: "application/json"

5. Set Parameters:
   key: "email"
   value: [Selecciona "1. email" del dropdown]
```

#### 4. Autenticación Basic Auth

Para endpoints que requieren Basic Auth:

```
Acción HTTP: API by Pabbly

Campos:
1. Choose Action Event: POST
2. End Point URL: https://api.ejemplo.com/create
3. Authentication: Basic Auth
   - API Key / Username: "tu_usuario"
   - Secret Key / Password: "tu_contraseña"
   
Pabbly codifica automáticamente a Base64 y añade el header:
Authorization: Basic base64(usuario:contraseña)
```

#### 5. Bearer Token (OAuth)

Para APIs con tokens OAuth:

```
Acción HTTP: API by Pabbly

Campos:
1. Choose Action Event: GET
2. End Point URL: https://api.ejemplo.com/me
3. Authentication: Bearer Token
   - Token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   
Pabbly añade automáticamente:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Formatos de Respuesta HTTP

### Cómo Pabbly Procesa Respuestas

Pabbly captura automáticamente respuestas HTTP y las estructura en la salida del paso.

#### 1. Respuesta JSON Literal

**Envío desde endpoint:**
```bash
curl -X POST https://api.ejemplo.com/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Juan", "edad": 30}'
```

**Respuesta del servidor:**
```json
{
  "success": true,
  "usuario_id": 12345,
  "mensaje": "Usuario creado correctamente"
}
```

**Cómo aparece en Pabbly:**
```
Paso 4: Crear Usuario (API)
Respuesta:
- success: true
- usuario_id: 12345
- mensaje: Usuario creado correctamente
```

**Acceso en paso siguiente:**
```javascript
let usuarioId = data['4. usuario_id'];
let mensaje = data['4. mensaje'];
```

#### 2. Respuesta JSON Anidada

**Respuesta del servidor:**
```json
{
  "status": "created",
  "data": {
    "usuario": {
      "id": 12345,
      "nombre": "Juan García",
      "email": "juan@ejemplo.com"
    }
  }
}
```

**Acceso en Code by Pabbly:**
```javascript
// Opción 1: Selecciona el campo en el dropdown (si Pabbly lo expone)
let usuarioId = data['4. usuario > id'];

// Opción 2: En Code, accede al JSON completo y parsea
let respuesta = JSON.parse(data['4. response']);
let usuarioId = respuesta.data.usuario.id;

// Opción 3: Si Pabbly expone la respuesta como objeto
let usuarioId = data['4. usuario']['id'];
```

#### 3. Respuesta Array

**Respuesta del servidor:**
```json
[
  { "id": 1, "nombre": "Producto A" },
  { "id": 2, "nombre": "Producto B" }
]
```

**Acceso:**
```javascript
// El array está directamente en 'data'
let productos = data['5. response'];
let primerProducto = productos[0];
let productoId = productos[0].id;  // 1
```

#### 4. Respuesta con Content-Type text/plain

**Respuesta del servidor:**
```
Archivo procesado correctamente
```

**Cómo aparece en Pabbly:**
```
Paso 6: Procesar Archivo
Respuesta:
- response: "Archivo procesado correctamente"
```

**Acceso:**
```javascript
let mensaje = data['6. response'];
```

#### 5. Respuesta XML

Pabbly intenta convertir XML a JSON automáticamente:

**Respuesta del servidor:**
```xml
<respuesta>
  <usuario>
    <id>12345</id>
    <nombre>Juan García</nombre>
  </usuario>
</respuesta>
```

**En Pabbly (después de conversión automática):**
```
- usuario > id: 12345
- usuario > nombre: Juan García
```

### Mapear Respuesta en Paso Siguiente

**Ejemplo práctico:**

```
Paso 1: Webhook (captura email)
  Salida: email = "juan@ejemplo.com"

Paso 2: API by Pabbly (busca usuario)
  Endpoint: GET https://api.crm.com/usuarios?email={{email}}
  Respuesta JSON:
  {
    "id": 999,
    "nombre": "Juan García",
    "estado": "activo"
  }

Paso 3: Crear tarea en Google Tasks
  Mapeo:
  - Título: "Contactar a {{nombre}}"
    [Selecciona "2. nombre" del dropdown]
  - Descripción: "Usuario ID: {{id}}"
    [Selecciona "2. id" del dropdown]
  - Estado: "activo" (hardcoded)
  
  Alternativamente, en Code by Pabbly:
  let titulo = `Contactar a ${data['2. nombre']}`;
  let descripcion = `Usuario ID: ${data['2. id']}`;
```

### Manejo de Respuestas de Error

**Respuesta de error (400, 401, 500):**

```json
{
  "error": true,
  "code": 400,
  "message": "Email ya existe"
}
```

**Cómo Pabbly lo maneja:**

```
- Si error_code < 300: Paso se completa exitosamente
- Si error_code >= 400: Paso falla y registra el error
  Aparece en Task History con el mensaje de error
```

**Para capturar errores sin fallar el workflow:**

```javascript
// Usa Try-Catch en Code by Pabbly
try {
  let respuesta = JSON.parse(data['4. response']);
  if (respuesta.error) {
    output = { error: true, mensaje: respuesta.message };
  } else {
    output = respuesta.data;
  }
} catch (e) {
  output = { error: true, mensaje: e.message };
}
```

---

## Errores Comunes

### Error: "Unexpected identifier"

**Síntoma:**
```
Error: Unexpected identifier at line 2, column 5
```

**Causas comunes:**

1. **Comillas sin cerrar en Code by Pabbly:**
   ```javascript
   // ❌ Incorrecto
   let nombre = data['1. nombre;
   
   // ✅ Correcto
   let nombre = data['1. nombre'];
   ```

2. **Caracteres especiales sin escape:**
   ```javascript
   // ❌ Incorrecto (si 'ñ' no está en UTF-8)
   let teléfono = data["3. Teléfono"];
   
   // ✅ Correcto (con comillas simples o UTF-8)
   let telefono = data['3. Teléfono'];
   ```

3. **Paréntesis sin cerrar:**
   ```javascript
   // ❌ Incorrecto
   let resultado = (data['1. valor'];
   
   // ✅ Correcto
   let resultado = (data['1. valor']);
   ```

4. **Nombre de variable incorrecto:**
   ```javascript
   // ❌ Incorrecto (número al inicio)
   let 1_nombre = "Juan";
   
   // ✅ Correcto
   let nombre_1 = "Juan";
   ```

### Error: "Field not found" o "Undefined variable"

**Síntoma:**
```
Error: Field "email" not found in previous step
```

**Causas:**

1. **Nombre de campo incorrecto:**
   ```javascript
   // ❌ Si el campo es "Email" (con mayúscula)
   let email = data['1. email'];
   
   // ✅ Correcto
   let email = data['1. Email'];
   ```

2. **Prefijo de paso incorrecto:**
   ```javascript
   // ❌ Si el paso es "Paso 2"
   let email = data['1. email'];
   
   // ✅ Correcto (el webhook es Paso 1)
   let email = data['1. email'];
   ```

3. **Campo en array sin iterator:**
   ```javascript
   // ❌ Intentas acceder directamente
   let producto = data['1. lineas']['producto'];
   
   // ✅ Usa Iterator o acceso con índice
   let producto = data['1. lineas'][0]['producto'];
   ```

### Error: "Unsupported POST request" o "401 Unauthorized"

**Síntoma:**
```
Error: Unsupported POST request
Error Code: 401
Message: Request missing required authentication credentials
```

**Soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| 401 | API Key faltante o incorrecta | Verifica header `X-API-Key` en "Add Headers" |
| 401 | Token expirado | Refresca el token antes de usarlo |
| 400 | Endpoint URL incorrecto | Copia directamente de la documentación de API |
| 400 | Parámetros faltantes | Asegúrate de usar "Set Parameters" correctamente |
| 405 | Método HTTP incorrecto (POST en vez de GET) | Verifica "Choose Action Event" |
| 415 | Content-Type incorrecto | Asegúrate de que "Payload Type" coincida con el esperado |

### Error: "Unexpected end of JSON input"

**Síntoma:**
```
Error: Unexpected end of JSON input
SyntaxError: JSON.parse(...) failed
```

**Causas:**

1. **Respuesta vacía del endpoint:**
   ```javascript
   // ❌ Incorrecto si la respuesta es vacía
   let respuesta = JSON.parse(data['2. response']);
   
   // ✅ Correcto (verifica antes)
   let respuesta = data['2. response'] ? JSON.parse(data['2. response']) : {};
   ```

2. **Response no es JSON:**
   ```javascript
   // ✅ Mejor: comprueba si es JSON
   try {
     let respuesta = JSON.parse(data['2. response']);
   } catch (e) {
     let respuesta = data['2. response'];  // Es string plano
   }
   ```

### Formato de Mensaje de Error Pabbly

Cuando un paso falla, aparece en **Task History**:

```
Workflow: Mi Automatización
Task ID: 5f8a9c7b-d4e2-11eb-8f9c...
Estado: Failed

Step 3: Create Contacto (API)
Data In:
{
  "email": "juan@ejemplo.com",
  "nombre": "Juan García"
}

Data Out (Error):
{
  "error": true,
  "code": 400,
  "message": "Email ya está registrado"
}

Task History: Re-execute | View Details
```

---

## Ejemplos de Código Listos para Usar

### 1. Enviar JSON a Webhook desde curl

```bash
# Básico con JSON
curl -X POST https://webhook.pabbly.com/xxxxx \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan García",
    "email": "juan@ejemplo.com",
    "edad": 30,
    "ciudad": "Madrid"
  }'

# Con variables de entorno
EMAIL="juan@ejemplo.com"
NOMBRE="Juan García"

curl -X POST https://webhook.pabbly.com/xxxxx \
  -H "Content-Type: application/json" \
  -d "{
    \"nombre\": \"$NOMBRE\",
    \"email\": \"$EMAIL\",
    \"timestamp\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\"
  }"
```

### 2. Enviar form-data a Webhook desde curl (con archivo)

```bash
# Enviar archivo + campos
curl -X POST https://webhook.pabbly.com/xxxxx \
  -F "nombre=Juan García" \
  -F "email=juan@ejemplo.com" \
  -F "documento=@/ruta/local/CV.pdf" \
  -F "edad=30"

# Múltiples archivos
curl -X POST https://webhook.pabbly.com/xxxxx \
  -F "usuario=juan@ejemplo.com" \
  -F "foto=@foto.jpg" \
  -F "cv=@cv.pdf" \
  -F "portafolio=@portafolio.zip"

# Con boundary personalizado (avanzado)
curl -X POST https://webhook.pabbly.com/xxxxx \
  -H "Content-Type: multipart/form-data; boundary=----CustomBoundary" \
  --data-binary @- <<'EOF'
------CustomBoundary
Content-Disposition: form-data; name="nombre"

Juan García
------CustomBoundary
Content-Disposition: form-data; name="email"

juan@ejemplo.com
------CustomBoundary--
EOF
```

### 3. Enviar JSON desde Node.js a Webhook

```javascript
// Opción 1: Fetch API (Node 18+)
const data = {
  nombre: "Juan García",
  email: "juan@ejemplo.com",
  edad: 30
};

fetch('https://webhook.pabbly.com/xxxxx', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(response => response.json())
.then(result => console.log('Éxito:', result))
.catch(error => console.error('Error:', error));

// Opción 2: Axios
const axios = require('axios');

axios.post('https://webhook.pabbly.com/xxxxx', {
  nombre: "Juan García",
  email: "juan@ejemplo.com",
  edad: 30
}, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => console.log('Éxito:', response.data))
.catch(error => console.error('Error:', error));

// Opción 3: http (nativo, sin dependencias)
const http = require('http');

const data = JSON.stringify({
  nombre: "Juan García",
  email: "juan@ejemplo.com",
  edad: 30
});

const options = {
  hostname: 'webhook.pabbly.com',
  path: '/xxxxx',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => responseData += chunk);
  res.on('end', () => console.log('Éxito:', responseData));
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();
```

### 4. Enviar form-data desde Node.js (con archivo)

```javascript
// Opción 1: FormData nativo (Node 18.10+)
import fs from 'fs';
import FormData from 'form-data';

const form = new FormData();
form.append('nombre', 'Juan García');
form.append('email', 'juan@ejemplo.com');
form.append('documento', fs.createReadStream('/ruta/CV.pdf'));

fetch('https://webhook.pabbly.com/xxxxx', {
  method: 'POST',
  body: form
})
.then(res => res.json())
.then(data => console.log('Éxito:', data))
.catch(err => console.error('Error:', err));

// Opción 2: form-data package (compatible con versiones antiguas)
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('nombre', 'Juan García');
form.append('email', 'juan@ejemplo.com');
form.append('archivo', fs.createReadStream('/ruta/documento.pdf'));

form.submit('https://webhook.pabbly.com/xxxxx', (err, res) => {
  if (err) console.error('Error:', err);
  else console.log('Éxito: Archivo enviado');
});

// Opción 3: Con axios
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('nombre', 'Juan García');
form.append('archivo', fs.createReadStream('/ruta/documento.pdf'));

axios.post('https://webhook.pabbly.com/xxxxx', form, {
  headers: form.getHeaders()
})
.then(res => console.log('Éxito:', res.data))
.catch(err => console.error('Error:', err));
```

### 5. Mapear Token de Pabbly: Campo "3. Correo Electrónico" → JSON key "email"

**En Pabbly Connect (UI):**

```
Paso: Crear Usuario (API)
Action Event: POST
Endpoint: https://api.ejemplo.com/usuarios

Set Parameters:
- Key: "email"
- Value: [Selecciona dropdown → "3. Correo Electrónico"]

- Key: "nombre"
- Value: [Selecciona dropdown → "3. Nombre"]

Resultado enviado:
{
  "email": "juan@ejemplo.com",
  "nombre": "Juan García"
}
```

**En Code by Pabbly (JavaScript):**

```javascript
// Opción 1: Usar los datos directamente
let emailValue = data['3. Correo Electrónico'];
let nombreValue = data['3. Nombre'];

let output = {
  email: emailValue,
  nombre: nombreValue
};

// Opción 2: Destructuring
let { 'email': email_value, 'nombre': nombre_value } = data;

output = {
  email: email_value,
  nombre: nombre_value
};

// Opción 3: Más limpio (si los nombres son simples)
let { '3. Correo Electrónico': email, '3. Nombre': nombre } = data;

output = {
  email: email,
  nombre: nombre
};
```

### 6. Convertir Payload Pabbly a Formato Normalizado

**Entrada (Webhook Pabbly con campos numerados y tipos):**
```json
{
  "3. Correo Electrónico": "juan@ejemplo.com",
  "3. Nombre Completo": "Juan García López",
  "3. Fecha De Nacimiento: Date: 07 Jul, 2004": "2004-07-07",
  "3. Teléfono: Phone": "+34 912 345 678",
  "3. Edad: Number": 20,
  "4. Documentos: File URL": "https://pabbly-storage.s3.amazonaws.com/xxx/documento.pdf"
}
```

**Code by Pabbly (JavaScript) para normalizar:**

```javascript
// Extrae valores y mapea a claves limpias
let email = data['3. Correo Electrónico'];
let nombre = data['3. Nombre Completo'];
let fechaNacimiento = data['3. Fecha De Nacimiento: Date: 07 Jul, 2004'];
let telefono = data['3. Teléfono: Phone'];
let edad = data['3. Edad: Number'];
let documentoUrl = data['4. Documentos: File URL'];

// Convierte la fecha de "2004-07-07" a "07/07/2004" (formato españa)
let fechaParts = fechaNacimiento.split('-');
let fechaFormatada = `${fechaParts[2]}/${fechaParts[1]}/${fechaParts[0]}`;

// Limpia el teléfono (quita espacios y caracteres especiales)
let telefonoLimpio = telefono.replace(/[\s\-()]/g, '');

// Convierte nombre a mayúsculas
let nombreUpper = nombre.toUpperCase();

// Crea el objeto normalizado
let output = {
  email: email,
  nombre: nombreUpper,
  fecha_nacimiento: fechaFormatada,
  edad: parseInt(edad),
  telefono: telefonoLimpio,
  documento_url: documentoUrl,
  timestamp: new Date().toISOString()
};

// Opcionalmente, convierte a JSON string para enviar
let outputJson = JSON.stringify(output);
/*
{
  "email": "juan@ejemplo.com",
  "nombre": "JUAN GARCÍA LÓPEZ",
  "fecha_nacimiento": "07/07/2004",
  "edad": 20,
  "telefono": "+34912345678",
  "documento_url": "https://pabbly-storage.s3.amazonaws.com/xxx/documento.pdf",
  "timestamp": "2026-01-27T17:30:00.000Z"
}
*/
```

### 7. Procesar Respuesta HTTP y Mapear en Pasos Siguientes

**Respuesta de API (Paso 2):**
```json
{
  "success": true,
  "usuario_id": 12345,
  "cuenta": {
    "estado": "activa",
    "plan": "premium"
  }
}
```

**En Paso 3 (Code by Pabbly):**

```javascript
// Accede a la respuesta del paso anterior
let respuesta = data['2. response'];  // si es string JSON
let usuarioId = data['2. usuario_id'];
let estado = data['2. cuenta']['estado'];

// O parsea si viene como JSON string
let respuestaParsed = JSON.parse(data['2. response']);
let id = respuestaParsed.usuario_id;

// Crea un objeto para el siguiente paso
let output = {
  id_usuario: usuarioId,
  estado_cuenta: estado,
  plan: data['2. cuenta']['plan'],
  fecha_activacion: new Date().toISOString()
};
```

**En Paso 4 (Crear Contacto):**

```
Mapeo:
- Usuario ID: [Selecciona "3. id_usuario"]
- Estado: [Selecciona "3. estado_cuenta"]
- Plan: [Selecciona "3. plan"]
- Activado: [Selecciona "3. fecha_activacion"]
```

---

## Checklist de Integración

### Antes de Conectar un Endpoint

#### ✅ Validación del Endpoint

- [ ] URL del endpoint es **HTTPS** (no HTTP)
- [ ] Método HTTP correcto: GET, POST, PUT, DELETE, PATCH
- [ ] Formato de respuesta es **JSON** o **XML** (no HTML)
- [ ] Status code de éxito es **2xx** (200, 201, 202)
- [ ] Status code de error es **4xx o 5xx** (captura en Task History)

#### ✅ Autenticación

- [ ] Tipo de auth identificado: Basic, Bearer, API Key, OAuth
- [ ] Credenciales disponibles: username/password, token, API key
- [ ] Headers requeridos documentados (ej: `X-API-Key`, `Authorization`)
- [ ] Tokens no hardcodeados en código; almacenados en Custom Variables o directos en campos
- [ ] No expongas secrets en logs ni screenshots

#### ✅ Estructura de Datos

- [ ] Nombres de campos en Pabbly coinciden con formulario original
- [ ] Caracteres especiales (acentos, espacios, puntuación) se manejan correctamente
- [ ] Arrays/line items serán procesados con Iterator
- [ ] Archivos se descargarán como URLs HTTPS
- [ ] Tipos de datos identificados: texto, número, booleano, fecha, array, objeto

#### ✅ Parámetros y Body

- [ ] **Para GET:** Parámetros en "Set Parameters" (no en URL directa)
- [ ] **Para POST/PUT:** Payload type correcto (JSON, form-data, etc.)
- [ ] Campos requeridos vs opcionales documentados
- [ ] Ejemplo de payload JSON válido capturado
- [ ] Valores de prueba sanitizados (sin datos reales)

#### ✅ Content-Type

- [ ] Si envías JSON: `Content-Type: application/json`
- [ ] Si envías form-data: `Content-Type: multipart/form-data` (Pabbly lo maneja)
- [ ] Headers adicionales configurados (Accept, etc.)

#### ✅ Manejo de Errores

- [ ] Errores 401/403 capturados en Task History
- [ ] Errores 400 con mensaje claro identifican el problema
- [ ] Uso de Filtros o Router para rutas de error
- [ ] Code by Pabbly con try-catch para excepciones
- [ ] Logs en console.log() para debugging (visible en Task History)

#### ✅ Testing

- [ ] Webhook URL copiado correctamente (sin espacios)
- [ ] "Send Test Request" muestra respuesta sin errores
- [ ] Task History no contiene "Failed" o "Partially Failed"
- [ ] Datos capturados en respuesta visible en dropdown del paso siguiente
- [ ] Caracteres especiales (ñ, é, acentos) se muestran correctamente en respuesta

#### ✅ Documentación Interna

- [ ] Nombres de pasos claros y secuenciales
- [ ] Paso 1: Trigger (Webhook o Schedule)
- [ ] Paso 2+: Acciones (API, Mapeos, Filters, Iterators)
- [ ] Últimas actualizaciones documentadas
- [ ] Contacto del propietario del workflow

### Checklist Después de Conectar

- [ ] Workflow activado y **en estado "Active"**
- [ ] Mínimo 1 ejecución exitosa en Task History
- [ ] Variables dinámicas se mapean correctamente (sin hardcoding)
- [ ] Respuesta de API parseada correctamente (sin "Unexpected" errors)
- [ ] Iterators procesan el número correcto de elementos
- [ ] Archivos descargados como URLs con fecha de expiración clara
- [ ] Errores registrados apropiadamente (sin fallos silenciosos)
- [ ] Pruebas con datos reales (dentro de políticas de privacidad)

### Checklist de Rendimiento

- [ ] Número de pasos < 20 (workflows complejos considerar sub-workflows)
- [ ] Tiempo de ejecución < 30 segundos
- [ ] Sin loops infinitos (Iterators limitados a 500 elementos)
- [ ] Sin requests duplicadas (idempotencia garantizada)
- [ ] Rate limiting del endpoint respetado (si aplica)

---

## Referencias Oficiales de Pabbly

### Documentación Consultada

| Página | URL | Tópico |
|--------|-----|--------|
| Documentación Oficial | https://www.pabbly.com/pabbly-connect-documentation-complete-integration-guide/ | Conceptos básicos: Triggers, Actions, Webhooks |
| Webhooks | https://www.pabbly.com/how-to-use-webhooks-in-pabbly-connect-a-comprehensive-guide/ | Configuración y testing de webhooks |
| API by Pabbly | https://www.pabbly.com/connect/integrations/http-request/api-by-pabbly/ | HTTP requests, headers, authentication |
| Code by Pabbly | https://www.pabbly.com/how-to-use-code-by-pabbly-action-inside-pabbly-connect-pabbly-tutorial/ | JavaScript, return values, examples |
| Custom Variables | https://www.pabbly.com/integrating-custom-variables-with-pabbly-connect-a-step-by-step-guide/ | Variables personalizadas, secrets |
| Iterator by Pabbly | https://www.pabbly.com/connect/integrations/iterator-by-pabbly/ | Arrays, line items, looping |
| Troubleshooting | https://www.pabbly.com/how-to-troubleshoot-errors-in-pabbly-connect-a-step-by-step-guide-2/ | Task History, error messages |
| Text Formatter | https://www.pabbly.com/how-to-use-the-text-formatter-inside-pabbly-connect/ | Transformación de strings |
| File Upload | https://www.pabbly.com/how-to-create-a-file-upload-form-upload-files-to-google-drive-using-pabbly-connect/ | Manejo de archivos, URLs |
| JSON Extraction | https://www.pabbly.com/automatic-json-extraction-with-pabbly-connect-a-step-by-step-guide/ | Respuestas JSON, Simple vs Advanced |

### Videos Tutoriales Relevantes

- [How to Use API Module Inside Pabbly Connect](https://www.youtube.com/watch?v=bmf4och_kTk) - Variables, headers, body
- [How to Use Code by Pabbly Action](https://www.youtube.com/watch?v=iNVjyBfwqno) - JavaScript, data access
- [How Iterator Module Works](https://www.youtube.com/watch?v=zJaGQ-SIB0I) - Arrays, line items
- [How to Use Iterator in Pabbly Connect](https://www.youtube.com/watch?v=rTpTgeN7STo) - Advanced iterator patterns
- [How to Use Custom Variable in Pabbly Connect](https://www.youtube.com/watch?v=qLjI9klSSmI) - Variables, maps

---

## Notas Finales

### Ambigüedades Encontradas en la Documentación

1. **Nomenclatura de pasos:** Pabbly usa números secuenciales, pero la UI no siempre los muestra claramente. Recomendación: nombra pasos explícitamente.

2. **Caracteres especiales:** La documentación no especifica completamente cómo escapados. Recomendación: usa comillas simples en JavaScript y confía en UTF-8.

3. **Límites de Iterator:** Documentación menciona 500 elementos, pero no es claro si incluye elementos anidados. Recomendación: testa con datos reales.

4. **Headers automáticos:** No está claro si Pabbly modifica headers según el tipo de autenticación. Recomendación: verifica en el "Data In" de Task History.

5. **Respuestas de error:** Pabbly captura la respuesta pero no siempre la estructura de error es evidente. Recomendación: usa Code by Pabbly con try-catch.

### Mejores Prácticas Aplicadas

✅ **Siempre usa HTTPS** para webhooks y endpoints  
✅ **Normaliza datos** en Code by Pabbly (no confíes en nombres "as is")  
✅ **Log todo** usando console.log() en Code by Pabbly  
✅ **Testa iterativamente** antes de activar workflows  
✅ **Documenta paso a paso** qué datos entra y sale  
✅ **Sanitiza secrets** y nunca los expongas en código  
✅ **Usa Custom Variables** para valores que reutilizas  

---

**Documento generado:** 27 de enero de 2026  
**Versión:** 1.0  
**Mantenedor:** Basado en documentación oficial de Pabbly Connect
