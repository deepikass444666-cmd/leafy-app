// MongoDB Schemas & Sample API (Node.js / Express)
// Deploy this as a Vercel serverless function OR on a small EC2/Lambda

const { MongoClient, ObjectId } = require('mongodb');

// ─── SCHEMAS (conceptual — MongoDB is schema-less but follow these shapes) ───

/*
  Collection: users
  {
    _id: ObjectId,
    name: "Plant Parent",
    email: "user@example.com",
    passwordHash: "...",
    emailReminders: true,
    reminderTime: "08:00",
    timezone: "Asia/Kolkata",
    createdAt: Date
  }

  Collection: plants
  {
    _id: ObjectId,
    userId: ObjectId,          // ref → users
    name: "Monstera Deliciosa",
    emoji: "🪴",
    type: "Tropical",
    location: "Living Room",
    waterEveryDays: 7,
    lastWatered: Date,
    lastFertilised: Date,
    sunlight: "indirect",      // direct / indirect / low
    notes: "Loves humidity",
    health: 90,                // 0-100 score
    createdAt: Date
  }

  Collection: care_logs
  {
    _id: ObjectId,
    plantId: ObjectId,         // ref → plants
    userId: ObjectId,
    action: "watered",         // watered / fertilised / repotted / misted
    date: Date,
    notes: ""
  }
*/

// ─── VERCEL API ROUTES (/api/*.js) ───

// /api/plants/index.js — GET all plants for user
module.exports.getPlants = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('leafy');
  // In production: get userId from JWT token in Authorization header
  const userId = req.query.userId;
  const plants = await db.collection('plants')
    .find({ userId: new ObjectId(userId) })
    .sort({ lastWatered: 1 })
    .toArray();
  await client.close();
  res.json(plants);
};

// /api/plants/add.js — POST new plant
module.exports.addPlant = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('leafy');
  const plant = {
    ...req.body,
    userId: new ObjectId(req.body.userId),
    lastWatered: new Date(),
    createdAt: new Date(),
    health: 100
  };
  const result = await db.collection('plants').insertOne(plant);
  await client.close();
  res.json({ id: result.insertedId });
};

// /api/plants/water.js — POST mark plant as watered
module.exports.waterPlant = async (req, res) => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('leafy');
  const { plantId, userId } = req.body;

  await db.collection('plants').updateOne(
    { _id: new ObjectId(plantId) },
    { $set: { lastWatered: new Date() } }
  );

  await db.collection('care_logs').insertOne({
    plantId: new ObjectId(plantId),
    userId: new ObjectId(userId),
    action: 'watered',
    date: new Date()
  });

  await client.close();
  res.json({ success: true });
};
