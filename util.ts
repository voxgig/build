

function indent(text: string, size: number) {
  let lines = text.split('\n')
  const prefix = ' '.repeat(size)
  lines = lines.map(line => prefix + line + '\n')
  const tout = lines.join('')
  return tout
}


// A message definition declares its pattern as a LIST, so it is told apart
// from a chain node - whose values are always maps, the next pattern level or
// the '$' leaf - even when spelled `pat:`. Same discriminator @voxgig/model
// validates the declared shape with.
function ismsgdef(val: any): boolean {
  return null != val && 'object' === typeof val &&
    !Array.isArray(val) && Array.isArray(val.pat)
}


// The pattern of a definition, flattened to the pair sequence [k,v,k,v,...]
// the chain walk produces. A malformed pair is skipped rather than thrown on:
// @voxgig/model fails the build on those, so one arriving here came from
// somewhere else and dropping it degrades better than crashing a generator.
function msgdefpairs(def: any): string[] {
  const pairs: string[] = []

  for (const pair of def.pat) {
    if (null == pair || 'object' !== typeof pair || Array.isArray(pair)) {
      continue
    }
    const keys = Object.keys(pair)
    if (1 === keys.length) {
      pairs.push(keys[0], pair[keys[0]])
    }
  }

  return pairs
}


function msgentries(node: any, depth: number = 128): [string[], any][] {
  const out: [string[], any][] = []
  walkmsgs(node, [], depth, out)
  return out
}


function walkmsgs(
  node: any, prefix: string[], depth: number, out: [string[], any][]) {

  if (null == node || 'object' !== typeof node) {
    return
  }

  if (Array.isArray(node)) {
    for (const def of node) {
      if (ismsgdef(def)) {
        const meta = { ...def }
        delete meta.pat
        out.push([prefix.concat(msgdefpairs(def)), meta])
      }
    }
    return
  }

  for (const key of Object.keys(node)) {
    const child = node[key]

    if ('$' === key) {
      out.push([prefix.slice(), child])
    }
    else if (depth <= 1 || null == child || 'object' !== typeof child ||
      0 === Object.keys(child).length) {
      out.push([prefix.concat(key), child])
    }
    else {
      walkmsgs(child, prefix.concat(key), depth - 1, out)
    }
  }
}


function aimmsgs(msg: any, aim: string): [string[], any][] {
  return msgentries(msg)
    .filter((entry) => 'aim' === entry[0][0] && aim === entry[0][1])
    .map((entry) => [entry[0].slice(2), entry[1]] as [string[], any])
}


function msgindex(msg: any): Record<string, any> {
  const index: Record<string, any> = {}
  for (const entry of msgentries(msg)) {
    index[entry[0].join(',')] = entry[1]
  }
  return index
}


export {
  indent,
  ismsgdef,
  msgentries,
  aimmsgs,
  msgindex,
}
