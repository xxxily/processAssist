/**
 * 工具方法
 * */
const helper = {
  /**
   * 模拟睡眠等待
   * @param time {number} -可选 等待时间，默认1000*1 ms
   * @returns {Promise<any>}
   */
  sleep (time) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve(true)
      }, time || 1000 * 1)
    })
  },

  /**
   * 根据文本路径获取对象里面的值
   * @param obj {Object} -必选 要操作的对象
   * @param path {String} -必选 路径信息
   * @returns {*}
   */
  getValByPath (obj, path) {
    path = path || ''
    const pathArr = path.split('.')
    let result = obj

    /* 递归提取结果值 */
    for (let i = 0; i < pathArr.length; i++) {
      if (!result) break
      result = result[pathArr[i]]
    }

    return result
  },

  /* 判断一个对象是否为Promise对象 */
  isPromise (obj) {
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function'
  }
}
module.exports = helper
