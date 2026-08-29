
import { Gubu } from 'gubu'

const { Skip } = Gubu


// A message's metadata, from either declaration shape: the contents of a
// legacy '$' leaf, or a declared-shape definition with its `pat` removed
// (util.ts msgentries strips it, since the pattern is not metadata).
//
// The declared fields below are the ones @voxgig/model's message schema
// names. They are Skip()ed rather than required because a definition declares
// only what it needs, and because a legacy '$' leaf carries none of them.
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
