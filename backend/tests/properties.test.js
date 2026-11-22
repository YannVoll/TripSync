const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { prisma, resetDatabase, createUser, api, daysFromNow } = require("./helpers");

let host;
let guest;
let property;

const baseProperty = {
  title: "Pousada",
  description: "Perto da praia",
  type: "POUSADA",
  address: "Rua A, 1",
  city: "Florianópolis",
  state: "SC",
  pricePerNight: "200",
  maxGuests: "4",
  bedrooms: "2",
  bathrooms: "1",
  amenities: ["Wi-Fi"],
};

before(async () => {
  await resetDatabase();
  host = await createUser("Anfitrião");
  guest = await createUser("Hóspede");
  property = (await api(host).post("/api/properties").send(baseProperty)).body;
});

after(() => prisma.$disconnect());

test("cadastro valida campos e converte números", async () => {
  assert.equal(property.pricePerNight, 200);
  assert.equal(property.ownerId, host.id);
  const invalid = await api(host).post("/api/properties").send({ ...baseProperty, pricePerNight: "-5" });
  assert.equal(invalid.status, 400);
});

test("edição ignora campos protegidos como ownerId", async () => {
  const res = await api(host)
    .put(`/api/properties/${property.id}`)
    .send({ title: "Pousada Nova", ownerId: guest.id, active: false });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, "Pousada Nova");
  assert.equal(res.body.ownerId, host.id);
  assert.equal(res.body.active, true);

  assert.equal((await api(guest).put(`/api/properties/${property.id}`).send({ title: "x" })).status, 403);
});

test("reserva: valida datas, calcula preço e bloqueia conflito", async () => {
  const past = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(-3),
    checkOut: daysFromNow(-1),
  });
  assert.equal(past.status, 400);

  const booking = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(10),
    checkOut: daysFromNow(13),
  });
  assert.equal(booking.status, 201);
  assert.equal(booking.body.totalPrice, 600);

  const conflict = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(12),
    checkOut: daysFromNow(14),
  });
  assert.equal(conflict.status, 409);

  const own = await api(host).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(20),
    checkOut: daysFromNow(21),
  });
  assert.equal(own.status, 400);
});

test("pagamento aprova cartão e recusa reserva cancelada", async () => {
  const booking = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(30),
    checkOut: daysFromNow(31),
  });
  const paid = await api(guest).post("/api/payments/process").send({
    bookingId: booking.body.id,
    method: "credit_card",
    cardData: { number: "4111 1111 1111 1111" },
  });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.booking.paymentStatus, "PAID");

  const other = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(40),
    checkOut: daysFromNow(41),
  });
  await api(guest).delete(`/api/bookings/${other.body.id}`);
  const cancelled = await api(guest).post("/api/payments/process").send({
    bookingId: other.body.id,
    method: "pix",
  });
  assert.equal(cancelled.status, 400);
});

test("PIX fica pendente até a confirmação simulada", async () => {
  const booking = await api(guest).post("/api/bookings").send({
    propertyId: property.id,
    checkIn: daysFromNow(60),
    checkOut: daysFromNow(62),
  });
  const notGenerated = await api(guest).post(`/api/payments/booking/${booking.body.id}/confirm`);
  assert.equal(notGenerated.status, 400);

  const pix = await api(guest).post("/api/payments/process").send({ bookingId: booking.body.id, method: "pix" });
  assert.equal(pix.body.booking.paymentStatus, "PENDING");
  assert.ok(pix.body.pixCode);

  assert.equal((await api(host).post(`/api/payments/booking/${booking.body.id}/confirm`)).status, 403);

  const confirmed = await api(guest).post(`/api/payments/booking/${booking.body.id}/confirm`);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.booking.paymentStatus, "PAID");
  assert.equal(confirmed.body.booking.status, "CONFIRMED");
});

test("upload aceita imagem, recusa outros arquivos e serve o arquivo", async () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const upload = await api(host)
    .post("/api/uploads/image")
    .attach("image", png, { filename: "foto.png", contentType: "image/png" });
  assert.equal(upload.status, 201);
  assert.match(upload.body.url, /^\/uploads\/.+\.png$/);

  const served = await api().get(upload.body.url);
  assert.equal(served.status, 200);

  const text = await api(host)
    .post("/api/uploads/image")
    .attach("image", Buffer.from("oi"), { filename: "nota.txt", contentType: "text/plain" });
  assert.equal(text.status, 400);

  assert.equal((await api().post("/api/uploads/image")).status, 401);

  const updated = await api(host).put(`/api/properties/${property.id}`).send({ imageUrl: upload.body.url });
  assert.equal(updated.body.imageUrl, upload.body.url);

  const base64 = await api(host)
    .put(`/api/properties/${property.id}`)
    .send({ imageUrl: "data:image/png;base64,AAAA" });
  assert.equal(base64.status, 400);
});

test("recomendações sugerem hospedagens do destino sem expor viagens alheias", async () => {
  await api(host).post("/api/trips").send({
    title: "Viagem secreta do anfitrião",
    destination: "Florianópolis",
    startDate: daysFromNow(5),
    endDate: daysFromNow(7),
  });
  await api(guest).post("/api/trips").send({
    title: "Minha viagem",
    destination: "Florianópolis, SC",
    startDate: daysFromNow(50),
    endDate: daysFromNow(55),
  });

  const res = await api(guest).get("/api/recommendations/suggest?limit=3");
  assert.equal(res.status, 200);
  assert.equal(res.body.items[0].id, property.id);
  assert.equal(res.body.items[0].reason, "trip");
  assert.ok(!JSON.stringify(res.body).includes("Viagem secreta"));
});
