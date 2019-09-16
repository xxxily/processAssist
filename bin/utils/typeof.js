function getType (obj) {
  return Object.prototype.toString.call(obj).toLowerCase().replace(/^\[object\s/, '').replace(/\]$/, '')
}

function isObj (obj) {
  return getType(obj) === 'object'
}

function isErr (obj) {
  return getType(obj) === 'error'
}

function isArg (obj) {
  return getType(obj) === 'arguments'
}

module.exports = { getType, isObj, isErr, isArg }
