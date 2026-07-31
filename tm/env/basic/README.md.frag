# $$Name$$ - basic environment (remote server)

Runs the backend like local, on a plain server under systemd.

    BASIC_HOST=user@host sh gen/env/basic/deploy.sh

Installs to /opt/$$name$$/backend with unit $$name$$-backend.service.
