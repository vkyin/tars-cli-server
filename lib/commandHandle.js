const Command = require('./protocol/command').Command
const { TarsInputStream, BinBuffer } = require('@tars/stream')
const fs = require('fs')
const path = require('path')
const util = require('util')
const extract = util.promisify(require('extract-zip'))
const mkdirp = util.promisify(require('mkdirp'))
const localConf = require('./../conf')

module.exports = {
  deserialize (ctx, nodebuffer) {
    const i = nodebuffer.indexOf(0x0)
    if (i <= 0) {
      throw new Error('invalid cmd')
    }
    const command = nodebuffer.slice(0, i).toString()
    const data = nodebuffer.slice(i + 1)
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
  async TarsPatch (ctx, { tempDir }, {
    appName, serverName, codeZipPkg
  }) {
    const filename = serverName + '.zip'
    const codePkgPath = path.resolve(tempDir, filename)
    const decompressDir = path.resolve(path.dirname(codePkgPath), path.basename(codePkgPath, '.zip'))
    ctx.print('正在创建代码目录')
    await mkdirp(path.dirname(codePkgPath))
    ctx.print('正在转换压缩包: ', filename)
    fs.writeFileSync(codePkgPath, codeZipPkg)
    ctx.print('正在解压压缩包: ', filename)
    await extract(codePkgPath, {
      dir: decompressDir
    })
    const cmd = path.resolve(`npx tars-web patch ${appName} ${serverName} -u ${localConf.tarswebUrl}`)
    ctx.print('正在执行tars-patch脚本：' + cmd)
    const { exec } = require('child_process')
    await new Promise((resolve, reject) => {
      const subProcess = exec(cmd, {
        cwd: decompressDir
      }, (err, stdout, stderr) => {
        if (err) reject(err)
        resolve()
      })
      subProcess.stdout.on('data', (chunk) => {
        ctx.print(chunk)
      })
      subProcess.stderr.on('data', (chunk) => {
        ctx.print(chunk)
      })
    })
  },
  async TarsDeploy (ctx, { tempDir }, {
    serverName, codeZipPkg
  }) {
    const filename = serverName + '.zip'
    const codePkgPath = path.resolve(tempDir, filename)
    const decompressDir = path.resolve(path.dirname(codePkgPath), path.basename(codePkgPath, '.zip'))
    ctx.print('正在创建代码目录')
    await mkdirp(path.dirname(codePkgPath))
    ctx.print('正在转换压缩包: ', filename)
    fs.writeFileSync(codePkgPath, codeZipPkg)
    ctx.print('正在解压压缩包: ', filename)
    await extract(codePkgPath, {
      dir: decompressDir
    })
    ctx.print('正在执行tars-deploy脚本')
    const tarsDeployCmdPath = path.resolve(process.cwd(), './node_modules/.bin/tars-deploy')
    const { exec } = require('child_process')
    await new Promise((resolve, reject) => {
      const subProcess = exec(`${tarsDeployCmdPath} ${serverName}`, {
        cwd: decompressDir
      }, (err, stdout, stderr) => {
        if (err) reject(err)
        resolve()
      })
      subProcess.stdout.on('data', (chunk) => {
        ctx.print(chunk)
      })
      subProcess.stderr.on('data', (chunk) => {
        ctx.print(chunk)
      })
    })
    const tgzPath = path.resolve(decompressDir, `${serverName}.tgz`)
    ctx.print('编译成功。', tgzPath)
    ctx.send('Savefile', {
      filename: `${serverName}.tgz`,
      filebuff: fs.readFileSync(tgzPath)
    })
  },
  async SaveFile (ctx, { distDir }, data) {
    const dist = path.resolve(distDir, data.fileName)
    await mkdirp(distDir)
    fs.writeFileSync(dist, data.filebuff)
    console.log('文件下载成功')
  },
  async Print (ctx, state, data) {
    console.log(data.data)
  }
}
