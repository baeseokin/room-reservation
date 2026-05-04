#!/bin/bash

# 사용법: ./deploy.sh <VERSION>
# 예시: ./deploy.sh 0.3

# 1. 버전 파라미터 확인
if [ -z "$1" ]; then
  echo "❌ 사용법: $0 <VERSION>"
  exit 1
fi

VERSION=$1
IMAGE_NAME="baeseokin/room-reservation-backend"

echo "🚀 room-reservation-backend 배포 시작 (버전: $VERSION)..."

# 2. Docker Buildx 환경 확인/생성
if ! docker buildx inspect multiarch-builder >/dev/null 2>&1; then
  echo "🔧 buildx 빌더 생성 중..."
  docker buildx create --name multiarch-builder --use
  docker buildx inspect --bootstrap
fi

# 3. 멀티 아키텍처 이미지 빌드 & 푸시
echo "📦 멀티 아키텍처 이미지 빌드 중 (linux/amd64, linux/arm64)..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $IMAGE_NAME:$VERSION \
  --push .

if [ $? -ne 0 ]; then
  echo "❌ 이미지 빌드 실패!"
  exit 1
fi

# 4. Kubernetes Deployment 업데이트
echo "📡 Kubernetes 배포 업데이트..."

# Deployment가 존재하는지 확인
if ! kubectl get deployment room-reservation-backend -n room-reservation >/dev/null 2>&1; then
  echo "✨ Deployment가 존재하지 않습니다. 최초 배포를 진행합니다..."
  # 매니페스트 파일의 이미지를 현재 버전으로 변경하여 배포
  sed "s|image: $IMAGE_NAME:.*|image: $IMAGE_NAME:$VERSION|g" ../k8s/room-reservation-backend.yaml | kubectl apply -f -
else
  echo "🔄 기존 Deployment의 이미지를 업데이트합니다..."
  kubectl set image deployment/room-reservation-backend room-reservation-backend=$IMAGE_NAME:$VERSION -n room-reservation
fi

# 5. 롤아웃 확인
#kubectl rollout status deployment/room-reservation-backend -n room-reservation

echo "✅ room-reservation-backend 배포 완료!"
