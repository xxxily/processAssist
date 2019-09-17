# processAssist

> 新开子程序脚本助理，实现子父进程间函数共享与互调 

## 安装
使用 npm:
``` bash
npm i process-assist  
```

使用 yarn:
``` bash 
yarn add process-assist 
```

## 使用示例
父进程脚本（parentProcess.js）
``` javascript
const ProcessAssist = require('process-assist')
const PA = new ProcessAssist()

// 以fork的形式初始化子进程
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
const ProcessAssist = require('process-assist')

const shareMethod = {
  test (info) {
    console.log('test info:', info)
    return 'test method result ' + info
  }
}

// 子进程将想要共享的方法公开出去，即可在父进程中调用
new ProcessAssist(shareMethod)

```

## new ProcessAssist([publicLibs], [childProcess])
初始化基本实例:
```javascript
const ProcessAssist = require('process-assist')
const PA = new ProcessAssist()
```
* @param publicLibs {Object} -可选 要共享给父程序调用的的方法对象
* @param childProcess {child_process} -可选 要进行通讯交流的子程序

进行初始化时，publicLibs、childProcess两个参数均为可选。  
作为父程序初始化时，一般无需进行函数共享，所以第一个参数为空，第二个参数是要控制的子程序模块，如果你已经有子程序实例，则可传入来进行初始化，如果没有，也可用通过后面的fork方法进行初始化。  

如果是作为子程序，初始化时一般需要传入第一个参数，共享给父程序调用的方法对象，只有共享出去的方法，父程序才能能通过run方法调用。


## 实例api
### fork()
以fork的模式运行nodejs的脚本模块，所有参数与child_process.fork参数完全一致  
详情请参考：http://nodejs.cn/api/child_process.html#child_process_child_process_fork_modulepath_args_options  

只有通过fork函数执行的脚本模块才会有IPC通道，而该脚本的实现完全基于IPC通道的消息传递机制，所以只支持fork的形式。  

基本示例：
```javascript
PA.fork('./childProcess.js')
```

父程序初始化ProcessAssist时传入fork方法产生的子程序对象和执行fork方法产生子程序对象后都会初始化child相关的初始化逻辑，才会有下面的child下面的系列方法。   

### child.run(conf)
执行子程序共享的方法，执行完成后通知父程序执行结果

* @param conf {Object} -必选 执行的配置 
* @param conf.name {String} -必选 要操作或执行的命令/函数的名称，即子程序共享出来的方法名/函数名  
* @param conf.params {Array} -可选 执行函数时要附带的执行参数，必须是类似arguments的数组参数  
* @param conf.timeout {Number} -可选 子程序函数执行超时的限制，单位毫秒，默认不设置超时上限    
* @param conf.id {String} -可选 配置id，id作为子程序执行完成后的回调关联依据，一般由程序自动生成
* @return {Promise<*>} 返回一个Promise对象，子程序方法调用完成后回执行resolve回调 

假如子程序共享了以下方法列表： 
```javascript
// childProcess.js
const ProcessAssist = require('process-assist')

const shareMethod = {
  test (info) {
    console.log('test info:', info)
    return 'test method result ' + info
  },
  libs:{
    info (info) {
      console.log('log info:', info)
    },
    async promiseTest () {
      return new Promise((resolve, reject) => {
        setTimeout(function () {
          resolve('promise resolve')
        }, 1000 * 3)
      })
    }
  }
}

new ProcessAssist(shareMethod)
```

父程序要调用子程序的test方法，则：
```javascript
PA.child.run({
  name: 'test'
})
```

调用子程序的test方法，并传入函数的运行参数：
```javascript
PA.child.run({
  name: 'test',
  params: ['test params 001']
})
```

调用子程序的libs下面的log方法，并传入函数的运行参数：
```javascript
PA.child.run({
  name: 'libs.info',
  params: 'hello'
})
```
此处有两个特点：
* 通过`.`可以调用对象下的子属性
* 传参时如果不为数组或arguments，则全部作为第一个参数处理


调用子程序的libs下面的promiseTest方法，并传限定方法执行的超时时间：
```javascript
PA.child.run({
  name: 'libs.promiseTest',
  timeout: 1000
}).then(function(result) {
  console.log(result)
})
```

因为promiseTest设置了3s后才执行resolve，而此处限定了1s后视为超时，则最终结果返回为：
```javascript
{
  conf: {
    name: 'libs.promiseTest',
    timeout: 1000,
    id: '15686229463521020253'
  },
  result: '',
  error: '运行超时'
}
```
如果不设置超时，则3s后返回如下结果：
```javascript
{
  conf: { name: 'libs.promiseTest', id: '15686230316773467593' },
  result: 'promise resolve',
  error: false
}
```

` 注意： 无论子程序的方法执行是出错还是被reject了，父程序都会得到resolve的结果，只是结果值中会出现error值，父程序通过判断error值来了解子程序的函数执行情况。这样设计的目的是无论子程序执行结果如何都不影响父程序的持续运行。 `


### child.kill(signal)
结束对子程序的占用，释放资源

```javascript
PA.child.kill()
```

### child.destroy(signal)
跟child.kill一样

### child.process
子程序对象，即通过fork衍生出来的进程对象。
你可以通过：
```javascript
PA.child.process.kill()
```
来结束子程序，但一般不推荐这么做，因为这只是单纯结束了子程序，其它关联的内存占用还没被结束，推荐使用 `child.kill()` 或 `child.destroy()` 方法结束子程序。  
