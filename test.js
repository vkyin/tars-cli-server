const WebSocket = require('ws')
const { UploadCodeZip } = require('./lib/protocol/command').Command

function heartbeat () {
  clearTimeout(this.pingTimeout)

  // Use `WebSocket#terminate()` and not `WebSocket#close()`. Delay should be
  // equal to the interval at which your server sends out pings plus a
  // conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    this.terminate()
  }, 30000 + 1000)
}

const client = new WebSocket('ws://localhost:8080/')

client.on('open', heartbeat)
client.on('ping', heartbeat)
client.on('close', function clear () {
  clearTimeout(this.pingTimeout)
})

client.on('message', d => console.log(d))

setTimeout(() => {
  const { TarsDeploy } = require('./lib/protocol/command').Command

  const c = new TarsDeploy()
  c.readFromObject({
    serverName: 'vktest',
    filebuff: require('fs').readFileSync('./test.zip')
  })
  const msg = Buffer.concat([Buffer.from('TarsDeploy\0'), c.toBinBuffer().toNodeBuffer()])
  client.send(msg)
}, 1000)
