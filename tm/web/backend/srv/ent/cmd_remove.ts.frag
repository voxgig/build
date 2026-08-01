import { principalOf, validCanon, scopeOf, myProjectIds } from './access'

// aim:ent,cmd:remove  { ent:'zone/name', id }
module.exports = function make_cmd_remove() {
  return async function cmd_remove(this: any, msg: any, meta: any) {
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

    const scope = scopeOf(model, canon)
    if ('open' === scope.kind) {
      return { ok: false, why: 'read-only' }
    }

    const item = await seneca.entity(canon).load$(msg.id)
    if (!item) {
      return { ok: true }
    }

    if ('user' === scope.kind) {
      if (item.owner_id !== user.id) {
        return { ok: false, why: 'forbidden' }
      }
    }
    else {
      const myIds = await myProjectIds(seneca, user.id)
      const pid = 'project' === scope.kind ? item.id : item[(scope as any).via]
      if (myIds.indexOf(pid) < 0) {
        return { ok: false, why: 'forbidden' }
      }
    }

    await seneca.entity(canon).remove$(msg.id)
    return { ok: true }
  }
}
