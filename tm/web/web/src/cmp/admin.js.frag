// Entity admin: a django-admin-style generic CRUD UI, driven entirely by
// the compiled model (fetched from /model.json). The entity_admin plugin
// owns the model + per-entity message mapping (state); the
// <vg-entity-admin> component renders nav / list / form and talks to the
// plugin (and through it, the backend) only via bus messages.

import { bus, emit } from '../bus.js'


// Fields managed by the system, not the form.
const SYS_FIELDS = ['id', 'owner_id', 't_c', 't_m', 't_mh', 't_ch']


bus.use(function entity_admin() {
  const seneca = this

  let model = null

  // Entities from the model: [{ zone, name, canon, fields }]
  function entities() {
    const out = []
    const ent = (model && model.main.ent) || {}
    for (const zone of Object.keys(ent)) {
      if ('sys' === zone) {
        continue
      }
      for (const name of Object.keys(ent[zone])) {
        out.push({
          zone,
          name,
          canon: zone + '/' + name,
          fields: ent[zone][name].field || {},
        })
      }
    }
    return out
  }

  // Message mapping convention: entity zone/name -> aim:<zone>,<verb>:<name>.
  function msgFor(canon, verb) {
    const [zone, name] = canon.split('/')
    return { aim: zone, [verb]: name }
  }

  seneca.add('cmp:entity_admin,load:model', function (msg, reply) {
    if (model) {
      return reply({ ok: true, entities: entities() })
    }
    fetch('/model.json').then((r) => r.json()).then((m) => {
      model = m
      reply({ ok: true, entities: entities() })
    }).catch((e) => reply({ ok: false, why: String(e) }))
  })

  seneca.add('cmp:entity_admin,list:item', function (msg, reply) {
    this.act(msgFor(msg.canon, 'list'), function (err, out) {
      reply(err ? { ok: false, why: err.message } : out)
    })
  })

  seneca.add('cmp:entity_admin,save:item', function (msg, reply) {
    this.act({ ...msgFor(msg.canon, 'save'), item: msg.item },
      function (err, out) {
        if (!err && out.ok) {
          emit('entity', { canon: msg.canon })
        }
        reply(err ? { ok: false, why: err.message } : out)
      })
  })

  seneca.add('cmp:entity_admin,remove:item', function (msg, reply) {
    this.act({ ...msgFor(msg.canon, 'remove'), id: msg.id },
      function (err, out) {
        if (!err && out.ok) {
          emit('entity', { canon: msg.canon })
        }
        reply(err ? { ok: false, why: err.message } : out)
      })
  })
})


function inputFor(fname, fdef, value) {
  const kind = (fdef && fdef.kind) || 'String'
  const val = null == value ? '' : value
  if ('Boolean' === kind) {
    return `<input name="${fname}" type="checkbox" ${true === value ? 'checked' : ''} />`
  }
  if ('Number' === kind) {
    return `<input name="${fname}" type="number" value="${val}" />`
  }
  return `<input name="${fname}" type="text" value="${String(val).replace(/"/g, '&quot;')}" />`
}


class VgEntityAdmin extends HTMLElement {
  constructor() {
    super()
    this.canon = null
    this.editing = null   // item being edited, or {} for new
  }

  connectedCallback() {
    this.render()
  }

  async render() {
    const res = await bus.post('cmp:entity_admin,load:model')
    if (!res.ok) {
      this.innerHTML = `<p>model load failed: ${res.why}</p>`
      return
    }
    this.entities = res.entities
    if (null == this.canon && 0 < res.entities.length) {
      this.canon = res.entities[0].canon
    }

    const nav = res.entities.map((e) =>
      `<a href="#" class="vg-nav ${e.canon === this.canon ? 'sel' : ''}"
        data-canon="${e.canon}">${e.canon}</a>`).join(' ')

    this.innerHTML = `
      <div class="vg-admin">
        <nav>${nav}</nav>
        <div id="vg-list"></div>
        <div id="vg-form"></div>
      </div>`

    for (const a of this.querySelectorAll('.vg-nav')) {
      a.onclick = (ev) => {
        ev.preventDefault()
        this.canon = a.dataset.canon
        this.editing = null
        this.render()
      }
    }

    await this.renderList()
    this.renderForm()
  }

  entdef() {
    return this.entities.find((e) => e.canon === this.canon)
  }

  async renderList() {
    const out = await bus.post('cmp:entity_admin,list:item',
      { canon: this.canon })
    const items = (out.ok && out.list) || []
    const fields = Object.keys(this.entdef().fields)
      .filter((f) => !SYS_FIELDS.includes(f))

    const head = fields.map((f) => `<th>${f}</th>`).join('')
    const rows = items.map((item) => `
      <tr data-id="${item.id}">
        ${fields.map((f) => `<td>${null == item[f] ? '' : item[f]}</td>`).join('')}
        <td>
          <button class="vg-edit" data-id="${item.id}">edit</button>
          <button class="vg-del" data-id="${item.id}">delete</button>
        </td>
      </tr>`).join('')

    this.querySelector('#vg-list').innerHTML = `
      <h2>${this.canon} <button id="vg-new">new</button></h2>
      <table class="vg-table">
        <thead><tr>${head}<th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p id="vg-count">${items.length} item${1 === items.length ? '' : 's'}</p>`

    this.items = items
    this.querySelector('#vg-new').onclick = () => {
      this.editing = {}
      this.renderForm()
    }
    for (const b of this.querySelectorAll('.vg-edit')) {
      b.onclick = () => {
        this.editing = this.items.find((i) => i.id === b.dataset.id)
        this.renderForm()
      }
    }
    for (const b of this.querySelectorAll('.vg-del')) {
      b.onclick = async () => {
        await bus.post('cmp:entity_admin,remove:item',
          { canon: this.canon, id: b.dataset.id })
        this.editing = null
        await this.renderList()
        this.renderForm()
      }
    }
  }

  renderForm() {
    const box = this.querySelector('#vg-form')
    if (null == this.editing) {
      box.innerHTML = ''
      return
    }

    const def = this.entdef()
    const fields = Object.keys(def.fields)
      .filter((f) => !SYS_FIELDS.includes(f))

    box.innerHTML = `
      <form class="vg-entity-form">
        <h3>${this.editing.id ? 'Edit' : 'New'} ${this.canon}</h3>
        ${fields.map((f) => `
          <label>${(def.fields[f] && def.fields[f].label) || f}
            ${inputFor(f, def.fields[f], this.editing[f])}
          </label>`).join('')}
        <button type="submit">Save</button>
        <button type="button" id="vg-cancel">Cancel</button>
        <div id="vg-form-err"></div>
      </form>`

    box.querySelector('#vg-cancel').onclick = () => {
      this.editing = null
      this.renderForm()
    }

    box.querySelector('form').onsubmit = async (ev) => {
      ev.preventDefault()
      const item = { ...(this.editing.id ? { id: this.editing.id } : {}) }
      for (const f of fields) {
        const input = box.querySelector(`[name="${f}"]`)
        const kind = (def.fields[f] && def.fields[f].kind) || 'String'
        if ('Boolean' === kind) {
          item[f] = input.checked
        }
        else if ('' === input.value) {
          // Blank optional field: leave unset (don't send an empty string;
          // an optional/Skip field rejects '').
          continue
        }
        else {
          item[f] = 'Number' === kind ? Number(input.value) : input.value
        }
      }
      const res = await bus.post('cmp:entity_admin,save:item',
        { canon: this.canon, item })
      if (!res.ok) {
        box.querySelector('#vg-form-err').textContent =
          'save failed: ' + (res.why || '')
      }
      else {
        this.editing = null
        await this.renderList()
        this.renderForm()
      }
    }
  }
}

customElements.define('vg-entity-admin', VgEntityAdmin)
