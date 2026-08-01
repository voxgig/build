import { principalOf, validCanon, scopeOf, myProjectIds, publicUser } from './access'

// aim:ent,cmd:load  { ent:'zone/name', id }
module.exports = function make_cmd_load() {
  return async function cmd_load(this: any, msg: any, meta: any) {
    const seneca = this
    const model = seneca.context.model
    const canon = String(msg.ent || '')
    if (!validCanon(model, canon)) {
      return { ok: false, why: 'unknown-entity' }
    }
    const user = principalOf(meta)
    if (!user) {
      return { ok: false, why: 'not-authenticated' }
    }

    const item = await seneca.entity(canon).load$(msg.id)
    if (!item) {
      return { ok: true, item: null }
    }

    const scope = scopeOf(model, canon)

    if ('open' === scope.kind) {
      return { ok: true, item: publicUser(item) }
    }
    if ('user' === scope.kind) {
      return item.owner_id === user.id
        ? { ok: true, item }
        : { ok: false, why: 'forbidden' }
    }

    const myIds = await myProjectIds(seneca, user.id)
    const pid = 'project' === scope.kind ? item.id : item[(scope as any).via]
    return myIds.indexOf(pid) >= 0
      ? { ok: true, item }
      : { ok: false, why: 'forbidden' }
  }
}
