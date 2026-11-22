# TripSync 🏠✈️

Plataforma de viagens onde as pessoas **planejam viagens em grupo** (roteiro, checklist, clima e lembretes) e **encontram hospedagens** para os seus destinos, e proprietários podem anunciar seus imóveis.

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
| Clima | OpenWeather API |
| E-mail | Resend (SMTP via Nodemailer) |
| Testes | Node Test Runner + Supertest |

## Funcionalidades

### Planejamento de viagens
- ✅ Criar, editar e excluir viagens (destino, tipo, datas e descrição)
- ✅ Colaboração com papéis: **proprietário**, **colaborador** (edita) e **visualizador** (somente leitura)
- ✅ Convite de colaboradores por e-mail, remoção e opção de sair da viagem
- ✅ Roteiro de atividades com **detecção de conflito de horário** e validação dentro do período da viagem
- ✅ Comentários nas atividades
- ✅ Checklist gerada automaticamente conforme o tipo da viagem (praia, montanha, negócios...), com barra de progresso
- ✅ Histórico de alterações da viagem (quem fez o quê e quando)
- ✅ Clima atual e previsão de 5 dias do destino
- ✅ Lembretes por e-mail X dias antes da viagem (agendador automático)
- ✅ Recomendações de hospedagens para os destinos das suas próximas viagens

### Hospedagens
- ✅ Cadastro e login de usuários (JWT)
- ✅ Listagem pública de acomodações com busca e filtro
- ✅ Cadastro e edição de hotel, casa, pousada ou apartamento, com upload de foto (Multer)
- ✅ Página de detalhes com sistema de reservas
- ✅ Verificação de conflito de datas na reserva
- ✅ Pagamento simulado (cartão, PIX e boleto, com confirmação simulada do banco)
- ✅ Avaliações (nota + comentário) por quem já reservou
- ✅ Painel do usuário: gerenciar anúncios, reservas e status de pagamento

### Segurança
- ✅ Proteção de rotas no frontend e no backend
- ✅ Permissões por papel em cada ação da viagem
- ✅ Validação dos dados recebidos (somente campos permitidos são gravados)
- ✅ Senhas com hash (bcrypt)

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
npx prisma migrate deploy
npm run db:seed      # opcional: cria dados de demonstração
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

### Contas de demonstração

Criadas pelo `npm run db:seed` (senha de todas: `tripsync123`):

| Conta | Papel na viagem "Férias em Florianópolis" |
|-------|-----------|
| `ana@tripsync.dev` | Proprietária |
| `bruno@tripsync.dev` | Colaborador |
| `carla@tripsync.dev` | Visualizadora |

O seed não apaga dados existentes; ele só adiciona as contas de demonstração se ainda não existirem.

### Imagens

As fotos dos imóveis são salvas em `backend/uploads/` (fora do Git) e o banco guarda apenas a URL. Se o seu banco tiver fotos antigas salvas em base64, converta-as para arquivos com:

```bash
cd backend
npm run images:migrate
```

### Testes

```bash
cd backend
npm test
```

Os testes rodam em um banco separado (`tripsync_test`), criado automaticamente, sem afetar os dados de desenvolvimento.

### Variáveis de ambiente (backend/.env)

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/tripsync"
PORT=3001
FRONTEND_URL="http://localhost:5173"
JWT_SECRET="sua_chave_secreta_aqui"

# Clima (https://openweathermap.org/api)
OPENWEATHER_API_KEY="sua_chave_openweather"

# E-mail (https://resend.com/api-keys)
RESEND_API_KEY="re_sua_chave"
RESEND_SMTP_PORT=465
# EMAIL_FROM="TripSync <avisos@seudominio.com>"
```

> Sem `RESEND_API_KEY` o app funciona normalmente; apenas o envio de lembretes fica desativado. Com o remetente de teste do Resend, os e-mails só chegam ao endereço da sua conta Resend.

## Estrutura do projeto

```
TripSync/
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── app/
│       │   ├── components/   # Header, Footer, RequireAuth
│       │   ├── context/      # AuthContext (JWT)
│       │   ├── pages/        # Trips, TripDetail, Recommendations, Notifications, Properties...
│       │   └── layouts/
│       └── lib/
│           ├── axios.ts      # Instância configurada + tratamento de erros
│           └── utils.ts
└── backend/           # Express + Prisma
    ├── prisma/
    │   ├── schema.prisma     # User, Property, Booking, Review, Trip, TripActivity, Comment...
    │   ├── migrations/
    │   └── seed.js           # Dados de demonstração
    ├── tests/                # Testes de API
    ├── scripts/              # Migração de imagens antigas
    ├── uploads/              # Fotos enviadas (ignorado pelo Git)
    └── src/
        ├── app.js            # Configuração do Express
        ├── index.js          # Inicialização do servidor e do agendador
        ├── controllers/      # Viagens, atividades, checklist, notificações, clima...
        ├── routes/
        ├── services/         # E-mail, agendador de lembretes, OpenWeather
        ├── middleware/
        │   └── auth.js       # Verificação JWT
        ├── lib/
        │   ├── tripAccess.js # Permissões por papel na viagem
        │   └── uploads.js    # Pasta e tipos de imagem aceitos
        └── data/
            └── checklistTemplates.js
```

## API Endpoints

### Auth
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Entrar
- `GET /api/auth/me` — Dados do usuário logado *(auth)*

### Trips
- `GET /api/trips` — Minhas viagens (como dono ou colaborador) *(auth)*
- `POST /api/trips` — Criar viagem *(auth)*
- `GET /api/trips/:tripId` — Detalhe completo *(auth, participante)*
- `PUT /api/trips/:tripId` — Editar *(auth, dono)*
- `DELETE /api/trips/:tripId` — Excluir *(auth, dono)*
- `GET /api/trips/:tripId/history` — Histórico de alterações *(auth, participante)*
- `GET /api/trips/checklist/templates` — Modelos de checklist *(auth)*

### Colaboradores
- `GET /api/trips/:tripId/collaborators` — Listar *(auth, participante)*
- `POST /api/trips/:tripId/collaborators` — Convidar por e-mail *(auth, dono)*
- `DELETE /api/trips/:tripId/collaborators/:userId` — Remover ou sair da viagem *(auth, dono ou o próprio)*

### Atividades e comentários
- `GET /api/trips/:tripId/activities` — Listar *(auth, participante)*
- `POST /api/trips/:tripId/activities` — Criar, com verificação de conflito *(auth, editor)*
- `PUT /api/trips/:tripId/activities/:activityId` — Editar *(auth, editor)*
- `DELETE /api/trips/:tripId/activities/:activityId` — Remover *(auth, editor)*
- `GET /api/trips/:tripId/activities/:activityId/comments` — Listar comentários *(auth, participante)*
- `POST /api/trips/:tripId/activities/:activityId/comments` — Comentar *(auth, editor)*
- `DELETE /api/trips/:tripId/activities/:activityId/comments/:commentId` — Remover *(auth, autor ou dono)*

### Checklist
- `GET /api/trips/:tripId/checklist` — Checklist com progresso *(auth, participante)*
- `POST /api/trips/:tripId/checklist` — Gerar a partir do tipo da viagem *(auth, editor)*
- `POST /api/trips/:tripId/checklist/items` — Adicionar item *(auth, editor)*
- `PATCH /api/trips/:tripId/checklist/items/:itemId` — Marcar/desmarcar *(auth, editor)*
- `DELETE /api/trips/:tripId/checklist/items/:itemId` — Remover item *(auth, editor)*

### Lembretes
- `GET /api/notifications/my` — Meus lembretes *(auth)*
- `POST /api/notifications/schedule` — Agendar lembrete *(auth, participante)*
- `POST /api/notifications/test` — Enviar e-mail de teste *(auth, participante)*
- `DELETE /api/notifications/:id` — Remover lembrete *(auth, autor)*

### Clima e recomendações
- `GET /api/weather/:city` — Clima atual (público)
- `GET /api/weather/forecast/:city` — Previsão de até 5 dias (público)
- `GET /api/recommendations/suggest` — Hospedagens para os destinos das próximas viagens *(auth)*, aceita `?limit=`

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

### Payments
- `GET /api/payments/booking/:id` — Dados da reserva para pagamento *(auth, hóspede)*
- `POST /api/payments/process` — Pagar com `credit_card`, `pix` ou `boleto` *(auth, hóspede)*
- `POST /api/payments/booking/:id/confirm` — Simula a confirmação do banco para PIX/boleto *(auth, hóspede)*

> Pagamento simulado: cartões terminados em `0000` são recusados, para demonstrar o fluxo de erro. PIX e boleto ficam pendentes até a confirmação simulada.

### Uploads
- `POST /api/uploads/image` — Envia uma foto (`multipart/form-data`, campo `image`, JPG/PNG/WEBP/GIF até 5MB) e devolve a URL *(auth)*
- `GET /uploads/:arquivo` — Serve as imagens enviadas (público)

### Reviews
- `GET /api/reviews/property/:id` — Avaliações de um imóvel (público)
- `POST /api/reviews` — Criar avaliação *(auth, exige reserva prévia)*
- `DELETE /api/reviews/:id` — Remover avaliação própria *(auth, autor)*

### Health
- `GET /api/health` — Status da API
