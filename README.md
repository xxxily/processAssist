# processAssist

> 新开子程序脚本助理，实现子父进程间函数共享与互调

## 安装
``` bash
# npm i processAssist 
or 
# yarn add -D processAssist 
```

## 使用
父进程脚本（parentProcess.js）
``` javascript
const ProcessAssist = require('processAssist')
const PA = new ProcessAssist()

// 已fork的形式初始化子进程
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

```

子进程脚本（childProcess.js）
``` javascript
const ProcessAssist = require('../bin/processAssist')

const shareMethod = {
  test (info) {
    console.log('test info:', info)
    return 'test method result ' + info
  }
}

// 子进程将想要共享的方法公开出去，即可在父进程中调用
new ProcessAssist(shareMethod)

```
