import { getSeneca } from '$$envFolder$$/$$start$$'

function complete(seneca: any) {$$complete$$
}

exports.handler = async (
  event:any,
  context:any
) => {
  $$modify$$
  let seneca = await getSeneca('$$name$$', complete)
  $$prepare$$
  let handler = seneca.export('gateway-lambda/$$handler$$')
  let res = await handler(event, context)
  return res
}

