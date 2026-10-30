#!/bin/sh
# Runs when the web container starts. Compose only starts it after the API is
# healthy (depends_on), so at this point the whole app is up.
APP_URL="${APP_URL:-http://localhost:8080}"
cat <<MSG

  ==================================================
    ObraFlow pronto!
    App:     ${APP_URL}
    Swagger: ${APP_URL}/api/docs
  ==================================================

MSG
