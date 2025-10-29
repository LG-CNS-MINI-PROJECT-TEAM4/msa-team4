#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/studify-be

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
