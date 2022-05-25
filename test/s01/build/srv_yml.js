
const { EnvLambda } = require('../../..')


module.exports = async function(model, build) {
  EnvLambda.srv_yml(model, {
    folder: __dirname+'/../gen/lambda'
  })
}
