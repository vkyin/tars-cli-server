const WebSocket = require('ws')
const Context = require('./lib/Context')
const cmdHandler = require('./lib/commandHandle')

const client = new WebSocket('ws://127.0.0.1:8080/')

const ctx = new Context(client)

client.on('message', async function (message) {
  try {
    const [cmd, cmdData] = cmdHandler.deserialize(ctx, message)
    await cmdHandler[cmd](ctx, ctx.state, cmdData)
  } catch (error) {
    console.log(error)
  }
})

setTimeout(() => {
  ctx.send('SaveFile', {
    fileName: 'vktest',
    filebuff: require('fs').readFileSync('./test.zip')
  })
}, 1000)
