const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, resetDatabase, api } = require("./helpers");

before(resetDatabase);
after(() => prisma.$disconnect());

test("cadastro devolve token e não expõe a senha", async () => {
  const res = await api().post("/api/auth/register").send({
    name: "Ana",
    email: "ANA@Test.dev",
    password: "senha123",
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, "ana@test.dev");
  assert.equal(res.body.user.password, undefined);
});

test("cadastro rejeita email duplicado e senha curta", async () => {
  const duplicate = await api().post("/api/auth/register").send({
    name: "Ana",
    email: "ana@test.dev",
    password: "senha123",
  });
  assert.equal(duplicate.status, 409);

  const short = await api().post("/api/auth/register").send({
    name: "Bia",
    email: "bia@test.dev",
    password: "123",
  });
  assert.equal(short.status, 400);
});

test("login com senha errada devolve 401 e com senha certa devolve token", async () => {
  const wrong = await api().post("/api/auth/login").send({ email: "ana@test.dev", password: "errada" });
  assert.equal(wrong.status, 401);

  const ok = await api().post("/api/auth/login").send({ email: "ana@test.dev", password: "senha123" });
  assert.equal(ok.status, 200);

  const me = await api({ token: ok.body.token }).get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.name, "Ana");
});

test("rotas protegidas exigem token válido", async () => {
  assert.equal((await api().get("/api/trips")).status, 401);
  assert.equal((await api({ token: "invalido" }).get("/api/trips")).status, 401);
});
