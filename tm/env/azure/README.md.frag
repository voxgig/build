# $$Name$$ - azure environment (starting point)

Azure Functions host config for the $$Name$$ backend. This is a starting
point: Azure needs one function.json binding per exposed function - derive
them from the service definitions the model generates for aws
(gen/env/aws/srv.yml lists every handler and route). Eject
env/azure/host.json.frag to customize.
