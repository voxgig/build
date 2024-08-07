
import { Gubu } from 'gubu'

const { Open, Skip } = Gubu


const EntShape = Gubu({
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
}, { prefix: 'Entity' })


export {
  EntShape
}
