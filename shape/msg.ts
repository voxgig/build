
import { Gubu } from 'gubu'

const { Skip } = Gubu


// Contents of '$' leaf
const MsgMetaShape = Gubu({
  file: Skip(String),
  params: Skip({}),
  transport: Skip({
    queue: {
      active: false,
      timeout: Number,
      suffix: String,
    }
  }),
}, { prefix: 'MsgMeta' })


export {
  MsgMetaShape
}
