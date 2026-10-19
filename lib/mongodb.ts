import { MongoClient } from 'mongodb'

const MONGO_URI = process.env.DB_URL || 'mongodb://localhost:27017/'
const DB_NAME = 'nbapredictor'
const COLLECTION_NAME = 'nbapredictor'

const client = new MongoClient(MONGO_URI)

export async function getPredictionCollection() {
  await client.connect()

  const db = client.db(DB_NAME)
  const collectionNames = await db.listCollections({ name: COLLECTION_NAME }).toArray()

  if (collectionNames.length === 0) {
    await db.createCollection(COLLECTION_NAME)
  }

  const collection = db.collection(COLLECTION_NAME)
  const indexes = await collection.listIndexes().toArray()
  const hasUniqueMatchIdIndex = indexes.some(
    (index) => index.key && index.key.matchId === 1 && index.unique === true
  )

  if (!hasUniqueMatchIdIndex) {
    await collection.createIndex({ matchId: 1 }, { unique: true })
  }

  return collection
}
