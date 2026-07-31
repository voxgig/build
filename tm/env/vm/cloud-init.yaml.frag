#cloud-config
# $$Name$$ backend VM bootstrap (generated; customize via tm/env/vm/)
packages:
  - nodejs
  - npm
  - rsync
write_files:
  - path: /etc/systemd/system/$$name$$-backend.service
    content: |
      [Unit]
      Description=$$Name$$ backend
      After=network.target
      [Service]
      WorkingDirectory=/opt/$$name$$/backend
      ExecStart=/usr/bin/node dist/env/local/local.js
      Restart=always
      Environment=NODE_ENV=production
      [Install]
      WantedBy=multi-user.target
runcmd:
  - mkdir -p /opt/$$name$$/backend
  - systemctl daemon-reload
  - systemctl enable $$name$$-backend
