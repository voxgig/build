// Sign a user in via @seneca/user login (email + password).
module.exports = function make_signin_user() {
  return async function signin_user(this: any, msg: any) {
    const seneca = this

    const out = await seneca.post('sys:user,login:user', {
      email: msg.email,
      password: msg.password,
      fields: ['id', 'email', 'name', 'handle'],
    })

    return out
  }
}
