* { box-sizing: border-box; }
body { font: 15px/1.5 system-ui, sans-serif; margin: 0; color: #1c2733; background: #f5f7fa; }
button { cursor: pointer; }
a { color: #1f6feb; }
.vg-muted { color: #8b949e; }
.vg-hint { color: #5b6b7b; }
.vg-link { background: none; border: none; color: #1f6feb; cursor: pointer; padding: 0; font: inherit; text-decoration: none; }
.vg-link:hover { text-decoration: underline; }
.vg-primary { background: #1f6feb; color: #fff; border: none; border-radius: 6px; padding: 0.4rem 0.9rem; }
.vg-primary:hover { background: #1a5fd0; }

/* ---- enterprise shell ---- */
.vg-shell { display: flex; flex-direction: column; height: 100vh; }
.vg-topbar { display: flex; align-items: center; gap: 0.9rem; padding: 0 1rem; height: 52px;
  background: #0d1b2a; color: #e6edf3; flex: 0 0 auto; }
.vg-topbar .vg-brand { font-weight: 700; font-size: 1.05rem; white-space: nowrap; }
.vg-icon-btn { background: none; border: none; color: #e6edf3; font-size: 1.2rem; }
.vg-spacer { flex: 1; }
.vg-project-picker { display: flex; align-items: center; gap: 0.4rem; color: #aeb9c5; }
.vg-project-picker select { background: #1b2a3a; color: #e6edf3; border: 1px solid #2b3d4f;
  border-radius: 6px; padding: 0.25rem 0.5rem; }
.vg-usermenu { position: relative; }
.vg-user-btn { background: #1b2a3a; color: #e6edf3; border: 1px solid #2b3d4f; border-radius: 6px;
  padding: 0.3rem 0.7rem; display: flex; gap: 0.4rem; align-items: center; }
.vg-user-dropdown { position: absolute; right: 0; top: 110%; background: #fff; color: #1c2733;
  border: 1px solid #e3e8ee; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.15);
  min-width: 190px; display: flex; flex-direction: column; z-index: 20; }
.vg-user-dropdown[hidden] { display: none; }
.vg-user-dropdown a { padding: 0.6rem 0.9rem; text-decoration: none; color: #1c2733; }
.vg-user-dropdown a:hover { background: #f0f3f7; }

.vg-body { display: flex; flex: 1; min-height: 0; }
.vg-sidebar { flex: 0 0 220px; background: #fff; border-right: 1px solid #e3e8ee; overflow-y: auto;
  padding: 0.7rem; }
.vg-collapsed .vg-sidebar { display: none; }
.vg-ent-filter { width: 100%; padding: 0.35rem 0.55rem; border: 1px solid #e3e8ee; border-radius: 6px;
  margin-bottom: 0.6rem; }
.vg-navgroup { margin-bottom: 0.8rem; }
.vg-navgroup-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: .05em;
  color: #8b949e; padding: 0.2rem 0.4rem; }
.vg-navlink { display: block; padding: 0.35rem 0.6rem; border-radius: 6px; text-decoration: none;
  color: #1c2733; }
.vg-navlink:hover { background: #f0f3f7; }
.vg-navlink.vg-sel { background: #e7f0ff; color: #1f6feb; font-weight: 600; }

.vg-main { flex: 1; overflow-y: auto; padding: 1.4rem; }
.vg-entity { max-width: 60rem; }
.vg-entity-head { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1rem; }
.vg-entity-head h2, .vg-entity-head h3 { margin: 0; flex: 1; }
.vg-empty { color: #5b6b7b; padding: 2rem; text-align: center; }

/* ---- tables ---- */
.vg-table { border-collapse: collapse; width: 100%; background: #fff; border: 1px solid #e3e8ee;
  border-radius: 8px; overflow: hidden; }
.vg-table th, .vg-table td { text-align: left; padding: 0.5rem 0.7rem; border-bottom: 1px solid #eef1f5; }
.vg-table th { background: #f7f9fc; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .03em;
  color: #5b6b7b; }
.vg-actions { text-align: right; white-space: nowrap; }
.vg-actions button { margin-left: 0.3rem; padding: 0.2rem 0.55rem; border: 1px solid #d6dde5;
  background: #fff; border-radius: 5px; }
.vg-actions button:hover { background: #f0f3f7; }
.vg-ref { text-decoration: none; }
.vg-ref:hover { text-decoration: underline; }

/* ---- detail ---- */
.vg-detail { border-collapse: collapse; width: 100%; max-width: 40rem; margin-bottom: 1.6rem;
  background: #fff; border: 1px solid #e3e8ee; border-radius: 8px; overflow: hidden; }
.vg-detail th { text-align: left; width: 30%; padding: 0.5rem 0.7rem; color: #5b6b7b;
  background: #f7f9fc; border-bottom: 1px solid #eef1f5; }
.vg-detail td { padding: 0.5rem 0.7rem; border-bottom: 1px solid #eef1f5; }
.vg-children { margin: 1.4rem 0; }

/* ---- forms ---- */
.vg-entity-form { display: grid; gap: 0.7rem; max-width: 28rem; background: #fff; padding: 1.2rem;
  border: 1px solid #e3e8ee; border-radius: 8px; }
.vg-entity-form label { display: grid; gap: 0.25rem; font-size: 0.9rem; color: #33414f; }
.vg-entity-form input, .vg-entity-form select { padding: 0.4rem 0.55rem; border: 1px solid #d6dde5;
  border-radius: 6px; font: inherit; }
.vg-entity-form input[type=checkbox] { justify-self: start; }
.vg-form-actions { display: flex; gap: 0.8rem; align-items: center; margin-top: 0.4rem; }
.vg-form-err { color: #b3261e; min-height: 1.2em; }
.vg-form-msg { min-height: 1.2em; }
.vg-form-msg.vg-ok { color: #1a7f37; }
.vg-form-msg.vg-err { color: #b3261e; }
.vg-settings .vg-card { background: #fff; border: 1px solid #e3e8ee; border-radius: 8px;
  padding: 1.2rem; margin-bottom: 1.2rem; max-width: 32rem; }
.vg-settings .vg-card h3 { margin-top: 0; }

/* ---- public site ---- */
.vg-public-nav { display: flex; align-items: center; gap: 1.5rem; padding: 0.9rem 2rem;
  background: #0d1b2a; color: #e6edf3; }
.vg-public-nav .vg-brand { font-weight: 700; font-size: 1.1rem; }
.vg-public-nav nav { margin-left: auto; display: flex; gap: 1.2rem; }
.vg-public-nav a { color: #aeb9c5; text-decoration: none; }
.vg-hero { display: flex; flex-wrap: wrap; gap: 2rem; padding: 3.5rem 2rem; max-width: 68rem;
  margin: 0 auto; align-items: center; }
.vg-hero-copy { flex: 1 1 340px; }
.vg-hero-copy h1 { font-size: 2.4rem; margin: 0 0 0.8rem; }
.vg-hero-copy p { font-size: 1.15rem; color: #44515f; }
.vg-hero-auth { flex: 0 0 320px; }
.vg-features, .vg-about { max-width: 68rem; margin: 0 auto; padding: 2.5rem 2rem; }
.vg-feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.2rem; }
.vg-feature { background: #fff; border: 1px solid #e3e8ee; border-radius: 10px; padding: 1.2rem; }
.vg-feature h3 { margin-top: 0; }
.vg-public-footer { padding: 2rem; text-align: center; color: #8b949e; border-top: 1px solid #e3e8ee; }

/* ---- auth form ---- */
.vg-auth-form { display: grid; gap: 0.6rem; background: #fff; padding: 1.4rem; border-radius: 10px;
  border: 1px solid #e3e8ee; box-shadow: 0 6px 24px rgba(13,27,42,.08); }
.vg-auth-form h2 { margin: 0 0 0.3rem; }
.vg-auth-form label { display: grid; gap: 0.2rem; }
.vg-auth-form input { padding: 0.45rem 0.55rem; border: 1px solid #d6dde5; border-radius: 6px; font: inherit; }
.vg-auth-form button[type=submit] { background: #1f6feb; color: #fff; border: none; border-radius: 6px;
  padding: 0.5rem; font-size: 1rem; }
.vg-auth-err { color: #b3261e; min-height: 1.2em; }
.vg-auth-msg { color: #1a7f37; min-height: 1.2em; }
