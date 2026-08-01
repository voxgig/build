module.exports = function make_web_signout_user() {
  return async function web_signout_user(this: any, _msg: any, meta: any) {
    const token = meta.custom?.principal?.token
    if (token) {
      await this.post('aim:auth,signout:user', { token })
    }
    return { ok: true, gateway$: { auth: { remove: true } } }
  }
}
