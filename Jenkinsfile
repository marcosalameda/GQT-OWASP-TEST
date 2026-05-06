pipeline {
    agent { label 'docker' }

    environment {
        HTTP_PROXY  = 'http://localhost:8080'
        HTTPS_PROXY = 'http://localhost:8080'
        NO_PROXY    = 'localhost,127.0.0.1'
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Start OWASP ZAP Proxy') {
            steps {
                sh '''
                    docker rm -f zap-auth-proxy || true
                    docker run -d --name zap-auth-proxy \
                      --network host \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap.sh -daemon \
                        -host 0.0.0.0 \
                        -port 8080 \
                        -config api.disablekey=true
                '''
            }
        }

        stage('Authenticated Navigation (Playwright)') {
            steps {
                sh '''
                    npm install
                    npx playwright install chromium

                    export HTTP_PROXY=http://localhost:8080
                    export HTTPS_PROXY=http://localhost:8080

                    cd zap-scans/scripts
                    node login-and-browse.js
                '''
            }
        }

        stage('Generate ZAP Reports') {
            steps {
                sh '''
                    echo "▶ Waiting for ZAP to process traffic"
                    sleep 20

                    echo "▶ Generating HTML report"
                    curl http://localhost:8080/OTHER/core/other/htmlreport/ \
                      > zap-auth-report.html || true

                    echo "▶ Generating JSON report"
                    curl http://localhost:8080/OTHER/core/other/jsonreport/ \
                      > zap-auth-report.json || true
                '''
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('zap-auth-report.html')) {
                    archiveArtifacts artifacts: 'zap-auth-report.html'
                    echo "✅ HTML report archived"
                }

                if (fileExists('zap-auth-report.json')) {
                    archiveArtifacts artifacts: 'zap-auth-report.json'
                    echo "✅ JSON report archived"

                    def zap = readJSON file: 'zap-auth-report.json'

                    def highs   = zap.site[0].alerts.findAll { it.riskcode == '3' }.size()
                    def mediums = zap.site[0].alerts.findAll { it.riskcode == '2' }.size()

                    echo "🛡️ ZAP results → High: ${highs}, Medium: ${mediums}"

                    if (highs > 0) {
                        error("❌ Build FAILED – High risk vulnerabilities detected")
                    }
                    if (mediums > 0) {
                        unstable("⚠️ Build UNSTABLE – Medium risk vulnerabilities detected")
                    }
                } else {
                    unstable("⚠️ ZAP JSON report not generated")
                }

                sh 'docker rm -f zap-auth-proxy || true'
            }
        }
    }
}
