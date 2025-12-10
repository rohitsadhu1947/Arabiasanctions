# ScreenGuard - Arabia Sanctions Screening Engine

Enterprise-grade sanctions screening platform for insurance operations across GCC markets. Real-time screening against OFAC, UN, EU, and local watchlists with workflow automation and comprehensive audit trails.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-green.svg)
![React](https://img.shields.io/badge/react-19-blue.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.109-teal.svg)

## 🚀 Features

### Screening Engine
- **Smart Name Matching**: Jaro-Winkler, Levenshtein, Token Sort/Set, Phonetic algorithms
- **Multi-List Support**: OFAC SDN, UN Consolidated, EU Consolidated, UK Sanctions
- **Local Watchlists**: Country-specific lists for Qatar, UAE, Saudi Arabia, Kuwait, Bahrain, Oman
- **Configurable Thresholds**: Auto-release, manual review, and high-risk levels
- **Bulk Screening**: Process up to 1000 entities per request

### Workflow Engine
- **Case Management**: Create, assign, escalate, and resolve cases
- **SLA Tracking**: Automatic breach detection and alerts
- **Ping-Pong Approvals**: Multi-level escalation with return cycles
- **Audit Trail**: Complete history of all actions

### Administration
- **User Management**: Create users, assign roles and permissions
- **Country/Branch Setup**: Multi-tenant GCC operations
- **Sanctions Lists**: Enable/disable, refresh from sources, CSV import
- **System Configuration**: Thresholds, SLA, security settings

### Compliance & Reporting
- **Full Audit Log**: Every action tracked with user, timestamp, IP
- **Export Capabilities**: CSV/JSON export for reports and audit logs
- **Dashboard Analytics**: Real-time screening and workflow metrics

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│   Database      │
│  React + Vite   │     │    FastAPI      │     │   PostgreSQL    │
│    (Vercel)     │     │ (Railway/Render)│     │   (Supabase)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 📦 Tech Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS v4
- Framer Motion
- React Query
- Recharts

**Backend:**
- FastAPI
- Pydantic
- Python-Jose (JWT)
- HTTPX (async HTTP)

**Database (Production):**
- PostgreSQL
- SQLAlchemy + Alembic

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/rohitsadhu1947/Arabiasanctions.git
cd Arabiasanctions

# Start backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# Start frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and login with:
- **Email**: `admin@insurance.com`
- **Password**: `password123`

### Docker Deployment

```bash
docker-compose up -d
```

## 🌐 Production Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

**Frontend on Vercel:**
1. Connect GitHub repo to Vercel
2. Set root directory: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-backend.railway.app/api/v1`
4. Deploy

**Backend on Railway:**
1. Create new project on Railway
2. Connect GitHub repo
3. Set root directory: `backend`
4. Add PostgreSQL addon
5. Set environment variables:
   ```
   SECRET_KEY=your-secret-key
   DATABASE_URL=postgresql://...
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```
6. Deploy

### Option 2: Render

Similar setup - Render supports both frontend static sites and backend web services with PostgreSQL.

### Option 3: Self-Hosted (Docker)

```bash
# Production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/screening/single` | POST | Screen individual/corporate |
| `/api/v1/screening/bulk` | POST | Bulk screening |
| `/api/v1/workflow/cases` | GET | List workflow cases |
| `/api/v1/workflow/cases/{id}/action` | POST | Perform action on case |
| `/api/v1/admin/sanctions-lists` | GET | List all sanctions lists |
| `/api/v1/admin/audit-logs` | GET | Get audit logs |

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Session binding
- Full audit trail
- CORS protection

## 📝 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For enterprise support and customization, contact the development team.

---

Built with ❤️ for GCC Insurance Compliance
