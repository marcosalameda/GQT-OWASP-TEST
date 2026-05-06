pipeline {
    agent {
        label 'docker'
    }

    stages {
        stage('OWASP ZAP Baseline Scan') {
            steps {
                sh '''
                    set -e

                    echo "▶ Preparing directories"
                    mkdir -p zap-work
                    mkdir -p zap-report

                    echo "▶ Running OWASP ZAP Baseline Scan (NO BUILD)"
                    docker run --rm \
                      --network host \
                      --dns 172.16.0.10 \
                      -v "$(pwd)/zap-work:/zap/wrk" \
                      zaproxy/zap-stable \
                      zap-baseline.py \
                        -t https://jenkinsvm.quidgest.pt/gqt_horizontal_vue/ \
                        -r zap-report.html

                    echo "▶ Generating ZAP JSON report via API"
                    docker run --rm \
                      --network host \
                      --dns 172.16.0.10 \
                      zaproxy/zap-stable \
                      curl http://localhost:8080/OTHER/core/other/jsonreport/ \
                      > zap-report.json

                    mv zap-work/zap-report.html zap-report/ || true
                    mv zap-report.json zap-report/ || true
                '''
            }
        }
    }

    post {
        always {
            script {
                if (fileExists("zap-report/zap-report.json") &&
                    sh(
                        script: "grep -q 'WARN' zap-report/zap-report.json",
                        returnStatus: true
                    ) == 0
                ) {
                    currentBuild.result = 'UNSTABLE'
                    echo '⚠️ OWASP ZAP warnings detected'
                }
            }

            archiveArtifacts artifacts: 'zap-report/*', fingerprint: true, allowEmptyArchive: false
        }
    }
}
