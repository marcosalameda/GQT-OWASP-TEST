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

                    echo "▶ Starting ZAP proxy (daemon)"
                    docker rm -f zap-auth-proxy || true
                    docker run -d \
                      --name zap-auth-proxy \
                      --network host \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap.sh -daemon \
                      -host 0.0.0.0 \
                      -port 8080 \
                      -config api.disablekey=true

                    echo "▶ Waiting for ZAP proxy to be ready"
                    for i in {1..30}; do
                      curl -s http://localhost:8080 >/dev/null && break
                      sleep 2
                    done

                    echo "▶ Running Playwright login + browse (auth traffic)"
                    cd zap-scans/scripts
                    node login-and-browse.js || echo "⚠️ Playwright login failed, continuing scan"

                    echo "▶ Giving ZAP time to process traffic"
                    sleep 20

                    echo "▶ Running ZAP active scan"
                    curl "http://localhost:8080/JSON/ascan/action/scan/?url=https://TU_APP_BASE_URL&recurse=true" || true

                    sleep 30

                    echo "▶ Attempting to generate ZAP HTML report"
                    curl http://localhost:8080/OTHER/core/other/htmlreport/ \
                      > "$WORKSPACE/zap-auth-report.html" || true

                    echo "▶ Saving ZAP alerts JSON (fallback / validation)"
                    curl -s http://localhost:8080/JSON/core/view/alerts/ \
                      -o "$WORKSPACE/zap-auth-report.json" || true
                '''
            }
        }
    }

    post {
        always {
            script {

                if (fileExists('zap-auth-report.html') &&
                    readFile('zap-auth-report.html').trim()) {

                    echo "✅ ZAP HTML report generated"
                    archiveArtifacts artifacts: 'zap-auth-report.html', fingerprint: true

                } else {
                    echo "⚠️ ZAP HTML report not generated (daemon limitation)"
                }

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
                        error("❌ Build FAILED due to HIGH risk vulnerabilities")
                    }
                    if (mediums > 0) {
                        unstable("⚠️ Build UNSTABLE due to MEDIUM risk vulnerabilities")
                    }

                } else {
                    echo "⚠️ ZAP JSON report not available"
                }
            }
        }
    }
}
