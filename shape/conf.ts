
import { Gubu } from 'gubu'

const { Open } = Gubu


const CloudConfShape = Gubu(Open({
  aws: {
    region: 'us-east-1',
    accountid: 'AWS-ACCOUNT-ID',
  }
}), { prefix: 'CloudConf' })


export {
  CloudConfShape
}
