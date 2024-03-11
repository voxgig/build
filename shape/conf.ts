
import { Gubu } from 'gubu'

const { Open } = Gubu


const CloudConfShape = Gubu(Open({
  aws: {
    region: 'us-east-1',
    accountid: 'AWS-ACCOUNT-ID',
    bedrock: {
      model: 'BEDROCK-MODEL',
    },
  }
}), { prefix: 'CloudConf' })


const CoreConfShape = Gubu(Open({
  name: String
}), { prefix: 'CoreConf' })


export {
  CoreConfShape,
  CloudConfShape,
}
