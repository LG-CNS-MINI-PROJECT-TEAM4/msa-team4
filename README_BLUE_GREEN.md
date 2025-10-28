# 📦 Studify Blue-Green 무중단 배포 구조

## 📁 디렉토리 구조
app/
├─ docker-compose.yml # 공용(DB+네트워크)
├─ docker-compose.blue.yml # Blue 스택
├─ docker-compose.green.yml # Green 스택
├─ docker-compose.proxy.yml # Nginx 프록시
├─ proxy/
│ ├─ nginx.conf
│ ├─ conf.d/
│ │ ├─ upstream-blue.conf
│ │ ├─ upstream-green.conf
│ │ └─ active.conf
│ └─ switch.sh
└─ deploy/
├─ start.sh
└─ stop.sh

markdown
코드 복사

## 🐳 구성 개요
- **DB**: `docker-compose.yml`에서 한 번만 띄우고 Blue/Green과 분리
- **App**: Blue / Green 각각 별도 compose 파일로 동시에 기동 가능
- **프록시**: Nginx 하나만 외부 80포트 노출 → Blue/Green 게이트웨이로 라우팅
- **전환**: `proxy/switch.sh`로 `active.conf` 교체 후 `nginx reload`

---

## 🚀 실행 절차 (EC2 수동 배포 시)

### 1. DB 기동
```bash
sudo docker compose -f docker-compose.yml up -d
2. Blue 스택 기동
bash
코드 복사
sudo docker compose -f docker-compose.blue.yml up -d --remove-orphans
3. 프록시 기동
bash
코드 복사
sudo docker compose -f docker-compose.proxy.yml up -d
4. 헬스체크
bash
코드 복사
curl -s http://localhost/nginx/healthz
curl -s http://localhost/actuator/health
🔄 전환 (무중단 Blue → Green)
1. Green 스택 기동
bash
코드 복사
sudo docker compose -f docker-compose.green.yml up -d --remove-orphans
2. 내부 헬스 체크
bash
코드 복사
sudo docker exec gateway-green sh -lc \
"apk add --no-cache curl >/dev/null 2>&1 || true; \
curl -fsS http://localhost:8080/actuator/health"
3. 프록시 스위치
bash
코드 복사
bash proxy/switch.sh green
⏪ 롤백 (Green → Blue)
bash
코드 복사
bash proxy/switch.sh blue
🔐 GitHub Actions 연동 팁
기존 액션의 헬스체크 URL을
http://localhost:8080/... → http://localhost/... 로 변경

DB는 계속 유지되므로 Blue/Green만 롤링 가능

✅ 장점 요약
🧱 DB 독립 운용으로 재배포 시 연결 이슈 최소화

🔄 Blue/Green 동시 운영 → 프록시만 전환해 무중단 배포

🧭 깔끔한 디렉토리 구조로 CI/CD와 연동 용이