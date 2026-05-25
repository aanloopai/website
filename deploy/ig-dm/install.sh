#!/usr/bin/env bash
# One-time Hetzner setup for Aanloop IG-DM bot.
# Run as root on the target host (Hetzner ubuntu-4gb-nbg1-1).
#
# Usage:
#   sudo IG_PAGE_ACCESS_TOKEN=... IG_USER_ID=... IG_WEBHOOK_VERIFY_TOKEN=... IG_APP_SECRET=... bash install.sh
#
# Idempotent: rerun to refresh nginx config or systemd unit. Bot code is rsynced
# separately by .github/workflows/ig-dm-deploy.yml; this script only sets up the
# host (user, dirs, env, nginx vhost, TLS cert, systemd unit).

set -euo pipefail

APP_USER=aanloop
APP_HOME=/opt/aanloop-ig-dm
ENV_FILE=/etc/aanloop-ig-dm.env
DOMAIN=ig-dm.aanloopai.nl
SERVICE=aanloop-ig-dm
REPO_DEPLOY_DIR=$(cd "$(dirname "$0")" && pwd)

require() {
  local var=$1
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: env $var is required" >&2
            exit 2
              fi
              }

              require IG_PAGE_ACCESS_TOKEN
              require IG_USER_ID
              require IG_WEBHOOK_VERIFY_TOKEN
              require IG_APP_SECRET

              echo "==> apt install prerequisites"
              apt-get update -y
              apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx

              if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1)" < "v20" ]]; then
                echo "==> install Node 20"
                  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
                    apt-get install -y nodejs
                    fi

                    if ! id "$APP_USER" >/dev/null 2>&1; then
                      echo "==> create user $APP_USER"
                        useradd --system --create-home --home-dir /home/$APP_USER --shell /usr/sbin/nologin $APP_USER
                        fi

                        echo "==> prepare $APP_HOME"
                        mkdir -p "$APP_HOME"/{scripts,marketing/instagram,data}
                        chown -R "$APP_USER:$APP_USER" "$APP_HOME"

                        echo "==> write env file (mode 0640)"
                        cat >"$ENV_FILE" <<EOF
                        IG_PAGE_ACCESS_TOKEN=$IG_PAGE_ACCESS_TOKEN
                        IG_USER_ID=$IG_USER_ID
                        IG_WEBHOOK_VERIFY_TOKEN=$IG_WEBHOOK_VERIFY_TOKEN
                        IG_APP_SECRET=$IG_APP_SECRET
                        PORT=3030
                        TEMPLATES_PATH=$APP_HOME/marketing/instagram/dm-templates.json
                        REPLIED_DB=$APP_HOME/data/ig-dm-replied.json
                        COMMENT_KEYWORDS=BILGI,INFO,AUDIT,DEMO
                        REPLY_DELAY_MS=7000
                        EOF
                        chown root:$APP_USER "$ENV_FILE"
                        chmod 0640 "$ENV_FILE"

                        echo "==> install systemd unit"
                        install -m 0644 "$REPO_DEPLOY_DIR/aanloop-ig-dm.service" /etc/systemd/system/${SERVICE}.service
                        systemctl daemon-reload
                        systemctl enable "$SERVICE"

                        echo "==> install nginx vhost (HTTP-only first if no cert yet)"
                        mkdir -p /var/www/letsencrypt

                        if [[ ! -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]]; then
                          # Write HTTP-only config so nginx -t passes and certbot can do HTTP-01 challenge
                            cat >/etc/nginx/sites-available/${DOMAIN} <<NGINXEOF
                            server {
                                listen 80;
                                    listen [::]:80;
                                        server_name ${DOMAIN};

                                            location /.well-known/acme-challenge/ {
                                                    root /var/www/letsencrypt;
                                                        }

                                                            location / {
                                                                    return 301 https://\$host\$request_uri;
                                                                        }
                                                                        }
                                                                        NGINXEOF
                                                                          ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
                                                                            nginx -t
                                                                              systemctl reload nginx

                                                                                echo "==> obtain TLS cert via certbot (HTTP-01)"
                                                                                  certbot certonly --webroot -w /var/www/letsencrypt -d ${DOMAIN} \
                                                                                      --non-interactive --agree-tos -m doganagahm@gmail.com
                                                                                      fi

                                                                                      echo "==> install full nginx vhost (with SSL)"
                                                                                      install -m 0644 "$REPO_DEPLOY_DIR/nginx.conf" /etc/nginx/sites-available/${DOMAIN}
                                                                                      ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN}
                                                                                      nginx -t
                                                                                      systemctl reload nginx

                                                                                      echo "==> NOTE: drop the bot code at $APP_HOME/scripts/ig-dm-bot.mjs and templates at"
                                                                                      echo "    $APP_HOME/marketing/instagram/dm-templates.json before starting."
                                                                                      echo "    The GitHub Actions workflow (ig-dm-deploy.yml) handles this on push."
                                                                                      echo
                                                                                      echo "==> done. start manually with: systemctl start $SERVICE"
                                                                                      echo "    follow logs: journalctl -u $SERVICE -f"
                                                                                      echo "    health: curl https://${DOMAIN}/health"
