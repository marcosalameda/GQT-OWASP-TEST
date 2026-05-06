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

                    docker build --pull=false -t zap-baseline-scan .

                    docker run --rm \
                      --network host \
                      --dns 172.16.0.10 \
                      -v "$(pwd)/zap-scans:/zap/wrk" \
                      zap-baseline-scan \
                      /zap/wrk/config/config.json \
                    | tee "$WORKSPACE/zap-output.log"

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
                mkdir -p zap-report

                # ✅ HTML (ruta real fuera del workspace)
                cp /opt/zap-project/zap-scans/zap-report.html zap-report/ || true

                # ✅ JSON generado vía API
                cp "$WORKSPACE/zap-report.json" zap-report/ || true
            '''

            archiveArtifacts artifacts: 'zap-report/*', fingerprint: true, allowEmptyArchive: true
        }
    }
}
