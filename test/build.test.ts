/* Copyright (c) 2022 Richard Rodger and other contributors, MIT License */


import {
  EnvLambda
} from '../build'


import {
  res_dynamo_yml
} from '../yml/res_dynamo_yml'


describe('build', () => {

  test('happy.lambda', () => {
    expect(EnvLambda).toBeDefined()
  })


  test('res_dynamo_yml', async () => {
    const model = {
      main: {
        ent: {
          qaz: {
            foo: {
              id: {
                field: 'id'
              },
              field: {
                id: {
                  kind: 'String',
                  label: 'ID',
                },
                bar_id: {
                  label: 'Bar',
                  kind: 'EntKey',
                },
                title: {
                  label: 'Title',
                  kind: 'String',
                },
                lot: {
                  label: 'Lot',
                  kind: 'String',
                }
              },
              index: {
                lot: {
                  field: 'lot'
                }
              },
              dynamo: {
                active: true
              },
              stage: {
                active: true
              },
            },
          },
        },
      },
    }

    const dr0: any = []
    const yml0 = await res_dynamo_yml(model,
      { dynamoResources: dr0, region: 'us-east-1', accountid: 'ACCID' })

    // TODO: validate
    console.log(yml0, dr0)
  })
})
