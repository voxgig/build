import { principalOf, validCanon, scopeOf, myProjectIds } from './access'

// aim:ent,cmd:save  { ent:'zone/name', item:{...} }
// Create or update, enforcing project-membership access. Creating a
// proj/project auto-adds the creator as an owner member.
module.exports = function make_cmd_save() {
  return async function cmd_save(this: any, msg: any, meta: any) {
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

    const data = Object.assign({}, msg.item)
    const now = Date.now()
    const isNew = null == data.id

    if ('user' === scope.kind) {
      if (!isNew) {
        const existing = await seneca.entity(canon).load$(data.id)
        if (existing && existing.owner_id !== user.id) {
          return { ok: false, why: 'forbidden' }
        }
      }
      data.owner_id = user.id
    }
    else if ('project' === scope.kind) {
      if (!isNew) {
        const myIds = await myProjectIds(seneca, user.id)
        if (myIds.indexOf(data.id) < 0) {
          return { ok: false, why: 'forbidden' }
        }
      }
      data.owner_id = data.owner_id || user.id
    }
    else {
      // 'scoped': must target a project the caller is a member of.
      const via = (scope as any).via
      const pid = data[via]
      if (null == pid) {
        return { ok: false, why: 'project-required' }
      }
      const myIds = await myProjectIds(seneca, user.id)
      if (myIds.indexOf(pid) < 0) {
        return { ok: false, why: 'forbidden' }
      }
      data.owner_id = data.owner_id || user.id
    }

    if (isNew) {
      data.t_c = now
    }
    data.t_m = now

    const item = await seneca.entity(canon).data$(data).save$()

    // Creating a project makes the creator its first (owner) member.
    if ('project' === scope.kind && isNew && item) {
      await seneca.entity('proj/member').data$({
        project_id: item.id,
        user_id: user.id,
        role: 'owner',
        owner_id: user.id,
        t_c: now,
        t_m: now,
      }).save$()
    }

    return { ok: !!item, item }
  }
}
