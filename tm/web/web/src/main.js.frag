// Todo SPA entry: web components on a Seneca service bus (experimental).
// No framework: each component is a custom element backed by a seneca
// plugin (state), and all data flows are bus messages - aim:* messages
// travel to the backend gateway via the seneca-browser fetch transport.

import './style.css'
import './bus.js'
import './cmp/auth.js'
import './cmp/admin.js'
import './cmp/app.js'
