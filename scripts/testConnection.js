var neo4j = require('neo4j-driver');

(async () => {
  const URI = 'neo4j+s://ed8f2344.databases.neo4j.io'
  const USER = 'ed8f2344'
  const PASSWORD = 'YeAp_vlUwCHX3AQq7APrBeR2toDUjsGC4bgHqiOE20E'

  let driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
  
  try {
    const serverInfo = await driver.getServerInfo()
    console.log('✅ Conexión establecida')
    console.log(serverInfo)
  } catch(e) {
    console.error('❌ Error:', e.message)
  } finally {
    await driver.close()
  }
})();