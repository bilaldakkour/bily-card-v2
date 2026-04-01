import { connectDb } from '../src/modules/db/connection'

async function run() {
  await connectDb()
  console.log('ok')
}
run().catch((e) => { console.error(e); process.exit(1) })
