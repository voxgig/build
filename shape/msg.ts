
import { Gubu } from 'gubu'

const { Skip } = Gubu


const MsgMetaShape = Gubu({
  file: Skip(String),
  params: Skip({}),

  // Declared shape only.
  doc: Skip(String),
  out: Skip({}),
  web: Skip({}),
  api: Skip({}),

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
