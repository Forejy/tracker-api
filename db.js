require('dotenv').config();
const { MongoClient } = require('mongodb');

let db;

async function connectToDb() {
  const client = new MongoClient(process.env.DB_URL, { useUnifiedTopology: true });
  await client.connect();
  db = client.db();
}

async function getNextSequence(name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { current: 1 } },
    { returnOriginal: false },
  );

  return result.value.current;
}

function getDb() {
  return db;
}

module.exports = { connectToDb, getNextSequence, getDb };
