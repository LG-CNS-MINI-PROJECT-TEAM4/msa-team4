#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/studify-be

echo "🕸 네트워크 확인/생성 중..."
if ! sudo docker network inspect studify-net >/dev/null 2>&1; then
  sudo docker network create --driver bridge studify-net
  echo "✅ studify-net 생성 완료"
else
  echo "✅ studify-net 이미 존재"
fi

echo "🛑 포트 80 점유 해제..."
CID=$(sudo docker ps --filter "publish=80" -q || true)
if [ -n "${CID}" ]; then
  sudo docker stop ${CID} || true
fi
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop apache2 2>/dev/null || sudo systemctl stop httpd 2>/dev/null || true

echo "🧹 기존 컨테이너 정리 중 (DB 제외)..."
# ❌ DB가 포함된 기본 스택(docker-compose.yml)은 내리지 않음
# sudo docker compose -f docker-compose.yml down || true

# Blue/Green/Proxy만 정리
sudo docker compose -p studify-blue  -f docker-compose.blue.yml  down || true
sudo docker compose -p studify-green -f docker-compose.green.yml down || true
sudo docker compose -p studify-proxy -f docker-compose.proxy.yml down || true

echo "🐳 DB 및 네트워크 기동(이미 올라가 있으면 유지)..."
# DB 스택은 별도 프로젝트명으로 항상 유지
sudo docker compose -p studify-db -f docker-compose.yml up -d

echo "🟦 BLUE 스택 기동..."
# ⚠️ --remove-orphans 제거, 프로젝트명 분리로 충돌 방지
sudo docker compose -p studify-blue -f docker-compose.blue.yml up -d --force-recreate

echo "🌐 Nginx 프록시 기동..."
sudo docker compose -p studify-proxy -f docker-compose.proxy.yml up -d --force-recreate

echo "✅ 현재 상태 확인"
sudo docker ps --format 'table {{.Names}}\t{{.Label "com.docker.compose.project"}}\t{{.Status}}\t{{.Ports}}'
