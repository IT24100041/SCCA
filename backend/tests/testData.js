const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../app");

const assertStatus = (res, status, label) => {
  if (res.status !== status) {
    throw new Error(
      `${label} failed: expected ${status}, got ${res.status}. Response: ${JSON.stringify(res.body)}`
    );
  }
  console.log(`PASS - ${label}`);
};

const run = async () => {
  let mongo;

  try {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());

    console.log("Running API tests with sample data...");

    const register = await request(app).post("/api/users/register").send({
      name: "Admin User",
      email: "admin@sparklenz.com",
      password: "123456",
      role: "admin",
    });
    assertStatus(register, 201, "Register admin user");
    const token = register.body.token;

    const authed = (method, path) => {
      return request(app)[method](path).set("Authorization", `Bearer ${token}`);
    };

    const packageCreate = await authed("post", "/api/packages").send({
      name: "Gold",
      price: 45000,
      description: "Monthly package",
      features: ["10 posts", "2 reels"],
    });
    assertStatus(packageCreate, 201, "Create package");
    const packageId = packageCreate.body._id;

    const packageList = await authed("get", "/api/packages");
    assertStatus(packageList, 200, "Get packages");

    const packageUpdate = await authed("put", `/api/packages/${packageId}`)
      .send({ price: 50000 });
    assertStatus(packageUpdate, 200, "Update package");

    const badPackage = await authed("post", "/api/packages").send({
      name: "Basic",
      price: 10000,
    });
    assertStatus(badPackage, 400, "Invalid package name validation");

    const subscriptionCreate = await authed("post", "/api/subscriptions")
      .send({
        clientName: "Client A",
        packageId,
        status: "active",
      });
    assertStatus(subscriptionCreate, 201, "Create subscription");
    const subscriptionId = subscriptionCreate.body._id;

    const subscriptionUpdate = await authed("put", `/api/subscriptions/${subscriptionId}`)
      .send({ status: "paused" });
    assertStatus(subscriptionUpdate, 200, "Update subscription");

    const userCreate = await authed("post", "/api/users").send({
      name: "Admin User",
      email: "manager@sparklenz.com",
      password: "123456",
      role: "manager",
    });
    assertStatus(userCreate, 201, "Create user");
    const userId = userCreate.body._id;

    const userRead = await authed("get", `/api/users/${userId}`);
    assertStatus(userRead, 200, "Get user by id");

    const userUpdate = await authed("put", `/api/users/${userId}`).send({ role: "staff" });
    assertStatus(userUpdate, 200, "Update user");

    const taskCreate = await authed("post", "/api/tasks").send({
      title: "Create social media calendar",
      description: "Plan monthly posts",
      assignedTo: "Nimal",
      status: "pending",
    });
    assertStatus(taskCreate, 201, "Create task");
    const taskId = taskCreate.body._id;

    const taskUpdate = await authed("put", `/api/tasks/${taskId}`)
      .send({ status: "completed" });
    assertStatus(taskUpdate, 200, "Update task");

    const paymentCreate = await authed("post", "/api/payments").send({
      clientName: "Client A",
      amount: 25000,
      method: "bank-transfer",
      status: "paid",
      note: "Advance payment",
    });
    assertStatus(paymentCreate, 201, "Create payment");
    const paymentId = paymentCreate.body._id;

    const paymentUpdate = await authed("put", `/api/payments/${paymentId}`)
      .send({ status: "refunded" });
    assertStatus(paymentUpdate, 200, "Update payment");

    const metricCreate = await authed("post", "/api/metrics").send({
      campaignName: "April Leads Drive",
      platform: "Facebook",
      impressions: 15000,
      reach: 8000,
      engagement: 1200,
      leads: 110,
    });
    assertStatus(metricCreate, 201, "Create metric");
    const metricId = metricCreate.body._id;

    const metricUpdate = await authed("put", `/api/metrics/${metricId}`)
      .send({ leads: 125 });
    assertStatus(metricUpdate, 200, "Update metric");

    const metricDelete = await authed("delete", `/api/metrics/${metricId}`);
    assertStatus(metricDelete, 200, "Delete metric");

    const paymentDelete = await authed("delete", `/api/payments/${paymentId}`);
    assertStatus(paymentDelete, 200, "Delete payment");

    const taskDelete = await authed("delete", `/api/tasks/${taskId}`);
    assertStatus(taskDelete, 200, "Delete task");

    const userDelete = await authed("delete", `/api/users/${userId}`);
    assertStatus(userDelete, 200, "Delete user");

    const subscriptionDelete = await authed("delete", `/api/subscriptions/${subscriptionId}`);
    assertStatus(subscriptionDelete, 200, "Delete subscription");

    const packageDelete = await authed("delete", `/api/packages/${packageId}`);
    assertStatus(packageDelete, 200, "Delete package");

    console.log("All sample data API tests passed.");
  } catch (error) {
    console.error("Test run failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    if (mongo) {
      await mongo.stop();
    }
  }
};

run();
