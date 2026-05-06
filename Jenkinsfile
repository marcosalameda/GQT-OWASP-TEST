pipeline {
    agent any

    environment {
        PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Start OWASP ZAP (Docker)') {
            steps {
                sh '''
                    echo "▶ Starting ZAP container"
                    docker rm -f zap-auth-proxy || true

                    docker run -d --name zap-auth-proxy \
                      -p 8080:8080 \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap.sh -daemon \
                        -host 0.0.0.0 \
                        -port 8080 \
                        -config api.disablekey=true

                    echo "▶ Waiting for ZAP..."
                    sleep 15
                '''
            }
        }

        stage('Authenticated Navigation (Playwright)') {
            steps {
                sh '''
                    npm install
                    npx playwright install chromium

                    export USE_ZAP_PROXY=true

                    cd zap-scans/scripts
                    node login-and-browse.js
                '''
            }
        }

        stage('Generate ZAP Reports') {
            steps {
                sh '''
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
                archiveArtifacts artifacts: 'zap-auth-report.html, zap-auth-report.json', fingerprint: true
                sh 'docker rm -f zap-auth-proxy || true'
            }
        }
    }
}
