#!/bin/bash

# 모니터링 디렉토리 경로 설정
MONITOR_DIR="/Users/baeseokin/k8s/monitoring"

echo "--------------------------------------------------"
echo "🚀 Kubernetes Monitoring Stack 배포를 시작합니다."
echo "--------------------------------------------------"

# 1. 권한 및 설정 적용
echo "Step 1: RBAC 및 Prometheus 설정 적용 중..."
kubectl apply -f $MONITOR_DIR/prometheus-rbac.yaml
kubectl apply -f $MONITOR_DIR/prometheus-config.yaml

# 2. 수집 에이전트 실행
echo "Step 2: 수집 에이전트(Node Exporter, Kube-State-Metrics) 배포 중..."
kubectl apply -f $MONITOR_DIR/node-exporter.yaml
kubectl apply -f $MONITOR_DIR/kube-state-metrics.yaml

# 3. Prometheus 서버 실행
echo "Step 3: Prometheus 서버 배포 중..."
kubectl apply -f $MONITOR_DIR/prometheus.yaml

# 4. Grafana 배포
echo "Step 4: Grafana 및 데이터 소스 설정 배포 중..."
kubectl apply -f $MONITOR_DIR/grafana-datasource-config.yaml
kubectl apply -f $MONITOR_DIR/grafana.yaml

echo "--------------------------------------------------"
echo "✅ 배포 명령이 모두 완료되었습니다."
echo "--------------------------------------------------"
echo "💡 각 서비스 접속 정보:"
echo "- Prometheus: http://localhost:30090"
echo "- Grafana: http://localhost:30300 (ID: admin / PW: admin1234)"
echo "--------------------------------------------------"

# Pod 상태 확인
kubectl get pods -n monitoring
