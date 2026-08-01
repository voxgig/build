// Auth: a seneca plugin holding the signed-in principal, and the
// <vg-auth> web component (sign-in form / signed-in bar) driving it
// purely through bus messages.

import { bus, emit } from '../bus.js'


bus.use(function auth_cmp() {
  const seneca = this

  let user = null

  seneca.add('cmp:auth,get:state', function (msg, reply) {
    reply({ ok: true, user })
  })

  // Resolve current auth from the backend (cookie session).
  seneca.add('cmp:auth,load:state', function (msg, reply) {
    this.act('aim:req,on:auth,load:auth', function (err, out) {
      user = (!err && out.ok && 'signedin' === out.state) ? out.user : null
      emit('auth', { user })
      reply({ ok: true, user })
    })
  })

  seneca.add('cmp:auth,signin:user', function (msg, reply) {
    this.act('aim:req,on:auth,signin:user', {
      email: msg.email,
      password: msg.password,
    }, function (err, out) {
      if (err || !out.ok) {
        return reply({ ok: false, why: (out && out.why) || 'signin-failed' })
      }
      user = out.user
      emit('auth', { user })
      reply({ ok: true, user })
    })
  })

  seneca.add('cmp:auth,signout:user', function (msg, reply) {
    this.act('aim:req,on:auth,signout:user', function () {
      user = null
      emit('auth', { user })
      reply({ ok: true })
    })
  })
})


class VgAuth extends HTMLElement {
  connectedCallback() {
    this.render()
  }

  async render() {
    const state = await bus.post('cmp:auth,get:state')

    if (state.user) {
      this.innerHTML = `
        <div class="vg-auth-bar">
          <span>Signed in: <b>${state.user.email}</b></span>
          <button id="vg-signout">Sign out</button>
        </div>`
      this.querySelector('#vg-signout').onclick = async () => {
        await bus.post('cmp:auth,signout:user')
        this.render()
      }
    }
    else {
      this.innerHTML = `
        <form class="vg-auth-form">
          <h2>Sign in</h2>
          <label>Email <input name="email" type="email" required /></label>
          <label>Password <input name="password" type="password" required /></label>
          <button type="submit">Sign in</button>
          <div class="vg-auth-err" id="vg-auth-err"></div>
        </form>`
      this.querySelector('form').onsubmit = async (ev) => {
        ev.preventDefault()
        const fd = new FormData(ev.target)
        const res = await bus.post('cmp:auth,signin:user', {
          email: fd.get('email'),
          password: fd.get('password'),
        })
        if (!res.ok) {
          this.querySelector('#vg-auth-err').textContent =
            'Sign in failed: ' + res.why
        }
        else {
          this.render()
        }
      }
    }
  }
}

customElements.define('vg-auth', VgAuth)
