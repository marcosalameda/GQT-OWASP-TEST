pipeline {
    agent { label 'docker' }

    environment {
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'
        HTTP_PROXY  = 'http://localhost:8080'
        HTTPS_PROXY = 'http://localhost:8080'
        NO_PROXY    = 'localhost,127.0.0.1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Authenticated Scan (Playwright + ZAP)') {
            steps {
                sh '''
                    set -e

                    echo "▶ Installing Node dependencies"
                    npm install

                    npx playwright install chromium

                    echo "▶ Starting ZAP proxy"
                    docker rm -f zap-auth-proxy || true
                    docker run -d \
                      --name zap-auth-proxy \
                      --network host \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap.sh -daemon \
                      -host 0.0.0.0 \
                      -port 8080 \
                      -config api.disablekey=true

                    echo "▶ Waiting for ZAP proxy"
                    for i in {1..30}; do
                      curl -s http://localhost:8080 && break
                      sleep 2
                    done

                    echo "▶ Running Playwright login + browse (env creds)"
                    cd zap-scans/scripts
                    node login-and-browse.js || echo "⚠️ Playwright login failed"

                    sleep 20

                    echo "▶ Fetching ZAP alerts JSON"
                    curl -s http://localhost:8080/JSON/core/view/alerts/ \
                      -o "$WORKSPACE/zap-auth-report.json" || true
                '''
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('zap-auth-report.json') &&
                    readFile('zap-auth-report.json').trim()) {

                    def zap = readJSON file: 'zap-auth-report.json'

                    def highs   = zap.alerts.findAll { it.risk == 'High'   }.size()
                    def mediums = zap.alerts.findAll { it.risk == 'Medium' }.size()
                    def lows    = zap.alerts.findAll { it.risk == 'Low'    }.size()

                    echo "🛡️ ZAP Alert Summary:"
                    echo "  🔴 High:   ${highs}"
                    echo "  🟠 Medium: ${mediums}"
                    echo "  🟡 Low:    ${lows}"

                    if (highs > 0) {
                        error("❌ Build FAILED (HIGH findings)")
                    }
                    if (mediums > 0) {
                        unstable("⚠️ Build UNSTABLE (MEDIUM findings)")
                    }
                } else {
                    echo "⚠️ ZAP report not available"
                }
            }
        }
    }
}
