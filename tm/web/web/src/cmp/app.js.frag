// App shell: shows the auth component always; the entity admin only when
// signed in. Reacts to bus auth events.

import { bus, onEvent } from '../bus.js'


class VgApp extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header><h1>$$Name$$</h1><vg-auth></vg-auth></header>
      <main id="vg-main"></main>`

    onEvent('auth', ({ user }) => this.setMain(user))

    // Resolve the cookie session on load.
    bus.post('cmp:auth,load:state')
  }

  setMain(user) {
    const main = this.querySelector('#vg-main')
    if (user) {
      main.innerHTML = '<vg-entity-admin></vg-entity-admin>'
    }
    else {
      main.innerHTML = '<p class="vg-hint">Sign in to manage your data.</p>'
    }
  }
}

customElements.define('vg-app', VgApp)
