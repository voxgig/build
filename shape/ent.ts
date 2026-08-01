
import { Gubu } from 'gubu'

const { Open, Skip } = Gubu


// Open: entities may carry extra attributes beyond the deployment-relevant
// ones below (e.g. `ux` for frontend view hints), which this generator ignores.
const EntShape = Gubu(Open({
  id: {
    field: 'id'
  },
  title: 'Title',
  field: Open({}).Child({
  }),
  valid: Open({}),
  index: Open({}).Child({
  }),
  resource: Open({
    name: ''
  }),
  dynamo: Open({
    active: false,
    prefix: '',
    suffix: '',
  }),
  stage: Open({
    active: false
  }),
  custom: Skip(String),
}), { prefix: 'Entity' })


export {
  EntShape
}
