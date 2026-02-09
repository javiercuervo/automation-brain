# IITD - Plan de automatización PDFs y Scorms

## Google Sheet
https://docs.google.com/spreadsheets/d/1bXVP3RYFtl8XjRJ2bSFwm4Ntv8Uwi5fwWlxUS2iL_KA/edit

## Accesos

### Google APIs (OAuth2 ADC)
- Credenciales: `~/.config/gcloud/application_default_credentials.json` (Application Default Credentials)
- Cuenta: `proportione@institutoteologia.org`
- Proyecto cuota: `iitd-apps-script`
- APIs habilitadas: Google Drive API, Google Sheets API
- Scopes: `drive.readonly`, `spreadsheets`
- Renovar: `gcloud auth application-default login --scopes="https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/spreadsheets"`

### SiteGround SSH (scorm.institutoteologia.org)
- Host: `ssh.institutoteologia.org` (alias: `c1121528.sgvps.net`)
- Puerto SSH: `18765`
- Usuario: `u13-siv41mwallnd`
- Ruta web: `/home/customer/www/institutoteologia.org/public_html/`
- Clave SSH local: `~/.ssh/id_ed25519` (tiene passphrase, cargar con `ssh-add`)
- Git clone: `git clone ssh://u13-siv41mwallnd@c1121528.sgvps.net:18765/home/customer/www/institutoteologia.org/public_html/`
- Nota: Requiere registrar la clave pública en SiteGround > Site Tools > Devs > SSH Keys Manager

### FlipBooklets.com
- Login: `javier.cuervo@proportione.com` (password en `.env`)
- Dominio personalizado: `pdf.proportione.com`

## Columnas del Sheet
| Col | Contenido |
|-----|-----------|
| A   | Fecha de subida |
| B   | Nombre de la unidad |
| C   | Link Google Drive (PDF o ZIP) / nombre carpeta |
| D   | Código embebido (iframe HTML) |
| E   | URL resultante |
| F   | @dropdown (notas) |

## Dos tipos de contenido

### 1. PDFs → FlipBooklets.com (pdf.proportione.com)
- **Origen**: PDF en Google Drive (col C tiene link `drive.google.com/file/d/...`)
- **Destino**: Se sube a flipbooklets.com → genera URL `https://pdf.proportione.com/SLUG`
- **Embed code** (col D): `<style>.embed-container{...}</style><div class='embed-container'><iframe src='https://pdf.proportione.com/SLUG' style='border:0' allowfullscreen></iframe></div>`
- **Herramienta**: `upload.mjs` (Playwright, ya construido)
- **Nombres en sheet**: "Formato libro-...", "Contenidos...", "Para mejorar...", "Guía Didáctica...", "Presentación..."

### 2. Scorms (ZIPs HTML5) → SiteGround (scorm.institutoteologia.org)
- **Origen**: ZIP en Google Drive (col C tiene link `drive.google.com/file/d/...`)
- **Destino**: Se descomprime y sube a carpeta en SiteGround → URL `https://scorm.institutoteologia.org/RUTA/index.html`
- **Embed code** (col D): `<div style="padding:56.25% 0 0 0;position:relative;"><iframe src="URL" ...></iframe></div>`
- **Herramienta**: Script SCP/rsync vía SSH (por construir)
- **Nombres en sheet**: "Scorm ..."

## Rutas en SiteGround (por asignatura)

### Existentes (filas 1-144)
| Asignatura | Ruta |
|-----------|------|
| Revelación y Fe | `/revelacion-y-fe/` |
| Biblia y Jesús (ByJ) | `/ByJ/` |
| Iglesia y Sacramentos (IyS) | `/IyS/` |
| Antiguo Testamento (dic-2025) | `/AT/` |

### Nuevas (filas 145+, definidas para este batch)
| Asignatura | Ruta | UDs |
|-----------|------|-----|
| El hombre ante el misterio de Dios | `/hombre-misterio-dios/` | UD1-UD6 |
| Caminar en la fe | `/caminar-fe/` | UD1-UD6 |
| Biblia, el mensaje del AT | `/biblia-mensaje-AT/` | UD1-UD7 |
| Jesucristo la Palabra de Dios | `/jesucristo-palabra-dios/` | UD1-UD7 |
| La celebración cristiana: los sacramentos | `/celebracion-sacramentos/` | UD1-UD6 |
| La condición moral del ser humano | `/condicion-moral/` | UD1-UD5 |
| El camino moral del cristiano | `/camino-moral/` | UD1-UD6 |

Patrón de URL: `https://scorm.institutoteologia.org/{ruta}/UD{n}/index.html`

## Estado: Hecho hasta fila 144

## Pendientes desde fila 145 (bloque 02/02/2026 en adelante)

### Scorms pendientes (43 items)
| # | Asignatura | UD | Google Drive ID | URL destino |
|---|-----------|-----|----------------|-------------|
| 1 | El hombre ante el misterio de Dios | UD1 | 1uykwv_7z9p4lVr0LK_KxzRJFBfLxe5xc | scorm.institutoteologia.org/hombre-misterio-dios/UD1/index.html |
| 2 | El hombre ante el misterio de Dios | UD2 | 1BeY1K8Rec_-693enSnuU5s6wenlbnp84 | scorm.institutoteologia.org/hombre-misterio-dios/UD2/index.html |
| 3 | El hombre ante el misterio de Dios | UD3 | 1_-Aee-fkjcslQN9EpMgHPce8mVxzJsre | scorm.institutoteologia.org/hombre-misterio-dios/UD3/index.html |
| 4 | El hombre ante el misterio de Dios | UD4 | 1LhFxarKU3mXFRjInoZWKOKZYoqVyRLb2 | scorm.institutoteologia.org/hombre-misterio-dios/UD4/index.html |
| 5 | El hombre ante el misterio de Dios | UD5 | 1uTJ32tOYRtcP4VkJ0vC7Ng9Hx286TR_4 | scorm.institutoteologia.org/hombre-misterio-dios/UD5/index.html |
| 6 | El hombre ante el misterio de Dios | UD6 | 1cccTWbDuKo1Iy7y0bTNKRF5xzaLyNyg_ | scorm.institutoteologia.org/hombre-misterio-dios/UD6/index.html |
| 7 | Caminar en la fe | UD1 | 1Cy8jamH92OHkh16RsLGCujc91BXiAKVy | scorm.institutoteologia.org/caminar-fe/UD1/index.html |
| 8 | Caminar en la fe | UD2 | 1fXOlucToUB8470K3PsMFaIMsERf24cde | scorm.institutoteologia.org/caminar-fe/UD2/index.html |
| 9 | Caminar en la fe | UD3 | 1yx1vjEJbFqWHXpd6GCaZxej95QxF0NYW | scorm.institutoteologia.org/caminar-fe/UD3/index.html |
| 10 | Caminar en la fe | UD4 | 1jJektnNgIp3PuScRqJqvJBFmyr2vJadD | scorm.institutoteologia.org/caminar-fe/UD4/index.html |
| 11 | Caminar en la fe | UD5 | 10urQ8sbtAP0_b0oB2NexJOixbZ-iPhMu | scorm.institutoteologia.org/caminar-fe/UD5/index.html |
| 12 | Caminar en la fe | UD6 | 1oAeUNhhYoptr7rpTM1CvObCslma1-lfE | scorm.institutoteologia.org/caminar-fe/UD6/index.html |
| 13 | Biblia, el mensaje del AT | UD1 | 1T8TysfFxk_Mpf2LYYW9vi8xvnmMw4PHi | scorm.institutoteologia.org/biblia-mensaje-AT/UD1/index.html |
| 14 | Biblia, el mensaje del AT | UD2 | 1IPCZNZGPGekujsrBHmtlDaeRoHXQwuq1 | scorm.institutoteologia.org/biblia-mensaje-AT/UD2/index.html |
| 15 | Biblia, el mensaje del AT | UD3 | 1L_uaLL61EAds07D88Z9TJ760oDvX4mXy | scorm.institutoteologia.org/biblia-mensaje-AT/UD3/index.html |
| 16 | Biblia, el mensaje del AT | UD4 | 1Mq-ivizR7BiIXq0Ju686z0tbtYsTznND | scorm.institutoteologia.org/biblia-mensaje-AT/UD4/index.html |
| 17 | Biblia, el mensaje del AT | UD5 | 1LfUpHnISUUOWR0Ug-rCYn2hBHOEcwLoc | scorm.institutoteologia.org/biblia-mensaje-AT/UD5/index.html |
| 18 | Biblia, el mensaje del AT | UD6 | 1c7WBAR_If7sbxR3T2qAv-vaGct7GVFnm | scorm.institutoteologia.org/biblia-mensaje-AT/UD6/index.html |
| 19 | Biblia, el mensaje del AT | UD7 | 1EmAgHxy0x0m8hN343-uYy9YOJDO7yMI- | scorm.institutoteologia.org/biblia-mensaje-AT/UD7/index.html |
| 20 | Jesucristo la Palabra de Dios | UD1 | 1i5VVPJGlvEGu9gryXYBhucdDAROp2J0H | scorm.institutoteologia.org/jesucristo-palabra-dios/UD1/index.html |
| 21 | Jesucristo la Palabra de Dios | UD2 | 1gQKlrZj0XAiTTKe9Xxfk836_2hRWO-jo | scorm.institutoteologia.org/jesucristo-palabra-dios/UD2/index.html |
| 22 | Jesucristo la Palabra de Dios | UD3 | 1uETPSnLHQ-0Nm4wJtSqdDYVf97CyxV9C | scorm.institutoteologia.org/jesucristo-palabra-dios/UD3/index.html |
| 23 | Jesucristo la Palabra de Dios | UD4 | 1aX2GWIIHjWhk3CY0bq-DCkdWKC1ZpETt | scorm.institutoteologia.org/jesucristo-palabra-dios/UD4/index.html |
| 24 | Jesucristo la Palabra de Dios | UD5 | 1kIHUiVs4SCH6x3hfrSBJqQ6GkilKlMWR | scorm.institutoteologia.org/jesucristo-palabra-dios/UD5/index.html |
| 25 | Jesucristo la Palabra de Dios | UD6 | 1c66I2fW_KlqOqyPpKH1jo9KBGyzIWs8H | scorm.institutoteologia.org/jesucristo-palabra-dios/UD6/index.html |
| 26 | Jesucristo la Palabra de Dios | UD7 | 1tgo0MbsZcBB62xg8txOYcZjCAfb1DZA8 | scorm.institutoteologia.org/jesucristo-palabra-dios/UD7/index.html |
| 27 | La celebración cristiana: los sacramentos | UD1 | 1f8WPhd9YfjV2J_LXPHCW0mlcLyKUpkGX | scorm.institutoteologia.org/celebracion-sacramentos/UD1/index.html |
| 28 | La celebración cristiana: los sacramentos | UD2 | 1X4YHCM1QUiUv2WnUlzLOgi4RFxAgjURG | scorm.institutoteologia.org/celebracion-sacramentos/UD2/index.html |
| 29 | La celebración cristiana: los sacramentos | UD3 | 1B5C52Sls1IGa1Mj32W8ecpZs73jq_obQ | scorm.institutoteologia.org/celebracion-sacramentos/UD3/index.html |
| 30 | La celebración cristiana: los sacramentos | UD4 | 1JaYivpXW0bfPpR4VEkpRuEo-qcJEHoML | scorm.institutoteologia.org/celebracion-sacramentos/UD4/index.html |
| 31 | La celebración cristiana: los sacramentos | UD5 | 12FYz_6D3Adeay1-Ob0j4EWrWevsKfrTJ | scorm.institutoteologia.org/celebracion-sacramentos/UD5/index.html |
| 32 | La celebración cristiana: los sacramentos | UD6 | 10cHCoUCtPZ01Adh_56fshmNpgUjWlGGL | scorm.institutoteologia.org/celebracion-sacramentos/UD6/index.html |
| 33 | La condición moral del ser humano | UD1 | 1NM2FtePzV4yOKBS_omTtVruXDDSwrqzM | scorm.institutoteologia.org/condicion-moral/UD1/index.html |
| 34 | La condición moral del ser humano | UD2 | 1mWvPaLm_JHiUPKjhHSK7c3ESDuqCLvTU | scorm.institutoteologia.org/condicion-moral/UD2/index.html |
| 35 | La condición moral del ser humano | UD3 | 1S1q4NO0RXXbZaDqc3fhHEiUpOyYTOsKC | scorm.institutoteologia.org/condicion-moral/UD3/index.html |
| 36 | La condición moral del ser humano | UD4 | 157HSzTLroCPVukMhKSD0y9iOSWKftWT6 | scorm.institutoteologia.org/condicion-moral/UD4/index.html |
| 37 | La condición moral del ser humano | UD5 | 1VNQd7hcc_3Csj5rwiM98n2kwCxieu07R | scorm.institutoteologia.org/condicion-moral/UD5/index.html |
| 38 | El camino moral del cristiano | UD1 | 1xJOYkKC-tT70O8cFZ7oo7xlqPZAKlzm3 | scorm.institutoteologia.org/camino-moral/UD1/index.html |
| 39 | El camino moral del cristiano | UD2 | 1uNT-shZY03RboGhvDy9HkyfUWqlFer7P | scorm.institutoteologia.org/camino-moral/UD2/index.html |
| 40 | El camino moral del cristiano | UD3 | 1Np6hV6zuVKf8QrCxUng3iHDT_ez_IzKM | scorm.institutoteologia.org/camino-moral/UD3/index.html |
| 41 | El camino moral del cristiano | UD4 | 1iEJlmsINCMjhVUMqlB2SURWf9fmzjZRZ | scorm.institutoteologia.org/camino-moral/UD4/index.html |
| 42 | El camino moral del cristiano | UD5 | 1K3GQXIdqZ5qKyrkQtSuu9LuCfecotIui | scorm.institutoteologia.org/camino-moral/UD5/index.html |
| 43 | El camino moral del cristiano | UD6 | 1O9IaEcWl3wKojmrHaiQiI3SFoMKjm67K | scorm.institutoteologia.org/camino-moral/UD6/index.html |

### PDFs pendientes (7 items únicos → FlipBooklets)
| # | Nombre | Google Drive ID | Slug propuesto |
|---|--------|----------------|----------------|
| 1 | Formato libro-Para mejorar el estudio-La Iglesia y su misión evangelizadora | 1hSbdQAhIA7fH8v9d63RQwbAZ_5QuHN6E | para-mejorar-iglesia-mision-evangelizadora |
| 2 | Formato libro-Contenidos-La Iglesia y su misión evangelizadora | 1agjhhnYCBB14SLSkr7v5hF_xZfk-zWbi | contenidos-iglesia-mision-evangelizadora |
| 3 | Formato libro-Para mejorar el estudio-La celebración cristiana: los sacramentos | 17El_NF7K54Lwqn3tnvwSVlfar1rdP4fr | para-mejorar-celebracion-sacramentos |
| 4 | Formato libro-Contenidos-La celebración cristiana: los sacramentos | 1Dih_Grj-gv2rsIJVWATYd0ANOuCf_mCL | contenidos-celebracion-sacramentos |
| 5 | Formato libro-Para mejorar el estudio-La condición moral del ser humano | 1Wwsx9IswPZJDb5k3FXRgoVj5TmdxUxcS | para-mejorar-condicion-moral |
| 6 | Formato libro-Contenidos-La condición moral del ser humano | 1wQ0qmtHxL2Rw3hKJsYUIfen9_psnxCHG | contenidos-condicion-moral |
| 7 | Formato libro-Contenidos-El camino moral del cristiano | 1txHHdh191vifRD39lu9L39UQc4PyTc_6 | contenidos-camino-moral |

> NOTA: "Para mejorar-La condición moral" aparece duplicado en el sheet (filas con mismo Drive ID `1Wwsx9IswPZJDb5k3FXRgoVj5TmdxUxcS`). Se sube 1 vez y se rellena el mismo embed+URL en ambas filas.

---

## PLAN DE EJECUCION

### Fase 1: Configurar acceso SSH a SiteGround
1. Generar clave SSH local (si no existe)
2. Añadirla al Administrador de claves SSH en SiteGround
3. Verificar conexión: `ssh -p 18765 u13-siv41mwallnd@c1121528.sgvps.net`
4. Localizar directorio raíz del subdominio `scorm.institutoteologia.org`

### Fase 2: PDFs → FlipBooklets (7 items únicos, 8 filas en sheet)
**Herramienta**: `upload.mjs` ya construido

1. Descargar cada PDF de Google Drive (`curl -L "https://drive.google.com/uc?export=download&id=FILE_ID"`)
2. Actualizar `flipbooks.config.json` con los 7 PDFs
3. Ejecutar `upload.mjs` en batch
4. Capturar URL resultante (`pdf.proportione.com/SLUG`)
5. Generar embed code
6. Rellenar cols D y E en el Google Sheet (PDF duplicado → mismos datos en ambas filas)

**Embed template para PDFs:**
```html
<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; width: 100%; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }@media only screen and (max-width:999px) {.embed-container { position: relative; padding-bottom: 110%;}}</style><div class='embed-container'><iframe src='https://pdf.proportione.com/SLUG' style='border:0' allowfullscreen></iframe></div>
```

### Fase 3: Scorms → SiteGround (43 items)
**Herramienta**: Script `upload-scorm.sh` (por construir)

1. Descargar cada ZIP de Google Drive
2. Descomprimir localmente en carpeta temporal
3. Subir vía SCP/rsync al directorio correcto en SiteGround
4. Verificar que `https://scorm.institutoteologia.org/RUTA/index.html` responde (HTTP 200)
5. Generar embed code
6. Rellenar cols D y E en el Google Sheet

**Embed template para Scorms:**
```html
<div style="padding:56.25% 0 0 0;position:relative;">
  <iframe
      src="https://scorm.institutoteologia.org/RUTA/index.html"
      style="position:absolute;top:0;left:0;width:100%;height:100%;"
      frameborder="0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowfullscreen>
  </iframe>
</div>
```

### Fase 4: Actualizar Google Sheet
- Vía Google Sheets API con `googleapis` npm package
- Script Node.js que escribe cols D+E para cada fila procesada
- Requiere: service account o OAuth2 con acceso al sheet

---

## Decisiones tomadas
- [x] Rutas SiteGround definidas (ver tabla arriba)
- [x] PDF duplicado: se sube 1 vez, se rellena embed+URL en las 2 filas
- [x] Actualización sheet: vía Google Sheets API (automatizado)
- [x] Acceso SiteGround: vía SSH con clave (datos de conexión confirmados)
