const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, resetDatabase, createUser, api, daysFromNow } = require("./helpers");

let owner;
let collaborator;
let viewer;
let outsider;
let trip;

before(async () => {
  await resetDatabase();
  owner = await createUser("Dona");
  collaborator = await createUser("Colaborador");
  viewer = await createUser("Visualizador");
  outsider = await createUser("Estranho");

  const res = await api(owner).post("/api/trips").send({
    title: "Praia",
    destination: "Florianópolis",
    tripType: "BEACH",
    startDate: daysFromNow(10, 8),
    endDate: daysFromNow(15, 18),
  });
  trip = res.body;
  await api(owner).post(`/api/trips/${trip.id}/collaborators`).send({ email: collaborator.email, role: "COLLABORATOR" });
  await api(owner).post(`/api/trips/${trip.id}/collaborators`).send({ email: viewer.email, role: "VIEWER" });
});

after(() => prisma.$disconnect());

test("valida tipo e período da viagem", async () => {
  const badType = await api(owner).post("/api/trips").send({
    title: "X",
    tripType: "SPACE",
    startDate: daysFromNow(1),
    endDate: daysFromNow(2),
  });
  assert.equal(badType.status, 400);

  const badPeriod = await api(owner).post("/api/trips").send({
    title: "X",
    startDate: daysFromNow(5),
    endDate: daysFromNow(2),
  });
  assert.equal(badPeriod.status, 400);
});

test("quem não participa não vê a viagem e id inválido vira 404", async () => {
  assert.equal((await api(outsider).get(`/api/trips/${trip.id}`)).status, 403);
  assert.equal((await api(owner).get("/api/trips/abc")).status, 404);
});

test("rota de templates não é confundida com id de viagem", async () => {
  const res = await api(owner).get("/api/trips/checklist/templates");
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 8);
});

test("visualizador não cria atividade, colaborador cria", async () => {
  const activity = {
    title: "Trilha",
    startTime: daysFromNow(11, 8),
    endTime: daysFromNow(11, 12),
  };
  assert.equal((await api(viewer).post(`/api/trips/${trip.id}/activities`).send(activity)).status, 403);
  const created = await api(collaborator).post(`/api/trips/${trip.id}/activities`).send(activity);
  assert.equal(created.status, 201);
});

test("detecta conflito de horário e atividade fora do período", async () => {
  const conflict = await api(owner).post(`/api/trips/${trip.id}/activities`).send({
    title: "Almoço",
    startTime: daysFromNow(11, 11),
    endTime: daysFromNow(11, 13),
  });
  assert.equal(conflict.status, 400);
  assert.equal(conflict.body.conflictingActivities.length, 1);

  const outside = await api(owner).post(`/api/trips/${trip.id}/activities`).send({
    title: "Antes da viagem",
    startTime: daysFromNow(2, 8),
    endTime: daysFromNow(2, 9),
  });
  assert.equal(outside.status, 400);
});

test("comentários: colaborador comenta, dona pode apagar", async () => {
  const { body: activities } = await api(owner).get(`/api/trips/${trip.id}/activities`);
  const activityId = activities[0].id;
  const comment = await api(collaborator)
    .post(`/api/trips/${trip.id}/activities/${activityId}/comments`)
    .send({ content: "Levo água" });
  assert.equal(comment.status, 201);

  const viewerComment = await api(viewer)
    .post(`/api/trips/${trip.id}/activities/${activityId}/comments`)
    .send({ content: "Oi" });
  assert.equal(viewerComment.status, 403);

  const removed = await api(owner).delete(
    `/api/trips/${trip.id}/activities/${activityId}/comments/${comment.body.id}`
  );
  assert.equal(removed.status, 200);
});

test("só a dona edita a viagem e a alteração vai para o histórico", async () => {
  assert.equal((await api(collaborator).put(`/api/trips/${trip.id}`).send({ title: "Hack" })).status, 403);

  const updated = await api(owner).put(`/api/trips/${trip.id}`).send({ title: "Praia 2026" });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, "Praia 2026");

  const { body: history } = await api(viewer).get(`/api/trips/${trip.id}/history`);
  const actions = history.map((event) => event.action);
  assert.ok(actions.includes("TRIP_CREATED"));
  assert.ok(actions.includes("ACTIVITY_ADDED"));
  assert.ok(actions.includes("TRIP_UPDATED"));
});

test("checklist é gerada pelo tipo da viagem", async () => {
  const res = await api(owner).post(`/api/trips/${trip.id}/checklist`);
  assert.equal(res.status, 201);
  assert.ok(res.body.items.some((item) => item.title.includes("Protetor Solar")));
  assert.equal((await api(owner).post(`/api/trips/${trip.id}/checklist`)).status, 409);
});

test("colaborador pode sair da viagem", async () => {
  const res = await api(viewer).delete(`/api/trips/${trip.id}/collaborators/${viewer.id}`);
  assert.equal(res.status, 200);
  assert.equal((await api(viewer).get(`/api/trips/${trip.id}`)).status, 403);
});
