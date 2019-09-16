const ProcessAssist = require('../bin/processAssist')

const shareMethod = {
  test (info) {
    console.log('test info:', info)
    return 'test method result ' + info
  }
}

// 子进程将想要共享的方法公开出去，即可在父进程中调用
// eslint-disable-next-line no-new
new ProcessAssist(shareMethod)
