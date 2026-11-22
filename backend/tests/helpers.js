require("dotenv").config();
const { execSync } = require("child_process");
const path = require("path");

function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/tripsync_test";
  return url.toString();
}

process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.UPLOAD_DIR = path.join(require("os").tmpdir(), "tripsync-test-uploads");

execSync("npx prisma migrate deploy", {
  cwd: path.join(__dirname, ".."),
  env: process.env,
  stdio: "ignore",
});

const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/prisma");

async function resetDatabase() {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
}

let counter = 0;

async function createUser(name = "Usuário") {
  counter += 1;
  const email = `user${counter}_${Date.now()}@test.dev`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name, email, password: "senha123" });
  return { ...res.body.user, token: res.body.token, email };
}

function api(user) {
  const agent = {};
  for (const method of ["get", "post", "put", "patch", "delete"]) {
    agent[method] = (url) => {
      const req = request(app)[method](url);
      return user ? req.set("Authorization", `Bearer ${user.token}`) : req;
    };
  }
  return agent;
}

function daysFromNow(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

module.exports = { app, prisma, resetDatabase, createUser, api, daysFromNow };
