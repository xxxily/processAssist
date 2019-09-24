const { fork } = require('child_process')
const utils = require('./utils/index')

class ProcessAssist {
  /**
   * @param publicLibs {Object} -可选 要共享给父程序调用的的方法对象
   * @param childProcess {child_process} -可选 要进行通讯交流的子程序
   */
  constructor (publicLibs, childProcess) {
    this.libs = publicLibs || {}
    this.childProcess = childProcess || null
    this.child = {}
    this._id_ = 0
    this._callbackLibs_ = {}

    this._getId_ = () => {
      this._id_ += 1
      return this._id_
    }

    this._initChildProcessAssist_(this.childProcess)

    /* 监听来自父程序的调用消息，并且根据消息内容执行对应操作 */
    process.on('message', msg => this.onMessage(msg))
  }

  onMessage (msg) {
    const isInvokeMsg = utils.isObj(msg) &&
      utils.isObj(msg.conf) &&
      typeof msg.conf.id === 'string' &&
      typeof msg.conf.name === 'string' &&
      typeof msg.command === 'string' &&
      this[msg.command] instanceof Function

    if (isInvokeMsg) {
      this[msg.command](msg)
    }
  }

  /**
   * 执行当前程序共享的方法，执行完成后通知父程序执行结果
   * @param msg {Object} -必选 执行的消息
   * @param msg.command {String} -必选 执行的命令，用于校验
   * @param msg.conf {Object} -必选 执行的配置
   * @param msg.conf.id {String} -必选 配置id，程序要根据id号给父程序发送对应的回调信息
   * @param msg.conf.name {String} -必选 要操作或执行的命令/函数/属性名称
   * @param msg.conf.params {Array} -可选 执行函数时要附带的执行参数，必须是类似arguments的数组参数
   * @param msg.conf.timeout {Number} -可选 子程序函数执行超时的限制，单位毫秒，默认不设置超时上限
   */
  async run (msg) {
    const { conf, command } = msg

    if (command !== 'run') {
      console.error('消息格式有误，无法执行此操作')
      return false
    }

    const { name } = conf
    let params = conf.params

    const data = utils.getValByPath(this.libs, name, true)
    const func = data.result
    const result = {
      conf,
      result: '',
      error: false
    }

    if (func instanceof Function) {
      let funcResult = null
      try {
        /* 将不合法的传参转为合法的数组 */
        if (!(utils.isArg(params) || Array.isArray(params))) {
          params = [params]
        }

        funcResult = func.apply(data.chain.pop(), params)
      } catch (e) {
        result.error = e
      }

      if (utils.isPromise(funcResult)) {
        await funcResult.then((data) => {
          result.result = data || ''
        }).catch((err) => {
          result.error = err
        })
      } else {
        result.result = funcResult || ''
      }
    } else {
      result.error = '没找到要执行的函数，可能子程序还未共享此函数，也可能您执行了一个错误的命令'
    }

    /* IPC通道无法传送错误类型的对象，须把错误转为必要的文本描述 */
    if (utils.isErr(result.error)) {
      result.error = result.error.stack ? result.error.stack.toString() : result.error.toString()
    }

    /* 执行完成后通知父程序执行结果 */
    process.send && process.send({
      conf,
      result,
      command: 'resultHandler'
    })
  }

  /* 执行由this.child.run产生的回调函数 */
  resultHandler (msg) {
    const t = this
    const { conf, command, result } = msg

    if (command !== 'resultHandler') {
      console.error('消息格式有误，无法执行此操作')
      return false
    }

    let callbackList = []
    if (Array.isArray(t._callbackLibs_[conf.id])) {
      callbackList = t._callbackLibs_[conf.id]
    } else if (t._callbackLibs_[conf.id] instanceof Function) {
      callbackList.push(t._callbackLibs_[conf.id])
    }

    callbackList.forEach(function (callback) {
      if (callback instanceof Function) {
        const arg = [result, conf, command]
        callback.apply(null, arg)
      }
    })

    /* 清空队列释放内存 */
    t._callbackLibs_[conf.id] = []
  }

  /**
   * child_process.fork参数完全一致
   * http://nodejs.cn/api/child_process.html#child_process_child_process_fork_modulepath_args_options
   */
  fork () {
    this.childProcess = fork.apply(null, arguments)
    this._initChildProcessAssist_(this.childProcess)
  }

  _initChildProcessAssist_ (childProcess) {
    const t = this
    if (!childProcess) return false

    if (!childProcess.send) {
      console.error('不是通过IPC通道衍生的子进程，无法进行childProcessAssist的初始化操作')
      return false
    }

    const childId = Date.now() + '' + utils.random(100000, 999999)

    t.child = {
      childId,
      process: childProcess,
      async run (conf) {
        /* 如果是字符串则作为要执行的方法名称处理 */
        if (typeof conf === 'string') {
          conf = { name: conf }
        }

        const result = {
          conf,
          result: '',
          timeout: false,
          error: false
        }

        /**
         * 子程序的异常不应该影响父程序的运作
         * 所以这里始终为resolve
         * 父程序通过判断result.error来判断结果是否出错
         * */

        if (!utils.isObj(conf) || typeof conf.name !== 'string') {
          result.error = '要运行的配置参数不正确，无法执行相关操作'
          return Promise.resolve(result)
        }

        conf.id = conf.id || childId + '' + t._getId_()
        let timer = null

        if (!Array.isArray(t._callbackLibs_[conf.id])) {
          t._callbackLibs_[conf.id] = []
        }

        return new Promise((resolve, reject) => {
          /* 将回调方法推入_callbackLibs_，等待resultHandler执行 */
          const callback = function (result) {
            clearTimeout(timer)
            resolve(result)
          }

          t._callbackLibs_[conf.id].push(callback)

          /* 超时限定 */
          if (typeof conf.timeout === 'number') {
            timer = setTimeout(function () {
              result.timeout = true
              result.error = '运行超时'

              /* 模拟触发回调操作，返回超时结果 */
              t.resultHandler({
                conf,
                result,
                command: 'resultHandler'
              })
            }, conf.timeout)
          }

          /* 向子程序发送执行指令消息 */
          childProcess.send({
            command: 'run',
            conf
          })
        })
      },
      /* 结束对子程序的占用 */
      kill (signal) {
        childProcess.kill(signal)
        t.child = null
        t._callbackLibs_ = {}
        t._id_ = 0
      },
      /* kill的别名 */
      destroy: (signal) => t.child.kill(signal)
    }

    /* 监听来自子程序的消息 */
    childProcess.on('message', msg => t.onMessage(msg))
  }
}
module.exports = ProcessAssist
