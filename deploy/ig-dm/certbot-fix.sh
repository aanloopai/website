#!/usr/bin/env bash
set -euo pipefail

DOMAIN=ig-dm.aanloopai.nl
NGINX_CONF=/etc/nginx/sites-available/${DOMAIN}
NGINX_ENABLED=/etc/nginx/sites-enabled/${DOMAIN}
WEBROOT=/var/www/letsencrypt

echo "==> ensure webroot"
mkdir -p "$WEBROOT"

echo "==> write HTTP-only nginx config"
cat > "$NGINX_CONF" <<'NGINX'
server {
  listen 80;
  listen [::]:80;
  server_name ig-dm.aanloopai.nl;
  location /.well-known/acme-challenge/ {
    root /var/www/letsencrypt;
  }
  location / {
    return 301 https://$host$request_uri;
  }
}
NGINX
echo "==> enable site"
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
echo "==> test + reload nginx"
nginx -t
systemctl reload nginx
echo "==> check port 80 reachable"
curl -v http://${DOMAIN}/.well-known/acme-challenge/test 2>&1 | head -20 || true
echo "==> run certbot (force-renewal)"
certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" \
  --non-interactive --agree-tos -m doganagahm@gmail.com \
  --force-renewal
echo "==> check cert exists"
ls -la /etc/letsencrypt/live/${DOMAIN}/
echo "==> install SSL nginx config from /tmp"
if [[ -f /tmp/ig-dm-nginx.conf ]]; then
  install -m 0644 /tmp/ig-dm-nginx.conf "$NGINX_CONF"
else
  SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
  install -m 0644 "$SCRIPT_DIR/nginx.conf" "$NGINX_CONF"
fi
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
echo "==> test + reload nginx with SSL"
nginx -t
systemctl reload nginx
echo "==> restart bot"
systemctl restart aanloop-ig-dm
systemctl is-active aanloop-ig-dm
echo "==> ALL DONE"
