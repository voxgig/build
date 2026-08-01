// The browser-side Seneca service bus. All component state and all
// backend communication flow through messages on this bus:
//
//   aim:*             -> the backend gateway (/seneca) via the
//                        seneca-browser fetch transport (cookie auth)
//   cmp:*             -> local component plugins (state)
//
// Cross-component notification uses the tiny `evt` plugin below:
// components post cmp:bus,emit:<name> and subscribe with onEvent().

/* global Seneca */

const bus = Seneca({
  legacy: false,
  timeout: 8888,
  plugin: {
    browser: {
      endpoint: '/seneca',
      fetch: {
        credentials: 'same-origin',
      },
    },
  },
})
  .test()
  .client({ type: 'browser', pin: 'aim:*' })


// Event fanout: seneca actions have single handlers, so the bus plugin
// keeps a listener registry for UI notification.
const listeners = {}

bus.use(function evt() {
  this.add('cmp:bus,emit:evt', function (msg, reply) {
    const subs = listeners[msg.name] || []
    for (const fn of subs) {
      try {
        fn(msg.data || {})
      }
      catch (e) {
        console.error('evt listener failed', msg.name, e)
      }
    }
    reply({ ok: true, count: subs.length })
  })
})

function onEvent(name, fn) {
  (listeners[name] = listeners[name] || []).push(fn)
}

function emit(name, data) {
  bus.post('cmp:bus,emit:evt', { name, data })
}


export {
  bus,
  onEvent,
  emit,
}
