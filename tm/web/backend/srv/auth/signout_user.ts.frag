module.exports = function make_signout_user() {
  return async function signout_user(this: any, msg: any) {
    return this.post('sys:user,logout:user', { token: msg.token })
  }
}
