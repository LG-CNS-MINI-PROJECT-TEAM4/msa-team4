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

echo "🧹 기존 컨테이너 정리 중..."
sudo docker compose -f docker-compose.yml down || true
sudo docker compose -f docker-compose.blue.yml down || true
sudo docker compose -f docker-compose.green.yml down || true
sudo docker compose -f docker-compose.proxy.yml down || true

echo "🐳 DB 및 네트워크 기동..."
sudo docker compose -f docker-compose.yml up -d

echo "🟦 BLUE 스택 기동..."
sudo docker compose -f docker-compose.blue.yml up -d --remove-orphans

echo "🌐 Nginx 프록시 기동..."
sudo docker compose -f docker-compose.proxy.yml up -d

echo "✅ 현재 상태 확인"
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
