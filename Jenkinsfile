stage('Authenticated Scan (Playwright + ZAP)') {
  steps {
    sh '''
      set -e

      echo "▶ Installing Node dependencies"
      npm install
      npx playwright install --with-deps

      echo "▶ Starting ZAP proxy"
      docker rm -f zap-auth-proxy || true

      docker run -d --name zap-auth-proxy \
        --network host \
        --dns 172.16.0.10 \
        ghcr.io/zaproxy/zaproxy:stable \
        zap.sh -daemon \
          -host 0.0.0.0 \
          -port 8080 \
          -config proxy.host=0.0.0.0 \
          -config proxy.port=8080 \
          -config api.disablekey=true

      sleep 15

      echo "▶ Running Playwright login + browse"
      cd zap-scans/scripts
      node login-and-browse.js

      sleep 20

      curl http://localhost:8080/OTHER/core/other/htmlreport/ \
        > "$WORKSPACE/zap-auth-report.html"

      curl http://localhost:8080/OTHER/core/other/jsonreport/ \
        > "$WORKSPACE/zap-auth-report.json"

      docker rm -f zap-auth-proxy
    '''
