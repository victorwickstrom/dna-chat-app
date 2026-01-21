# DNA Helper - Deployment Guide

## Översikt

DNA Helper är en webbapplikation för DNA-analys som körs på **dnahelper.com**. Applikationen består av:

- **Frontend**: React/Vite-app serverad via Nginx
- **Backend**: Node.js Express-server för AI-integration (Azure OpenAI)
- **Reverse Proxy**: Traefik med automatisk SSL via Let's Encrypt

## Server-information

| Parameter | Värde |
|-----------|-------|
| Server IP | 116.202.22.12 |
| Domän | dnahelper.com |
| Sökväg | /srv/dnahelper |
| SSL | Let's Encrypt (auto-förnyelse) |

## Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik (Port 80/443)                     │
│              - SSL-terminering (Let's Encrypt)               │
│              - Routing baserat på domännamn                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   dnahelper-frontend    │     │    Andra applikationer   │
│   (Nginx, port 80)      │     │  (nis2secure, gf.victorw)│
└─────────────────────────┘     └─────────────────────────┘
              │
              │ /api/* requests
              ▼
┌─────────────────────────┐
│   dnahelper-backend     │
│   (Node.js, port 3001)  │
│   - Azure OpenAI API    │
└─────────────────────────┘
```

## Filer

### Docker-konfiguration

| Fil | Beskrivning |
|-----|-------------|
| `Dockerfile` | Multi-stage build för frontend och backend |
| `docker-compose.yml` | Orchestrering av containers med Traefik-labels |
| `nginx.conf` | Nginx-konfiguration för frontend + API proxy |
| `.env` | Miljövariabler (Azure API-nycklar) |

### Viktiga sökvägar på servern

```
/srv/dnahelper/
├── dist/                 # Byggd frontend
├── server/               # Backend-kod
├── public/               # Statiska filer
├── docker-compose.yml    # Docker-konfiguration
├── Dockerfile            # Container-definitioner
├── nginx.conf            # Nginx-konfiguration
└── .env                  # Miljövariabler (hemligt)
```

## Deploy-process

### Förutsättningar

- SSH-åtkomst till servern (116.202.22.12)
- Node.js och npm installerat lokalt
- Docker och Docker Compose på servern

### Steg 1: Bygg lokalt

```bash
cd /path/to/dna-chat-app
npm install
npm run build
```

### Steg 2: Synka filer till servern

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  . root@116.202.22.12:/srv/dnahelper/
```

### Steg 3: Bygg och starta containers

```bash
ssh root@116.202.22.12 "cd /srv/dnahelper && docker compose build && docker compose up -d"
```

### Steg 4: Verifiera deployment

```bash
# Kontrollera att containers körs
ssh root@116.202.22.12 "docker ps | grep dnahelper"

# Kontrollera loggar
ssh root@116.202.22.12 "docker logs dnahelper-backend --tail 20"
ssh root@116.202.22.12 "docker logs dnahelper-frontend --tail 20"

# Testa HTTPS
curl -I https://dnahelper.com
```

## Snabb-deploy (ett kommando)

```bash
npm run build && \
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
  . root@116.202.22.12:/srv/dnahelper/ && \
ssh root@116.202.22.12 "cd /srv/dnahelper && docker compose build && docker compose up -d"
```

## Miljövariabler

Filen `/srv/dnahelper/.env` innehåller:

```env
AZURE_ENDPOINT=https://swedencentral.api.cognitive.microsoft.com
AZURE_API_KEY=<din-azure-api-nyckel>
AZURE_DEPLOYMENT=gpt-4o
```

**OBS:** Denna fil är inte versionshanterad och måste skapas manuellt på servern.

## Felsökning

### Container startar inte

```bash
# Se detaljerade loggar
ssh root@116.202.22.12 "docker logs dnahelper-frontend"
ssh root@116.202.22.12 "docker logs dnahelper-backend"
```

### SSL-certifikat problem

```bash
# Kontrollera Traefik-loggar
ssh root@116.202.22.12 "docker logs traefik 2>&1 | grep -i 'dnahelper\|acme\|error'"

# Starta om för att trigga ny certifikat-begäran
ssh root@116.202.22.12 "cd /srv/dnahelper && docker compose restart"
```

### Backend API fungerar inte

```bash
# Testa backend direkt
ssh root@116.202.22.12 "docker exec dnahelper-backend curl -s http://localhost:3001/api/health"
```

### Rensa och börja om

```bash
ssh root@116.202.22.12 "cd /srv/dnahelper && docker compose down && docker compose build --no-cache && docker compose up -d"
```

## Traefik-nätverk

Applikationen använder samma Docker-nätverk som Traefik (`nis2securewindsurf_default`). Detta definieras i `docker-compose.yml`:

```yaml
networks:
  traefik-network:
    external: true
    name: nis2securewindsurf_default
```

## Andra applikationer på servern

Servern kör även:

| App | Domän | Sökväg |
|-----|-------|--------|
| NIS2 Secure | nis2secure.dk/se | /srv/nis2securewindsurf |
| GF Recipes | gf.victorw.se | /srv/gf-recipes |

**Viktigt:** Dessa applikationer delar Traefik-instansen och får inte störas vid deploy av DNA Helper.

## Kontaktinformation

Vid frågor eller problem, kontakta administratören.
