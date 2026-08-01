// User settings & security: update profile and change password. Backed by
// the auth service wrappers (aim:req,on:auth,{update:user,change:pass}).

import { bus } from '../bus.js'
import * as Api from '../api.js'


class VgSettings extends HTMLElement {
  async connectedCallback() {
    const state = await bus.post('cmp:auth,get:state')
    this.user = state.user || {}
    this.render()
  }

  render() {
    this.innerHTML = `
      <div class="vg-entity vg-settings">
        <h2>Settings &amp; security</h2>

        <section class="vg-card">
          <h3>Profile</h3>
          <form class="vg-entity-form" id="vg-profile">
            <label>Name <input name="name" type="text" value="${esc(this.user.name)}" /></label>
            <label>Email <input type="email" value="${esc(this.user.email)}" disabled /></label>
            <div class="vg-form-actions"><button type="submit" class="vg-primary">Save profile</button></div>
            <div class="vg-form-msg" id="vg-profile-msg"></div>
          </form>
        </section>

        <section class="vg-card">
          <h3>Change password</h3>
          <form class="vg-entity-form" id="vg-pass">
            <label>New password <input name="password" type="password" required minlength="8" /></label>
            <label>Confirm <input name="confirm" type="password" required minlength="8" /></label>
            <div class="vg-form-actions"><button type="submit" class="vg-primary">Change password</button></div>
            <div class="vg-form-msg" id="vg-pass-msg"></div>
          </form>
        </section>
      </div>`

    this.querySelector('#vg-profile').onsubmit = async (ev) => {
      ev.preventDefault()
      const name = ev.target.querySelector('[name=name]').value
      const res = await Api.updateUser({ name })
      const msg = this.querySelector('#vg-profile-msg')
      if (res.ok) {
        this.user.name = res.user ? res.user.name : name
        msg.textContent = 'Profile saved.'
        msg.className = 'vg-form-msg vg-ok'
      }
      else {
        msg.textContent = 'Save failed: ' + (res.why || '')
        msg.className = 'vg-form-msg vg-err'
      }
    }

    this.querySelector('#vg-pass').onsubmit = async (ev) => {
      ev.preventDefault()
      const pw = ev.target.querySelector('[name=password]').value
      const confirm = ev.target.querySelector('[name=confirm]').value
      const msg = this.querySelector('#vg-pass-msg')
      if (pw !== confirm) {
        msg.textContent = 'Passwords do not match.'
        msg.className = 'vg-form-msg vg-err'
        return
      }
      const res = await Api.changePass(pw)
      if (res.ok) {
        ev.target.reset()
        msg.textContent = 'Password changed.'
        msg.className = 'vg-form-msg vg-ok'
      }
      else {
        msg.textContent = 'Change failed: ' + (res.why || '')
        msg.className = 'vg-form-msg vg-err'
      }
    }
  }
}


function esc(s) {
  return String(null == s ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}


customElements.define('vg-settings', VgSettings)
