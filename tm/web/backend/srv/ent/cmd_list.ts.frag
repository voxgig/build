import { principalOf, validCanon, scopeOf, myProjectIds, publicUser } from './access'

// aim:ent,cmd:list  { ent:'zone/name', q?:{...} }
// Lists entities the caller is allowed to see, scoped by project membership.
module.exports = function make_cmd_list() {
  return async function cmd_list(this: any, msg: any, meta: any) {
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
    const q = Object.assign({}, msg.q)

    if ('user' === scope.kind) {
      q.owner_id = user.id
      return { ok: true, list: await seneca.entity(canon).list$(q) }
    }

    if ('open' === scope.kind) {
      // sys/user: limited fields, for assignment pickers.
      const list = await seneca.entity(canon).list$(q)
      return { ok: true, list: list.map(publicUser) }
    }

    const myIds = await myProjectIds(seneca, user.id)

    if ('project' === scope.kind) {
      const projects: any[] = []
      for (const id of myIds) {
        const p = await seneca.entity('proj/project').load$(id)
        if (p) {
          projects.push(p)
        }
      }
      return { ok: true, list: projects }
    }

    // 'scoped': filter by project_id ref.
    const via = (scope as any).via
    if (null != q[via]) {
      if (myIds.indexOf(q[via]) < 0) {
        return { ok: false, why: 'forbidden' }
      }
      return { ok: true, list: await seneca.entity(canon).list$(q) }
    }

    // No project filter given: union across all my projects.
    let all: any[] = []
    for (const pid of myIds) {
      const sub = Object.assign({}, q)
      sub[via] = pid
      all = all.concat(await seneca.entity(canon).list$(sub))
    }
    return { ok: true, list: all }
  }
}
