import Yaml from 'js-yaml'

import { dive, get, pinify, camelify } from '@voxgig/model'


import { indent } from '../util'

import { EntShape } from '../shape/ent'




async function res_dynamo_yml(model: any, spec: {
  region: string,
  accountid: string,
  dynamoResources: any[]
}): Promise<string> {
  let entries = dive(model.main.ent)
  let ymlparts = []

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]

    let path = entry[0]
    let ent = EntShape(entry[1])

    // console.log('DYNAMO', path, ent)

    if (ent && false !== ent.dynamo?.active) {
      let pathname = path
        .map((p: string) =>
          (p[0] + '').toUpperCase() + p.substring(1))
        .join('')
      let name = ent.resource?.name || pathname
      let resname = ent.resource?.name || 'Table' + pathname

      let stage_suffix = ent.stage?.active ? '.${self:provider.stage,"dev"}' : ''

      let tablename =
        ent.dynamo.prefix +
        name +
        ent.dynamo.suffix +
        stage_suffix

      ent.dynamo = {
        tablename,
      }


      spec.dynamoResources.push({
        arn: `arn:aws:dynamodb:${spec.region}:${spec.accountid}:table/${tablename}`
      })

      const res_def: any = {
        [resname]: {
          Type: 'AWS::DynamoDB::Table',
          DeletionPolicy: 'Retain',
          Properties: {
            TableName: tablename,
            BillingMode: "PAY_PER_REQUEST",
            PointInTimeRecoverySpecification: {
              PointInTimeRecoveryEnabled: "true",
            },
            DeletionProtectionEnabled: true,
            AttributeDefinitions: [
              {
                AttributeName: ent.id.field,
                AttributeType: "S"
              }
            ],
            KeySchema: [
              {
                AttributeName: ent.id.field,
                KeyType: 'HASH'
              }
            ]
          }
        }
      }

      if (ent.index) {
        const indexEntries = Object.entries(ent.index)
        if (0 < indexEntries.length) {
          res_def[resname].Properties.GlobalSecondaryIndexes =
            indexEntries.map((entry: any[]) => ({
              IndexName: entry[0],
              KeySchema: [{
                AttributeName: entry[1].field,
                KeyType: 'HASH',
              }],
              Projection: {
                ProjectionType: "ALL"
              }
            }))
        }
      }

      const ymlsrc = Yaml.dump(res_def)
      ymlparts.push(ymlsrc)
    }
  }

  return ymlparts.join('\n\n\n')
}




export {
  res_dynamo_yml
}


