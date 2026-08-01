module.exports = function make_load_auth() {
  return async function load_auth(this: any, msg: any) {
    const user = await this.entity('sys/user').load$(msg.user_id)
    return { ok: !!user, state: user ? 'signedin' : 'signedout', user }
  }
}
