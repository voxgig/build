// Access control for the generic entity service.
//
// Relationships in the model are reference fields (kind:'Ref', ref:'zone/name').
// Access is scoped by PROJECT MEMBERSHIP:
//
//   - proj/project        -> you see/edit projects you are a member of
//   - anything with a project_id ref (todolist, item, member, ...)
//                         -> scoped to projects you are a member of
//   - sys/user            -> read-only, limited fields (for assignment pickers)
//   - anything else       -> falls back to owner scoping (owner_id)
//
// Membership is the proj/member join entity (project_id + user_id).

export type Scope =
  | { kind: 'project' }
  | { kind: 'scoped'; via: string }
  | { kind: 'user' }
  | { kind: 'open' }

export function principalOf(meta: any): any {
  return (meta && meta.custom && meta.custom.principal && meta.custom.principal.user) || null
}

export function entDef(model: any, canon: string): any {
  const [zone, name] = String(canon).split('/')
  return model && model.main && model.main.ent &&
    model.main.ent[zone] && model.main.ent[zone][name] || null
}

export function validCanon(model: any, canon: string): boolean {
  if (!entDef(model, canon)) {
    return false
  }
  const zone = String(canon).split('/')[0]
  // Only sys/user is reachable from the sys zone (for pickers); sys/login etc. are not.
  return 'sys' !== zone || 'sys/user' === canon
}

// Find the reference field that targets proj/project, if any.
function projectRefField(model: any, canon: string): string | null {
  const def = entDef(model, canon)
  const fields = (def && def.field) || {}
  for (const fname of Object.keys(fields)) {
    const f = fields[fname]
    if (f && 'proj/project' === f.ref) {
      return fname
    }
  }
  return null
}

export function scopeOf(model: any, canon: string): Scope {
  if ('proj/project' === canon) {
    return { kind: 'project' }
  }
  if ('sys/user' === canon) {
    return { kind: 'open' }
  }
  const via = projectRefField(model, canon)
  if (via) {
    return { kind: 'scoped', via }
  }
  return { kind: 'user' }
}

// Project ids the given user is a member of.
export async function myProjectIds(seneca: any, userId: string): Promise<string[]> {
  if (!userId) {
    return []
  }
  const members = await seneca.entity('proj/member').list$({ user_id: userId })
  const ids: string[] = []
  for (const m of members) {
    if (null != m.project_id && ids.indexOf(m.project_id) < 0) {
      ids.push(m.project_id)
    }
  }
  return ids
}

export async function isMember(seneca: any, userId: string, projectId: string): Promise<boolean> {
  if (!userId || null == projectId) {
    return false
  }
  const m = await seneca.entity('proj/member').load$({ user_id: userId, project_id: projectId })
  return !!m
}

// Public projection of a user (never expose password/hashes).
export function publicUser(u: any): any {
  return u ? { id: u.id, name: u.name, email: u.email, handle: u.handle } : u
}
