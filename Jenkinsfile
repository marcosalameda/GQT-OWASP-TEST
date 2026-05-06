pipeline {
    agent {
        label 'docker'
    }

    stages {
        stage('Run OWASP ZAP Scan') {
            steps {
                sh '''
                    set -e

                    cd /opt/zap-project
                    mkdir -p zap-scans/output

                    echo "▶ Building ZAP baseline image (offline-safe)"
                    docker build --pull=false -t zap-baseline-scan .

                    echo "▶ Running OWASP ZAP Baseline Scan"
                    docker run --rm \
                      --network host \
                      --dns 172.16.0.10 \
                      -v "$(pwd)/zap-scans:/zap/wrk" \
                      zap-baseline-scan \
                      /zap/wrk/config/config.json \
                    | tee "$WORKSPACE/zap-output.log"

                    echo "▶ Generating ZAP JSON report via API"
                    curl -s http://localhost:8080/OTHER/core/other/jsonreport/ \
                      > "$WORKSPACE/zap-report.json"
                '''
            }
        }
    }

    post {
        always {
            script {
                if (fileExists("${env.WORKSPACE}/zap-output.log") &&
                    sh(
                        script: "grep -q 'WARN-NEW: [1-9]' ${env.WORKSPACE}/zap-output.log",
                        returnStatus: true
                    ) == 0
                ) {
                    currentBuild.result = 'UNSTABLE'
                    echo '⚠️ Medium-risk vulnerabilities detected (OWASP ZAP WARN)'
                }
            }

            sh '''
                echo "▶ Collecting ZAP reports"
                mkdir -p zap-report

                cp zap-scans/output/zap-report.html zap-report/ || true
                cp "$WORKSPACE/zap-report.json" zap-report/ || true
            '''

            archiveArtifacts artifacts: 'zap-report/*', fingerprint: true, allowEmptyArchive: true
        }
    }
}
