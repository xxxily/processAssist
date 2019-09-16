const ProcessAssist = require('../bin/processAssist')
const PA = new ProcessAssist()
PA.fork('./childProcess')

// 调用子进程公开的方法
PA.child.run({
  name: 'test',
  params: ['test params 001']
}).then(function (result) {
  console.log(result)
})

// 调用子进程未公开或不存在的方法（测试）
PA.child.run({
  name: 'childFunc'
}).then(function (result) {
  console.log(result)
})
