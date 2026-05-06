pipeline {
    agent {
        label 'docker'
    }

    stages {
        stage('OWASP ZAP Baseline Scan') {
            steps {
                sh '''
                    set -e

                    mkdir -p zap-report

                    echo "▶ Running OWASP ZAP Baseline Scan"
                    docker run --rm \
                      -u root \
                      --network host \
                      --dns 172.16.0.10 \
                      zaproxy/zap-stable \
                      zap-baseline.py \
                        -t https://jenkinsvm.quidgest.pt/gqt_horizontal_vue/ \
                        -r zap-report.html \
                    | tee zap-report/zap-output.log

                    mv zap-report.html zap-report/ || true
                '''
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('zap-report/zap-output.log') &&
                    sh(
                        script: "grep -q 'WARN-NEW:' zap-report/zap-output.log",
                        returnStatus: true
                    ) == 0
                ) {
                    currentBuild.result = 'UNSTABLE'
                    echo '⚠️ OWASP ZAP warnings detected'
                }
            }

            archiveArtifacts artifacts: 'zap-report/*', fingerprint: true
        }
    }
}
