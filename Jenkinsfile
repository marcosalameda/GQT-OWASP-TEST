pipeline {
    agent { label 'docker' }

    environment {
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'
        // NO usar HTTP_PROXY / HTTPS_PROXY global
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

                    # Activamos el proxy SOLO para Playwright
                    export USE_ZAP_PROXY=true

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
                    archiveArtifacts artifacts: 'zap-auth-report.html', fingerprint: true
                    echo "✅ HTML report archived"
                } else {
                    unstable("⚠️ HTML report not generated")
                }

                if (fileExists('zap-auth-report.json')) {
                    archiveArtifacts artifacts: 'zap-auth-report.json', fingerprint: true
                    echo "✅ JSON report archived"

                    def raw = readFile('zap-auth-report.json').trim()
                    if (raw) {
                        def zap = readJSON text: raw

                        if (zap.site && zap.site.size() > 0) {
                            def alerts = zap.site[0].alerts ?: []

                            def highs   = alerts.findAll { it.riskcode == '3' }.size()
                            def mediums = alerts.findAll { it.riskcode == '2' }.size()

                            echo "🛡️ ZAP results → High=${highs}, Medium=${mediums}"

                            if (highs > 0) {
                                error("❌ Build FAILED due to HIGH risk vulnerabilities")
                            }
                            if (mediums > 0) {
                                unstable("⚠️ Build UNSTABLE due to MEDIUM risk vulnerabilities")
                            }
                        } else {
                            unstable("⚠️ ZAP JSON generated but no sites analyzed")
                        }
                    } else {
                        unstable("⚠️ ZAP JSON is empty")
                    }
                } else {
                    unstable("⚠️ ZAP JSON report not generated")
                }

                sh 'docker rm -f zap-auth-proxy || true'
            }
        }
    }
}
