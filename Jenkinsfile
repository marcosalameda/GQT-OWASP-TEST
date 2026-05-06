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

                    sleep 20
                '''
            }
        }

        stage('Spider Target') {
            steps {
                sh '''
                    curl "http://localhost:8080/JSON/spider/action/scan/?url=https://jenkinsvm.quidgest.pt/gqt_horizontal_vue/"
                    sleep 30
                '''
            }
        }

        stage('Passive Scan Wait') {
            steps {
                sh '''
                    echo "Waiting for passive scan to finish"
                    sleep 30
                '''
            }
        }

        stage('Fetch ZAP JSON Alerts') {
            steps {
                sh '''
                    curl "http://localhost:8080/JSON/core/view/alerts/" \
                      > zap-report.json
                '''
            }
        }
    }

    post {
        always {
            sh '''
                mkdir -p zap-report
                mv zap-report.json zap-report/
            '''

            archiveArtifacts artifacts: 'zap-report/zap-report.json', fingerprint: true

            sh 'docker rm -f zap-daemon || true'
        }

        success {
            script {
                def high = sh(
                    script: "jq '[.alerts[] | select(.risk == \"High\")] | length' zap-report/zap-report.json",
                    returnStdout: true
                ).trim()

                if (high.toInteger() > 0) {
                    currentBuild.result = 'FAILURE'
                    echo '❌ High risk vulnerabilities found'
                }
            }
        }
    }
}
