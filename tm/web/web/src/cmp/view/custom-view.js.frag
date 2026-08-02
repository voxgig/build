// CUSTOM VIEW for $$canon$$ (the model declares ux:{ view: 'custom' } for
// this entity). This file is HAND-CODED and CREATE-ONCE — regeneration will
// NOT overwrite it, so edit it freely. It replaces the generic entity admin
// for this entity.
//
// The app shell sets these properties before calling reload():
//   - canon       : this entity's canon ('$$canon$$')
//   - projectId   : the currently selected project (if project-scoped)
//   - detailId    : a specific row id when opened from elsewhere, else null
//   - onNavigate(canon, id) : ask the shell to open another entity/detail
// Build your UI with the generic helpers in ../../api.js and ../../model.js.

import * as Api from '../../api.js'
import * as Model from '../../model.js'


class $$className$$ extends HTMLElement {
  navigate(canon, id) {
    if (this.onNavigate) {
      this.onNavigate(canon, id)
    }
  }

  async reload() {
    const canon = '$$canon$$'
    const q = {}
    const pf = Model.projectRefField(canon)
    if (pf && this.projectId) {
      q[pf] = this.projectId
    }
    const items = await Api.list(canon, q)
    const labelField = Model.labelField(canon)

    // Starter UI: a simple list. Replace this with your custom view.
    this.innerHTML = `
      <div class="vg-entity">
        <div class="vg-entity-head"><h2>$$Label$$</h2></div>
        <ul>${items.map((it) =>
          `<li>${String(null == it[labelField] ? it.id : it[labelField])}</li>`).join('')
          || '<li class="vg-muted">Nothing yet.</li>'}</ul>
        <p class="vg-hint">Hand-coded custom view — edit
          web/src/cmp/view/$$zone$$_$$name$$.js to build it out.</p>
      </div>`
  }
}

customElements.define('$$tag$$', $$className$$)
