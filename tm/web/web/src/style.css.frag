* { box-sizing: border-box; }
body { font: 15px/1.5 system-ui, sans-serif; margin: 0; color: #1c2733; }
header { display: flex; align-items: center; justify-content: space-between;
  padding: 0.6rem 1.2rem; border-bottom: 2px solid #e3e8ee; }
header h1 { font-size: 1.2rem; margin: 0; }
main { padding: 1.2rem; max-width: 60rem; }

.vg-auth-bar { display: flex; gap: 0.8rem; align-items: center; }
.vg-auth-form { max-width: 22rem; display: grid; gap: 0.6rem; }
.vg-auth-form label { display: grid; gap: 0.2rem; }
.vg-auth-err { color: #b3261e; min-height: 1.2em; }

.vg-admin nav { margin-bottom: 1rem; }
.vg-admin nav a { margin-right: 0.8rem; text-decoration: none; }
.vg-admin nav a.sel { font-weight: 700; border-bottom: 2px solid #1c2733; }

.vg-table { border-collapse: collapse; width: 100%; }
.vg-table th, .vg-table td { text-align: left; padding: 0.35rem 0.6rem;
  border-bottom: 1px solid #e3e8ee; }

.vg-entity-form { margin-top: 1.2rem; max-width: 26rem; display: grid;
  gap: 0.6rem; padding: 1rem; border: 1px solid #e3e8ee; border-radius: 6px; }
.vg-entity-form label { display: grid; gap: 0.2rem; }

button { cursor: pointer; padding: 0.25rem 0.7rem; }
.vg-hint { color: #5b6b7b; }
