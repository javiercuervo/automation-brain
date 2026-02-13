# Informe de Estado y Planificacion — IITD

**Fecha:** 12 de febrero de 2026
**Para:** Direccion IITD, Miriam, Josete
**Referencia:** Reunion de priorizacion del 6 de febrero de 2026
**Preparado por:** Proportione

---

## 1. Resumen ejecutivo

Se han completado **6 sprints + QA** con un total de **26 necesidades resueltas** de 52 identificadas (**50%**).

### Hitos principales

- **PolarDoc cerrado al 100%.** Los 5 pasos del camino critico estan completados. PolarDoc ya no es necesario para expedientes, calificaciones ni certificados.
- **Cumplimiento RGPD avanzado.** Banner de cookies, politica de borrado, portabilidad de datos, portal ARCO+, paginas legales, proteccion de diplomas online — todo operativo.
- **Stripe integrado.** Webhook en Cloud Run recibe pagos y actualiza Stackby automaticamente.
- **BreezeDoc operativo.** Envio de contratos de matricula, convenios y consentimientos RGPD para firma electronica.
- **Web optimizada.** SEO Yoast en 13 paginas, FAQ, llms.txt, cookie banner Complianz, paginas legales publicadas.

### Resumen cuantitativo

| Estado | Cantidad | % |
|--------|----------|---|
| Hecho (funcional y en uso) | 26 | 50.0% |
| Implementado (pendiente deploy/config) | 5 | 9.6% |
| Guia entregada (accion manual del equipo) | 2 | 3.8% |
| Pendiente (no iniciado) | 14 | 26.9% |
| Bloqueado (limitaciones externas) | 5 | 9.6% |
| **Total** | **52** | **100%** |

---

## 2. Sprints completados

### Sprint 1: Fundamentos (1-9 febrero)

Las 8 necesidades priorizadas en la reunion del 6 de febrero:

| ID | Necesidad | Estado |
|----|-----------|--------|
| N01 | Notificacion alta/enrolamiento a secretaria | Implementado |
| N02 | Datos de alumnos completos y descargables | Hecho |
| N03 | Formulario contacto OCH llegue a Miriam | Guia entregada |
| N04 | Asignacion automatica de num. de expediente | Hecho |
| N11 | Separacion consentimientos RGPD en formularios | Guia entregada |
| N13 | Inventario de herramientas SaaS y DPAs | Implementado |
| N14 | Captura automatica de leads web en Stackby | Implementado |
| N20 | Identificador unico de alumno + deduplicacion | Hecho |

### Sprint 2: Camino critico PolarDoc + Legal (10 febrero)

| ID | Necesidad | Estado |
|----|-----------|--------|
| N07 | Expediente academico en base de datos | Hecho (1.583 alumnos importados de PolarDoc) |
| N40 | Texto legal RGPD en emails automaticos | Hecho |
| N42 | Paginas legales en la web | Hecho (textos publicados en WordPress) |

Integracion BreezeDoc:
- `breezedoc-enrollment.mjs` — envio de contratos para firma electronica
- 3 templates creados: matricula (349874), convenio (349877), RGPD (349896)
- IDs configurados en `.env`

### Sprint 3: Certificados y documentos (10 febrero)

| ID | Necesidad | Estado |
|----|-----------|--------|
| N05 | Listados de alumnos por curso para profesores | Hecho |
| N08 | Recibos y facturas PDF | Hecho (PDF + Drive + Sheet) |
| N09 | Certificados DECA automaticos | Hecho (QR + hash + SiteGround + Sheet) |

### Sprint 4: Operaciones y validacion (11 febrero)

| ID | Necesidad | Estado |
|----|-----------|--------|
| N21 | Validacion de datos migrados | Hecho (1.585 registros auditados) |
| N16 | Panel de control operativo | Hecho (dashboard.mjs) |
| N19 | KPIs DECA automaticos | Hecho (kpis-deca.mjs) |
| N06 | Calificaciones numericas | Hecho (sync Sheet <-> Stackby, 3.573 filas) |

### Sprint 5: RGPD + Pagos (11 febrero)

| ID | Necesidad | Estado |
|----|-----------|--------|
| N36 | Stripe webhook Cloud Run | Hecho |
| N44 | Exportacion de datos (portabilidad RGPD Art. 20) | Hecho |
| N12 | Politica de conservacion y borrado de datos | Hecho (anonimizacion automatica) |
| N13 | Inventario SaaS en Stackby | Hecho (14 columnas, 12 herramientas) |

IDs Sprint 5:
- Cloud Run: `https://iitd-stripe-webhook-621601343355.europe-west1.run.app`
- Stripe Webhook: `we_1Szfi52Ni6F9uaDOgTUnKjVq`

### Sprint 6: Web + RGPD + Comunicacion (11-12 febrero)

| ID | Necesidad | Estado |
|----|-----------|--------|
| N41 | Banner de cookies | Hecho (Complianz plugin en WordPress) |
| N42 | Paginas legales corregidas | Hecho (datos correctos: NIF, direccion, email, telefono) |
| N43 | Portal ARCO+ (derechos RGPD) | Hecho (publicado en /ejercicio-derechos-rgpd/) |
| N26 | Diplomas multi-programa | Hecho (certificado-pdf.mjs soporta todos los programas) |
| N25 | Emails automaticos transaccionales | Implementado (pendiente SMTP) |
| N24 | Tabla de contactos CRM | Hecho (Stackby + contactos-client.mjs) |

WordPress desplegado en Sprint 6:
- Cookie consent: plugin Complianz (banner + boton "Gestionar consentimiento")
- Paginas legales: Aviso Legal, Politica Privacidad, Politica Cookies — con datos correctos
- Portal ARCO+: formulario con 6 derechos, plazo 30 dias, enlace AEPD
- Footer: "Instituto Internacional de Teologia (c) 2026" + datos de contacto

### QA y mejoras web (12 febrero)

| Accion | Detalle |
|--------|---------|
| SEO Yoast | 13 paginas con meta descriptions y focus keyphrases |
| FAQ | Pagina /preguntas-frecuentes/ con 8 preguntas orientadas a alumno potencial |
| llms.txt | Descripcion corregida (sin programas falsos), FAQ incluida |
| 301 Redirect | /que-es-deca-infantil-primaria/ redirige correctamente |
| Meta descriptions | 8 acortadas a 160 chars max, 2 corregidas |
| XML Sitemap | 7 sitemaps activos |
| RGPD diplomas | robots.txt + .htaccess + hash-based filenames (anti-enumeracion) |
| DNS | diplomas.institutoteologia.org configurado y operativo |

Testing QA:
- 78 screenshots: 13 paginas x 6 viewports (1920, 1440, 1024, 768, 393, 360)
- 0 errores JS, 0 errores de red
- Todos los links internos responden 200
- Guia de validacion completa entregada a Mayte

---

## 3. Camino critico para abandonar PolarDoc — CERRADO

```
1. Identificador unico de alumno (N20)           -> HECHO
2. Numero de expediente automatico (N04)          -> HECHO
3. Expediente academico en base de datos (N07)    -> HECHO (1.583 alumnos)
4. Calificaciones numericas (N06)                 -> HECHO (3.573 filas sync)
5. Certificados DECA automaticos (N09)            -> HECHO (QR + hash + upload)
```

**Los 5 pasos estan completados.** PolarDoc ya se puede apagar. Los datos historicos (28.499 registros) quedan en Google Sheets como archivo consultable.

---

## 4. Proteccion RGPD de diplomas online

Los diplomas PDF en `diplomas.institutoteologia.org` contienen datos personales sensibles (nombre, notas, expediente). Se han implementado las siguientes protecciones:

| Medida | Articulo RGPD | Detalle |
|--------|--------------|---------|
| robots.txt (Disallow: /) | Art. 32 | Impide indexacion por buscadores |
| .htaccess anti-bots | Art. 32 | Bloquea bots conocidos (Googlebot, Bing, GPT, etc.) |
| Nombres hash (anti-enumeracion) | Art. 5.1.f, Art. 25 | URLs no predecibles: `a7f3b2e1c9d4.pdf` en vez de `IITD-021865.pdf` |
| No directory listing | Art. 5.1.f | Options -Indexes, index.html por defecto |
| Cabeceras noindex en PDFs | Art. 32 | X-Robots-Tag: noindex, nofollow, noarchive |
| Acceso solo con link directo | Art. 25 | Verificacion via QR del diploma (terceros legitimos) |

Los PDFs siguen accesibles con el link directo del QR — necesario para que terceros puedan verificar la autenticidad del diploma.

Workspace pxl.to:
- Espacio de trabajo: **IITD**
- Subdominio personalizado: `a.institutoteologia.org` (short links)
- Diseno QR personalizado configurado

---

## 5. Inventario completo de necesidades (N01-N52)

### A. Inscripciones y captura de datos

| ID | Necesidad | Estado |
|----|-----------|--------|
| N01 | Notificacion alta/enrolamiento a secretaria | Implementado |
| N02 | Datos de alumnos completos y descargables | Hecho |
| N03 | Formulario contacto OCH llegue a Miriam | Guia entregada |
| N04 | Asignacion automatica num. expediente | Hecho |
| N14 | Captura automatica de leads web en Stackby | Implementado |
| N20 | Identificador unico de alumno + deduplicacion | Hecho |
| N47 | Pipeline PDFs/Scorms a FlipBooklets | Implementado |

### B. Gestion de alumnos y expedientes

| ID | Necesidad | Estado |
|----|-----------|--------|
| N05 | Listados de alumnos por curso | Hecho |
| N06 | Calificaciones numericas y gestion de notas | Hecho |
| N07 | Expediente academico en base de datos | Hecho (1.583 alumnos) |
| N21 | Validacion de datos migrados | Hecho |
| N50 | Panel IITD multi-pestana | Hecho |
| N51 | Sistema de recibos PDF | Hecho |
| N52 | Deduplicacion avanzada | Hecho |

### C. Certificados y documentos

| ID | Necesidad | Estado |
|----|-----------|--------|
| N08 | Recibos y facturas PDF | Hecho |
| N09 | Certificados DECA automaticos | Hecho |
| N11 | Separacion consentimientos RGPD en formularios | Guia entregada |
| N15 | Firma electronica de contratos (BreezeDoc) | Implementado |
| N26 | Diplomas multi-programa | Hecho |
| N48 | Infraestructura hosting diplomas | Hecho |
| N49 | Sistema QR codes dinamicos | Hecho |

### D. Sincronizaciones y LMS

| ID | Necesidad | Estado |
|----|-----------|--------|
| N16 | Panel de control operativo diario | Hecho |
| N17 | Sincronizacion actividad LMS con Stackby | Bloqueado (API OCH) |
| N19 | KPIs DECA automaticos | Hecho |
| N22 | Notificacion de preguntas al profesor | Bloqueado (OCH) |

### E. Cumplimiento RGPD

| ID | Necesidad | Estado |
|----|-----------|--------|
| N12 | Politica de conservacion y borrado | Hecho |
| N13 | Inventario SaaS y contratos DPA | Hecho |
| N23 | Minimizacion del uso del DNI | Bloqueado (decision direccion) |
| N40 | Texto legal RGPD en emails | Hecho |
| N41 | Banner de cookies | Hecho (Complianz) |
| N42 | Paginas legales en la web | Hecho |
| N43 | Portal ARCO+ (derechos RGPD) | Hecho |
| N44 | Exportacion de datos (portabilidad) | Hecho |
| N45 | Registro de auditoria y brechas | Pendiente |
| N46 | Caducidad y control acceso grabaciones | Pendiente |

### F. Pagos y facturacion

| ID | Necesidad | Estado |
|----|-----------|--------|
| N10 | Facturacion a centros asociados | Pendiente |
| N18 | Migracion Golden Soft a Holded | Pendiente (caduca junio 2026) |
| N36 | Stripe webhook Cloud Run | Hecho |

### G. Marketing y comunicacion

| ID | Necesidad | Estado |
|----|-----------|--------|
| N24 | Tabla de contactos CRM | Hecho |
| N25 | Emails automaticos transaccionales | Implementado (pendiente SMTP) |
| N27 | Notificaciones comunidad OCH | Bloqueado (OCH) |
| N28 | Grabaciones: acceso y consentimiento | Pendiente |
| N29 | Flujo publicacion cursos con revision COEO | Pendiente |
| N30 | Paquetes de cursos y precios | Pendiente |
| N31 | Video por programa y multidioma | Pendiente |
| N32 | Onboarding curso gratuito desde blog | Pendiente |
| N33 | Oferta de tutorias post-curso | Pendiente |
| N34 | Newsletter con consentimiento trazable | Pendiente |
| N35 | Respuesta con IA + escalado | Pendiente |
| N37 | Campanas Google Grants | Pendiente |
| N38 | Gestion de centros asociados | Pendiente |
| N39 | Foros/comunidad LMS con privacidad | Bloqueado (OCH) |

---

## 6. Desglose por estado

### Completados (26)
N02, N04, N05, N06, N07, N08, N09, N12, N13, N16, N19, N20, N21, N24, N26, N36, N40, N41, N42, N43, N44, N48, N49, N50, N51, N52

### Implementados, pendiente deploy/config (5)
N01, N14, N15, N25, N47

### Guias entregadas (2)
N03, N11

### Pendientes (14)
N10, N18, N28, N29, N30, N31, N32, N33, N34, N35, N37, N38, N45, N46

### Bloqueados (5)
N17, N22, N23, N27, N39

---

## 7. Acciones pendientes del equipo IITD

| Accion | Responsable | Prioridad |
|--------|-------------|-----------|
| Configurar email alumnos@institutoteologia.org (N01) | Sonia | Alta |
| Configurar reenvio Gmail OCH a alumnos@ (N03) | Sonia | Alta |
| Proporcionar Sheet ID del formulario web (N14) | Sonia | Alta |
| Proporcionar credenciales SMTP para emails transaccionales (N25) | Miriam | Media |
| Completar inventario SaaS con datos de contratos y DPAs (N13) | Miriam + Gema | Media |
| Validar la guia de testing entregada | Mayte | Alta |

---

## 8. Riesgos y dependencias externas

| Riesgo | Impacto | Accion |
|--------|---------|--------|
| Golden Soft caduca junio 2026 | Sin contabilidad si no se migra | Planificar migracion N18 en proximo sprint |
| Limitaciones OnlineCourseHost | No se pueden hacer N17, N22, N27, N39 | Protocolos manuales como alternativa |
| SMTP no configurado | Emails transaccionales no operativos (N25) | Miriam proporciona credenciales |
| DNS diplomas.institutoteologia.org | Operativo | Resuelto 12 feb — A record + subdominio SiteGround |

---

## 9. Proximos pasos

### Prioridad 1: Acciones del equipo IITD

Las acciones de Sonia (N01, N03, N14) y la validacion de Mayte son los puntos que mas velocidad pueden desbloquear.

### Prioridad 2: Migracion Holded (N18)

Caduca junio 2026. Requiere coordinacion con Gema. Es la unica dependencia critica con fecha limite.

### Prioridad 3: Backlog marketing/comunicacion

14 necesidades pendientes (N28-N35, N37-N38, N45-N46) — se abordaran una vez resueltos los urgentes y con input de direccion sobre prioridades.

---

## 10. Firma digital de diplomas — Estado

La firma digital automatica de PDFs queda **aparcada**. Motivos:

- Los certificados SSL/TLS del servidor NO sirven para firmar PDFs (Key Usage incompatible)
- Se necesita un certificado personal del director (FNMT, .p12)
- El pipeline actual ya funciona: QR + hash de verificacion apuntan a `diplomas.institutoteologia.org`

**Cuando el director tenga su certificado FNMT:** solo hay que copiarlo a `certs/iitd-cert.p12` y actualizar `CERT_P12_PASSWORD` en `.env`. El codigo (`pdf-signer.mjs`) ya esta implementado — cero cambios necesarios.

---

## 11. Programas IITD (confirmados)

| Programa | Tipo |
|----------|------|
| DECA Infantil y Primaria | Plan de estudios completo (9 asignaturas) |
| DECA ESO y Bachillerato | Plan de estudios completo (9 asignaturas) |
| Formacion Sistematica en Teologia | Curso corto |
| Formacion Biblica (AT/NT) | Curso corto |
| Compromiso Laical y Doctrina Social | Curso corto |
| Cursos Monograficos | Curso corto |

Stackby contiene ademas programas historicos: Diplomatura/Licenciatura/Bachillerato en CC. Religiosas, Escuela de Evangelizadores.

---

## 12. Datos de contacto IITD

- **Razon social:** Instituto Internacional de Teologia a Distancia
- **NIF:** R2800617I
- **Direccion:** Calle Iriarte, 3 — 28028 Madrid
- **Telefono:** 91 401 50 62
- **Email:** informacion@institutoteologia.org
- **Web:** institutoteologia.org

---

*Documento preparado por Proportione.*
*Proxima actualizacion: 23 de febrero de 2026.*
