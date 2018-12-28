const WebSocket = require('ws')
const byt = require('byt')
const commandHandleFac = require('./commandHandle')
const uuid = require('uuid')
const path = require('path')

const wss = new WebSocket.Server({ port: 8080,
  maxPayload: byt('1gb')
})

wss.on('connection', function connection (ws) {
  const requestId = '1234'
  // 定义一个上下文对象
  ws.conf = {
    debug: true
  }
  ws.state = {
    requestId,
    tempDir: path.resolve(process.cwd(), './.temp', `./${requestId}`)
  }
  ws.log = function (...args) {
    if (!this.conf.debug) return
    args.unshift('debugLog>>>\t')
    this.send(args.join(' '))
    console.log(...args)
  }
  ws.sendStr = function (...args) {
    args.unshift('remote>>>\t')
    this.send(args.join(' '))
  }
  const cmdHandler = commandHandleFac(ws)
  ws.on('message', async function (message) {
    try {
      const [cmd, cmdData] = cmdHandler.deserialize(message)
      await cmdHandler[cmd](ws, ws.state, cmdData)
    } catch (error) {
      ws.sendStr(error)
    }
  })
  ws.on('error', err => {
    ws.log(err)
    ws.close()
  })
})
