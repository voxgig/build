# systemd unit for the $$Name$$ backend (generated; customize via tm/env/basic/)
[Unit]
Description=$$Name$$ backend
After=network.target

[Service]
WorkingDirectory=/opt/$$name$$/backend
ExecStart=/usr/bin/node dist/env/local/local.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=$$port$$

[Install]
WantedBy=multi-user.target
