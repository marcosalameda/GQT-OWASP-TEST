pipeline {
  agent { label 'docker' }

  options {
    skipDefaultCheckout(true)
  }

  environment {
    QUIDGEST_USER = credentials('quidgest-user')
    QUIDGEST_PASS = credentials('quidgest-pass')
    USE_ZAP_PROXY = 'true'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[
            url: 'https://github.com/marcosalameda/GQT-OWASP-TEST.git'
          ]],
          gitTool: 'jgit'
        ])
      }
    }

    stage('Authenticated Scan (Playwright + ZAP)') {
      steps {
        sh '''
          set -e

          echo "▶ Installing Node dependencies"
          npm install
          npx playwright install chromium
          export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1

          echo "▶ Starting ZAP proxy"
          docker rm -f zap-auth-proxy || true

          docker run -d --name zap-auth-proxy \
            --network host \
            --dns 172.16.0.10 \
            ghcr.io/zaproxy/zaproxy:stable \
            zap.sh -daemon \
              -host 0.0.0.0 \
              -port 8080 \
              -config proxy.host=0.0.0.0 \
              -config proxy.port=8080 \
              -config api.disablekey=true

          echo "▶ Waiting for ZAP proxy to be ready"
          for i in {1..30}; do
            if curl -s http://localhost:8080 > /dev/null; then
              echo "✔ ZAP proxy is up"
              break
            fi
            sleep 2
          done

          export HTTP_PROXY=http://localhost:8080
          export HTTPS_PROXY=http://localhost:8080
          export NO_PROXY=localhost,127.0.0.1

          echo "▶ Running Playwright login + browse"
          cd zap-scans/scripts

          node login-and-browse.js || echo "⚠️ Playwright login failed, continuing ZAP scan"

          sleep 20

          echo "▶ Generating ZAP reports"

          curl http://localhost:8080/OTHER/core/other/jsonreport/ \
            > "$WORKSPACE/zap-auth-report.json"

          docker rm -f zap-auth-proxy || true
        '''

        archiveArtifacts artifacts: '''
          zap-auth-report.html,
          zap-auth-report.json
        ''', fingerprint: true
      }
    }
  }

  post {
    always {
      script {
        def reportFile = "${env.WORKSPACE}/zap-auth-report.json"

        if (!fileExists(reportFile)) {
          echo "⚠️ ZAP report not found, marking build UNSTABLE"
          currentBuild.result = 'UNSTABLE'
          return
        }

        def report = readJSON file: reportFile

        def allAlerts = []
        report.site?.each { site ->
          site.alerts?.each { alert ->
            allAlerts << alert
          }
        }

        int high = allAlerts.count { it.riskcode.toString() == '3' }
        int medium = allAlerts.count { it.riskcode.toString() == '2' }
        int low = allAlerts.count { it.riskcode.toString() == '1' }

        echo "🛡️ ZAP Alert Summary:"
        echo "  🔴 High:   ${high}"
        echo "  🟠 Medium: ${medium}"
        echo "  🟡 Low:    ${low}"

        if (high > 0) {
          currentBuild.result = 'FAILURE'
          echo "❌ Build FAILED due to HIGH risk vulnerabilities"
        } else if (medium > 0) {
          currentBuild.result = 'UNSTABLE'
          echo "⚠️ Build UNSTABLE due to MEDIUM risk vulnerabilities"
        } else {
          currentBuild.result = 'SUCCESS'
          echo "✅ Build SUCCESS (only LOW / INFO issues)"
        }
      }
    }
  }
}
