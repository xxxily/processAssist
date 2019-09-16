const ProcessAssist = require('../bin/processAssist')

const shareMethod = {
  test (info) {
    console.log('test info:', info)
  }
}

// eslint-disable-next-line no-new
new ProcessAssist(shareMethod)
