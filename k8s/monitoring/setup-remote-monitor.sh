#!/bin/bash
# 파일명: setup-remote-monitor.sh

echo "=================================================="
echo "🛡️  운영 서버 Prometheus 모니터링 환경 구축 시작"
echo "=================================================="

# 1. Namespace 생성
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# 2. RBAC(권한) 및 ConfigMap(수집 규칙) 적용
echo "▶ 1단계: 권한 및 설정 파일 적용 중..."
kubectl apply -f prometheus-rbac.yaml
kubectl apply -f prometheus-config.yaml

# 3. 에이전트(Exporter) 배포
echo "▶ 2단계: 메트릭 수집기(Node/Kube-state) 배포 중..."
kubectl apply -f node-exporter.yaml
kubectl apply -f kube-state-metrics.yaml

# 4. Prometheus 서버 배포
echo "▶ 3단계: Prometheus 서버 실행 (Retention: 30d)..."
kubectl apply -f prometheus.yaml

echo "=================================================="
echo "✅ 배포가 완료되었습니다!"
echo "--------------------------------------------------"
echo "🌐 원격 접속 정보:"
echo "1. 서버 공인 IP 확인: curl ifconfig.me"
echo "2. Prometheus 주소: http://<서버_공인_IP>:30090"
echo "3. 원격 Grafana 설정: 위 주소를 데이터 소스 URL에 입력하세요."
echo "=================================================="

# Pod 상태 실시간 모니터링
kubectl get pods -n monitoring -w
