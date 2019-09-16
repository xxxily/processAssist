const typeofLibs = require('./typeof')
const helperLibs = require('./helper')

const utils = {
  ...typeofLibs,
  ...helperLibs
}

module.exports = utils
