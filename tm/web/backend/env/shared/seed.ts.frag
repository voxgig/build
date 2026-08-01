// Demo/seed data for local development. The web runner already seeds the
// predefined users; add your DOMAIN seed data here (projects, lists, items,
// ...). Runs once per boot against the in-memory store. Create-once —
// customise freely.

export async function seedDemo(
  seneca: any,
  usersByEmail: Record<string, any>,
): Promise<void> {
  // Nothing seeded by default. Example (uncomment and adapt to your model):
  //
  // const owner = Object.values(usersByEmail)[0]
  // if (!owner) return
  // const existing = await seneca.entity('proj/project').list$({})
  // if (existing.length > 0) return
  // const now = Date.now()
  // const p = await seneca.entity('proj/project')
  //   .data$({ name: 'Example', owner_id: owner.id, t_c: now, t_m: now }).save$()
  // await seneca.entity('proj/member')
  //   .data$({ project_id: p.id, user_id: owner.id, role: 'owner',
  //            owner_id: owner.id, t_c: now, t_m: now }).save$()
}
