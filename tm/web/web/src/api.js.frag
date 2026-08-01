// Thin client over the Seneca bus. Entity CRUD goes to the ONE generic
// backend service (aim:ent,cmd:*), parameterised by the entity canon — so
// the same four calls serve every entity in the model. Auth/settings use
// the gateway auth wrappers.

import { bus } from './bus.js'

// ---- generic entity CRUD ------------------------------------------------

async function list(ent, q) {
  const r = await bus.post({ aim: 'ent', cmd: 'list', ent, q: q || {} })
  return (r && r.ok && r.list) || []
}

async function load(ent, id) {
  const r = await bus.post({ aim: 'ent', cmd: 'load', ent, id })
  return r && r.ok ? r.item : null
}

async function save(ent, item) {
  return bus.post({ aim: 'ent', cmd: 'save', ent, item })
}

async function remove(ent, id) {
  return bus.post({ aim: 'ent', cmd: 'remove', ent, id })
}

// Users, for reference pickers (read-only, public fields).
async function users() {
  return list('sys/user')
}

// ---- auth / settings ----------------------------------------------------

async function loadAuth() {
  return bus.post('aim:req,on:auth,load:auth')
}

async function signin(email, password) {
  return bus.post('aim:req,on:auth,signin:user', { email, password })
}

async function signout() {
  return bus.post('aim:req,on:auth,signout:user')
}

async function changePass(password) {
  return bus.post({ aim: 'req', on: 'auth', change: 'pass', password })
}

async function updateUser(data) {
  return bus.post({ aim: 'req', on: 'auth', update: 'user', data })
}

async function remindPass(email) {
  return bus.post({ aim: 'req', on: 'auth', remind: 'pass', email })
}

export {
  list,
  load,
  save,
  remove,
  users,
  loadAuth,
  signin,
  signout,
  changePass,
  updateUser,
  remindPass,
}
