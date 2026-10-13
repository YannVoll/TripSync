# TripSync 🏠✈️

Plataforma de hospedagem onde viajantes encontram hotéis e casas para alugar, e proprietários podem anunciar seus imóveis.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS v4 |
| HTTP Client | Axios |
| Roteamento | React Router v6 |
| Backend | Node.js + Express.js |
| Banco de Dados | PostgreSQL |
| ORM | Prisma |
| Autenticação | JSON Web Token (JWT) |

## Funcionalidades

- ✅ Cadastro e login de usuários (JWT)
- ✅ Listagem pública de acomodações com busca e filtro
- ✅ Cadastro de hotel ou casa pelo usuário autenticado
- ✅ Página de detalhes com sistema de reservas
- ✅ Painel do usuário: gerenciar anúncios e reservas
- ✅ Verificação de conflito de datas na reserva
- ✅ Avaliações (nota + comentário) por quem já reservou
- ✅ Proteção de rotas por autenticação

## Como rodar

### Pré-requisitos
- Node.js 18+
- PostgreSQL rodando localmente

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
npm install
npx prisma migrate dev --name init
npm run dev
```

O backend sobe em `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173`.

### Variáveis de ambiente (backend/.env)

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/tripsync?schema=public"
JWT_SECRET="sua_chave_secreta_aqui"
PORT=3001
```

## Estrutura do projeto

```
TripSync/
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── app/
│       │   ├── components/   # Header, Footer
│       │   ├── context/      # AuthContext (JWT)
│       │   ├── pages/        # Home, Login, Properties, Dashboard...
│       │   └── layouts/
│       └── lib/
│           ├── axios.ts      # Instância configurada
│           └── utils.ts
└── backend/           # Express + Prisma
    ├── prisma/
    │   └── schema.prisma     # Models: User, Property, Booking, Review
    └── src/
        ├── index.js
        ├── middleware/
        │   └── auth.js       # Verificação JWT
        └── routes/
            ├── auth.js       # /api/auth/register|login|me
            ├── properties.js # /api/properties (CRUD)
            └── bookings.js   # /api/bookings (criar, listar, cancelar)
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Entrar
- `GET /api/auth/me` — Dados do usuário logado *(auth)*

### Properties
- `GET /api/properties` — Listar (público), aceita `?search=&type=`
- `GET /api/properties/my` — Imóveis do usuário *(auth)*
- `GET /api/properties/:id` — Detalhe (público)
- `POST /api/properties` — Criar anúncio *(auth)*
- `PUT /api/properties/:id` — Editar *(auth, dono)*
- `DELETE /api/properties/:id` — Remover *(auth, dono)*

### Bookings
- `GET /api/bookings/my` — Minhas reservas *(auth)*
- `POST /api/bookings` — Criar reserva *(auth)*
- `DELETE /api/bookings/:id` — Cancelar *(auth)*

### Reviews
- `GET /api/reviews/property/:id` — Avaliações de um imóvel (público)
- `POST /api/reviews` — Criar avaliação *(auth, exige reserva prévia)*
- `DELETE /api/reviews/:id` — Remover avaliação própria *(auth, autor)*
