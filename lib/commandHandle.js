/// <reference path="./../typings/command.d.ts" />
const Command = require('./protocol/command').Command
const { TarsInputStream, BinBuffer } = require('@tars/stream')
const fs = require('fs')
const path = require('path')
const util = require('util')
const extract = util.promisify(require('extract-zip'))
const mkdirp = util.promisify(require('mkdirp'))

module.exports = (ws) => {
  return {
    deserialize (nodebuffer) {
      const i = nodebuffer.indexOf(0x0)
      ws.log(i)
      if (i <= 0) {
        throw new Error('invalid cmd')
      }
      const command = nodebuffer.slice(0, i).toString()
      const data = nodebuffer.slice(i + 1)
      ws.log('command is', command)
      const CommandClass = Command[command]
      let commandData = null
      if (CommandClass) {
        const binBuffer = new BinBuffer(data)
        const is = new TarsInputStream(binBuffer)
        const d = CommandClass.create(is)
        commandData = d.toObject()
      }
      return [command, commandData]
    },

    /**
     *
     * @param {WebSocket} ws
     * @param {Command.TarsDeploy} data
     */
    async TarsDeploy (ws, { tempDir }, data) {
      ws.log(JSON.stringify(data))
      const filename = data.serverName + '.zip'
      const codePkgPath = path.resolve(tempDir, filename)
      const decompressDir = path.resolve(path.dirname(codePkgPath), path.basename(codePkgPath, '.zip'))
      ws.sendStr('正在创建代码目录')
      await mkdirp(path.dirname(codePkgPath))
      ws.sendStr('正在转换压缩包: ', filename)
      fs.writeFileSync(codePkgPath, data.filebuff)
      ws.sendStr('正在解压压缩包: ', filename)
      await extract(codePkgPath, {
        dir: decompressDir
      })
      ws.sendStr('正在执行tars-deploy脚本')
      const tarsDeployCmdPath = path.resolve(process.cwd(), './node_modules/.bin/tars-deploy')
      const { exec } = require('child_process')
      await new Promise((resolve, reject) => {
        const subProcess = exec(`${tarsDeployCmdPath} ${data.serverName}`, {
          cwd: decompressDir
        }, (err, stdout, stderr) => {
          if (err) reject(err)
          resolve()
        })
        subProcess.stdout.on('data', (chunk) => {
          ws.send(chunk)
        })
        subProcess.stderr.on('data', (chunk) => {
          ws.send(chunk)
        })
      })
      ws.sendStr('编译成功。')
    }
  }
}
