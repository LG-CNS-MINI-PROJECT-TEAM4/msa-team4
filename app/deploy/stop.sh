#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/studify-be

echo "🛑 컨테이너 종료 중..."
sudo docker compose -f docker-compose.proxy.yml down || true
sudo docker compose -f docker-compose.blue.yml down || true
sudo docker compose -f docker-compose.green.yml down || true
sudo docker compose -f docker-compose.yml down || true

echo "🧼 불필요한 이미지 정리 중..."
sudo docker image prune -f

echo "✅ 정리 완료"
