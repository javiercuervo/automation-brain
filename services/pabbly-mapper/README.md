# Pabbly Mapper Service

Microservicio que recibe payloads de Pabbly Connect, normaliza/mapea los campos y orquesta la creación de archivos en GitHub mediante repository_dispatch o directamente via API.

## Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Sheets  │────▶│  Pabbly Connect  │────▶│  Cloud Run      │
│  (Form data)    │     │  (Webhook)       │     │  pabbly-mapper  │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────┐
                                              │  GitHub Actions       │
                                              │  (repository_dispatch)│
                                              └───────────┬───────────┘
                                                          │
                                                          ▼
                                              ┌───────────────────────┐
                                              │  Pull Request         │
                                              │  data/submissions/    │
                                              └───────────────────────┘
```

## Modos de Operación

### 1. `repository_dispatch` (por defecto)

Dispara un evento `pabbly_submission` a GitHub Actions, que se encarga de crear el archivo y abrir el PR. Más robusto y con mejor trazabilidad.

### 2. `create_file`

Crea directamente el archivo en el repo via GitHub API. Más simple pero menos control sobre el proceso.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/` | x-api-key | Recibe payload de Pabbly |
| POST | `/debug` | x-api-key | Muestra mapeo sin ejecutar |

## Configuración

### Variables de Entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `PORT` | No | 8080 | Puerto del servidor |
| `API_KEY` | Sí | - | API key para autenticación |
| `GITHUB_TOKEN` | Sí | - | Token de GitHub con permisos `repo` |
| `GITHUB_OWNER` | No | javiercuervo | Owner del repositorio |
| `GITHUB_REPO` | No | automation-brain | Nombre del repositorio |
| `OUTPUT_MODE` | No | repository_dispatch | Modo de salida |

### Secrets en GCP

Crear los secrets antes del deploy:

```bash
# API Key para autenticación
gcloud secrets create pabbly-mapper-api-key --replication-policy="automatic"
echo -n "tu-api-key-segura-aqui" | gcloud secrets versions add pabbly-mapper-api-key --data-file=-

# GitHub Token
gcloud secrets create pabbly-mapper-github-token --replication-policy="automatic"
echo -n "ghp_xxx" | gcloud secrets versions add pabbly-mapper-github-token --data-file=-
```

Dar permisos al service account:

```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding pabbly-mapper-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding pabbly-mapper-github-token \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Despliegue

```bash
cd services/pabbly-mapper
gcloud builds submit --config cloudbuild.yaml
```

## Mapeo de Campos

El servicio mapea los campos de Pabbly (formato `3. Campo`) a nombres normalizados:

| Campo Pabbly | Campo Normalizado |
|--------------|-------------------|
| 3. Submitted On (UTC) | Submitted On (UTC) |
| 3. Correo Electrónico | Correo electrónico |
| 3. Indique Su Título | Nombre |
| 3. Apellidos | Apellidos |
| 3. DNI / Pasaporte / NIE | DNI / Pasaporte / NIE |
| 3. ¿En Qué Se Desea Matricular? | ¿En qué se desea matricular? |
| 3. Selección De Módulos | Selección de Módulos |
| ... | ... |

## Ejemplo de Uso

### Request

```bash
curl -X POST https://pabbly-mapper-xxxxx.run.app/ \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{
    "submissionId": "sub-12345",
    "3. Correo Electrónico": "test@example.com",
    "3. Indique Su Título": "Juan",
    "3. Apellidos": "García López",
    "3. Fecha De Nacimiento": "Date: 15 Mar, 1990"
  }'
```

### Response

```json
{
  "success": true,
  "submissionId": "sub-12345",
  "mappedFields": 4,
  "mode": "repository_dispatch",
  "result": {
    "success": true,
    "message": "Repository dispatch triggered successfully"
  },
  "duration_ms": 234
}
```

### Debug Mode

```bash
curl -X POST https://pabbly-mapper-xxxxx.run.app/debug \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-api-key" \
  -d '{"3. Correo Electrónico": "test@example.com"}'
```

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar variables
export API_KEY="test-key"
export GITHUB_TOKEN="ghp_xxx"

# Ejecutar
npm run dev

# Test
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d @test-payload.json
```

## GitHub Action

El workflow `.github/workflows/pabbly-dispatch.yml` procesa los eventos `repository_dispatch`:

1. Recibe el evento con `submissionId` y `mappedPayload`
2. Crea una rama `pabbly/sub-{id}`
3. Guarda el JSON en `data/submissions/{id}.json`
4. Abre un Pull Request

## Seguridad

- API Key requerida en header `x-api-key`
- Secrets gestionados via GCP Secret Manager
- Contenedor ejecuta como usuario no-root
- Cloud Run con `--allow-unauthenticated` pero protegido por API key
- GitHub Token con scope mínimo necesario (`repo`)
