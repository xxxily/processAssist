const ProcessAssist = require('../bin/processAssist')
const PA = new ProcessAssist()
PA.fork('./childProcess')

PA.child.run({
  name: 'test',
  params: ['test params 001']
}).then(function (result) {
  console.log(result)
})
