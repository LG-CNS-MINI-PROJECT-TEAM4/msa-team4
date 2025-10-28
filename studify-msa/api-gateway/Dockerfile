# -----------------------------
# 1) Build stage (Gradle wrapper)
# -----------------------------
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /workspace

# Gradle 캐시 최적화: 의존성 먼저 받아두기
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

# 실제 소스 반영
COPY src ./src

# 테스트 스킵 가능(필요시 제거)
RUN ./gradlew --no-daemon clean bootJar -x test

# -----------------------------
# 2) Run stage (경량 런타임)
# -----------------------------
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# (선택) 비루트 사용자로 실행—보안상 권장
RUN useradd -r -s /bin/false spring && chown -R spring:spring /app
USER spring

# JAR 복사 (부트JAR 한 개라고 가정)
COPY --from=builder /workspace/build/libs/*.jar app.jar

# (선택) JVM 옵션 주입용
ENV JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:InitialRAMPercentage=50 -XX:MaxRAMPercentage=75"
# (선택) Spring profile
# ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
