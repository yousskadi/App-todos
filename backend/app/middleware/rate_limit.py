from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

# Limite par IP. Suffisant en phase 1 ; passera sur Redis quand il y aura
# plusieurs réplicas (l'état du limiteur est en mémoire du process).
limiter = Limiter(key_func=get_remote_address, enabled=get_settings().rate_limit_enabled)
