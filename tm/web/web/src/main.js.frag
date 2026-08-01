// Todo SPA entry: web components on a Seneca service bus. No framework —
// each component is a custom element; all data flows are bus messages, with
// aim:* travelling to the backend gateway via the seneca-browser transport.
// The UI is model-driven (see model.js): navigation, forms and entity
// relationships are generated from /model.json.

import './style.css'
import './bus.js'
import './cmp/auth.js'
import './cmp/public.js'
import './cmp/admin.js'
import './cmp/settings.js'
import './cmp/shell.js'
import './cmp/app.js'
