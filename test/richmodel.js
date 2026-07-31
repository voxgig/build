// Synthetic model exercising all EnvLambda branches.
module.exports = {
  main: {
    conf: {
      core: { name: 'rich' },
      cloud: { aws: { region: 'eu-west-1', accountid: 'ACC123' } },
    },
    ent: {
      qaz: {
        foo: {
          id: { field: 'id' },
          field: { id: { kind: 'String', label: 'ID' }, lot: { kind: 'String', label: 'Lot' } },
          index: { lot: { field: 'lot' } },
          dynamo: { active: true },
          stage: { active: true },
        },
        plain: { field: { id: { kind: 'String' } } },
      },
    },
    msg: {
      aim: {
        alpha: {
          run: { job: { $: { transport: { queue: { active: true, timeout: 99, suffix: '01' } } } } },
          get: { info: {} },
        },
        beta: {
          push: { thing: { $: { transport: { queue: { active: true, timeout: 44, suffix: 'q2' } } } } },
        },
      },
    },
    srv: {
      alpha: {
        in: { aim: { alpha: {} } },
        out: { aim: { beta: { push: { thing: {} } } } },
        on: {
          ingest: {
            provider: 'aws',
            events: [
              { source: 'sqs', qrn: 'QueueAimAlphaRunJob' },
              { source: 's3', bucket: 'bkt1', event: 's3:ObjectCreated:*', rules: { prefix: 'in/', suffix: '.txt' }, msg: 'aim:alpha,run:job' },
              { source: 'schedule', recur: 'rate(5 minutes)', msg: { aim: 'alpha', run: 'job' } },
            ],
          },
        },
        api: { web: { active: false, path: {}, method: 'POST', cors: { active: false } } },
        env: { lambda: { active: true, timeout: 55, memory: 2048, kind: 'standard', handler: { path: { prefix: 'dist/handler/lambda/', suffix: '.handler' } } } },
      },
      beta: {
        in: { aim: { beta: {} } },
        api: { web: { active: true, path: { prefix: '/api/', area: 'public/', suffix: '' }, method: 'POST,GET', cors: { active: true, props: { headers: "['A','B']", maxAge: 3 } } } },
        env: { lambda: { active: true, timeout: 30, kind: 'standard', handler: { path: { prefix: 'dist/handler/lambda/', suffix: '.handler' } } } },
      },
      gamma: {
        in: {},
        api: { web: { active: true, path: { prefix: '/api/', area: 'w/', suffix: '' }, method: 'POST', cors: { active: true }, lambda: { gateway: 'v2' } } },
        env: { lambda: { active: true, timeout: 10, kind: 'standard', handler: { path: { prefix: 'dist/handler/lambda/', suffix: '.handler' } } } },
      },
      delta: {
        gen: { custom: { lambda: { srv_yml: 'delta:\n  custom: override\n' } } },
        api: { web: { active: false, path: {}, method: 'POST', cors: { active: false } } },
        env: { lambda: { active: true, timeout: 5, kind: 'standard', handler: { path: { prefix: 'p/', suffix: '.h' } } } },
      },
      customkind: {
        api: { web: { active: false, path: {}, method: 'POST', cors: { active: false } } },
        env: { lambda: { active: true, timeout: 5, kind: 'custom', handler: { path: { prefix: 'p/', suffix: '.h' } } } },
      },
      nolambda: {
        api: { web: { active: true, path: { prefix: '/api/', area: '', suffix: '' }, method: 'POST', cors: { active: false } } },
        env: {},
      },
    },
  },
}
