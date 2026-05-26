pipeline {

    agent { label 'docker' }



    stages {



        stage('Start ZAP Daemon') {

            steps {

                sh '''
                    docker rm -f zap-daemon || true

                    docker run -d \
                      --name zap-daemon \
                      --network host \
                      --dns 172.16.0.10 \
                      zaproxy/zap-stable \
                      zap.sh -daemon \
                        -host 0.0.0.0 \
                        -port 8080 \
                        -config api.disablekey=true

                    echo "Waiting for ZAP API to be ready..."
                    for i in $(seq 1 30); do
                      if curl -s http://localhost:8080/JSON/core/view/version/ >/dev/null; then
                        echo "ZAP is ready"
                        exit 0
                      fi
                      sleep 2
                    done

                    echo "ZAP did not start in time"
                    exit 1
                '''

            }

        }



        stage('Spider Target') {

            steps {

                sh '''
                    curl "http://localhost:8080/JSON/spider/action/scan/?url=https://jenkinsvm.quidgest.pt/gqt_horizontal_vue/&recurse=true"

                    echo "Waiting for spider to finish..."
                    while true; do
                      STATUS=$(curl -s http://localhost:8080/JSON/spider/view/status/ | jq -r '.status')
                      [ "$STATUS" = "100" ] && break
                      sleep 5
                    done
                '''

            }

        }



        stage('Wait Passive Scan') {

            steps {

                sh '''
                    echo "Waiting for passive scan to finish..."
                    while true; do
                      LEFT=$(curl -s http://localhost:8080/JSON/pscan/view/recordsToScan/ | jq -r '.recordsToScan')
                      [ "$LEFT" = "0" ] && break
                      sleep 5
                    done
                '''

            }

        }



        stage('Generate Reports (JSON + HTML)') {

            steps {

                sh '''
                    mkdir -p zap-report

                    echo "Generating JSON report"
                    curl -s http://localhost:8080/JSON/core/view/alerts/ \
                      > zap-report/zap-report.json

                    echo "Generating HTML report"
                    curl -s http://localhost:8080/OTHER/core/other/htmlreport/ \
                      > zap-report/zap-report.html
                '''

            }

        }

    }



    post {

        always {

            sh 'docker rm -f zap-daemon || true'
            archiveArtifacts artifacts: 'zap-report/zap-report.json, zap-report/zap-report.html', fingerprint: true

        }



        success {

            script {

                def high = sh(
                    script: '''
                        jq '[.alerts[]
                            | select(.risk == "High")
                            | select(.alert != "Content Security Policy (CSP) Header Not Set")
                            | select(.alert != "Strict-Transport-Security Header Not Set")
                        ] | length' zap-report/zap-report.json
                    ''',
                    returnStdout: true
                ).trim().toInteger()

                def medium = sh(
                    script: '''
                        jq '[.alerts[]
                            | select(.risk == "Medium")
                            | select(.alert != "Content Security Policy (CSP) Header Not Set")
                            | select(.alert != "Strict-Transport-Security Header Not Set")
                        ] | length' zap-report/zap-report.json
                    ''',
                    returnStdout: true
                ).trim().toInteger()

                sh '''
                    echo "Falsos negativos excluidos del resultado:"
                    jq -r '.alerts[]
                        | select(
                            .alert == "Content Security Policy (CSP) Header Not Set"
                            or .alert == "Strict-Transport-Security Header Not Set"
                        )
                        | "  - " + .risk + ": " + .alert' \
                        zap-report/zap-report.json | sort | uniq
                '''

                if (high > 0) {
                    currentBuild.result = 'FAILURE'
                    echo "Build FAILED: ${high} vulnerabilidades High encontradas"
                } else if (medium > 0) {
                    currentBuild.result = 'UNSTABLE'
                    echo "Build UNSTABLE: ${medium} vulnerabilidades Medium encontradas"
                } else {
                    echo "Build SUCCESS: Solo vulnerabilidades Low / Informational encontradas"
                }

            }

        }

    }

}
