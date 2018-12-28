const uuid = require('uuid')
const { Command } = require('./protocol/command')
const path = require('path')

class Context {
  constructor (ws) {
    Reflect.defineProperty(this, 'ws', {
      value: ws
    })
    Reflect.defineProperty(this, 'requestId', {
      value: uuid()
    })
    Reflect.defineProperty(this, 'state', {
      value: {}
    })
    Reflect.defineProperty(this, 'conf', {
      value: {
        debug: true
      }
    })
    this.state.tempDir = path.resolve(process.cwd(), './tarscli', `./${this.requestId}`)
    this.state.distDir = path.resolve(process.cwd())
  }

  send (cmd, json) {
    const c = new Command[cmd]()
    c.readFromObject(json)
    const msg = Buffer.concat([Buffer.from(cmd + '\0'), c.toBinBuffer().toNodeBuffer()])
    this.ws.send(msg)
  }

  print (data) {
    this.send('Print', {
      data
    })
  }
}

module.exports = Context
