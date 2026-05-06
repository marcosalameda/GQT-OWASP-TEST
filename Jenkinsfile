pipeline {
    agent { label 'docker' }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('ZAP Full Scan (Complete Report)') {
            steps {
                sh '''
                    set -e

                    echo "▶ Running ZAP FULL scan (HTML + JSON)"

                    docker run --rm \
                      -v "$WORKSPACE:/zap/wrk" \
                      ghcr.io/zaproxy/zaproxy:stable \
                      zap-full-scan.py \
                        -t https://jenkinsvm.quidgest.pt/gqt/vertical_vue/ \
                        -r zap-full-report.html \
                        -J zap-full-report.json \
                        -I

                    echo "▶ ZAP full scan finished"
                '''
            }
        }
    }

    post {
        always {
            script {

                if (fileExists('zap-full-report.html')) {
                    archiveArtifacts artifacts: 'zap-full-report.html', fingerprint: true
                    echo "✅ HTML report archived"
                } else {
                    echo "⚠️ HTML report not found"
                }

                if (fileExists('zap-full-report.json')) {
                    archiveArtifacts artifacts: 'zap-full-report.json', fingerprint: true
                    echo "✅ JSON report archived"
                } else {
                    echo "⚠️ JSON report not found"
                }
            }
        }
    }
}
