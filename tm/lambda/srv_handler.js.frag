const getSeneca = require('$$envFolder$$/$$start$$')

function complete(seneca: any) {$$complete$$
}

exports.handler = async (
  event,
  context
) => {
  $$modify$$
  let seneca = await getSeneca('$$name$$', complete)
  $$prepare$$
  let handler = seneca.export('gateway-lambda/$$handler$$')
  let res = await handler(event, context)
  return res
}

