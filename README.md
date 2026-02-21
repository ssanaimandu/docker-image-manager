# 🐋 Docker Image Manager (DIM)

Docker Engine, Private Registry, JFrog Artifactory에 있는 Docker 이미지를 통합 관리하는 웹 애플리케이션입니다.

![Python](https://img.shields.io/badge/Python-3.11-blue) ![React](https://img.shields.io/badge/React-18-61DAFB) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## 📋 주요 기능

| 기능 | 설명 |
|------|------|
| **다중 소스 관리** | Local/Remote Docker Engine, Private Registry, JFrog Artifactory 통합 |
| **이미지 조회** | 모든 소스의 이미지와 태그를 한 곳에서 조회 |
| **태그 일괄 삭제** | 체크박스 선택을 통한 다중 태그 일괄 정리 기능 |
| **원클릭 보호 토글** | UI에서 직관적인 버튼 클릭으로 태그 보호 모드(Protect) 즉시 전환 |
| **태그 보존 정책** | 이미지별 유지할 태그 개수 설정 (미설정 시 기본값 사용) |
| **보호 태그** | 특정 태그(예: `latest`, `stable`)를 삭제 대상에서 제외 |
| **자동 삭제 제외** | 특정 이미지를 자동 정리 대상에서 완전히 제외 |
| **실행 중 컨테이너 보호** | Docker Engine에서 실행 중인 컨테이너의 이미지 태그는 삭제하지 않음 |
| **Dry-run & 용량 미리보기** | 삭제 실행 전 삭제/보존 대상 태그를 검증하고, 확보 예정 물리 용량(MB)을 시각화 |
| **웹 UI** | 모든 설정과 관리를 웹 브라우저에서 직관적으로 수행 |

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────┐
│     Docker Container (DIM)      │
│                                 │
│  ┌──────────┐  ┌─────────────┐  │
│  │ React UI │──│ FastAPI      │  │
│  │ (Static) │  │ Backend     │  │
│  └──────────┘  └──────┬──────┘  │
│                       │         │
└───────────────────────┼─────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
    ┌─────▼─────┐ ┌─────▼──────┐ ┌────▼────────┐
    │  Docker   │ │  Private   │ │   JFrog     │
    │  Engine   │ │  Registry  │ │ Artifactory │
    │ (socket)  │ │ (API V2)   │ │ (REST API)  │
    └───────────┘ └────────────┘ └─────────────┘
```

---

## 🚀 빠른 시작

### Docker Compose (권장)

```bash
# 1. 저장소 클론
git clone <repository-url>
cd docker-image-manager

# 2. 실행
docker-compose up -d

# 3. 브라우저에서 접속
open http://localhost:8080
```

### Docker 단독 실행

```bash
# 빌드
docker build -t docker-image-manager .

# 실행
docker run -d \
  --name docker-image-manager \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/config:/app/config \
  docker-image-manager
```

### 개발 환경

```bash
# Backend
cd backend
pip install -r requirements.txt
DIM_CONFIG_PATH=../config/config.json uvicorn app.main:app --reload --port 8000

# Frontend (별도 터미널)
cd frontend
npm install
npm run dev
```

개발 시 Frontend(http://localhost:3000)에서 Backend(http://localhost:8000)으로 API가 자동 프록시됩니다.

---

## ⚙️ 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DIM_WEB_PORT` | `8080` | 웹 서비스 포트 |
| `DIM_CONFIG_PATH` | `/app/config/config.json` | 설정 파일 경로 |
| `DIM_LOG_LEVEL` | `INFO` | 로그 레벨 (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |

### 포트 변경 예시

```bash
# docker-compose
DIM_WEB_PORT=9090 docker-compose up -d

# docker run
docker run -d -p 9090:9090 -e DIM_WEB_PORT=9090 docker-image-manager
```

### 설정 파일 경로 변경 예시

```bash
docker run -d \
  -e DIM_CONFIG_PATH=/data/my-config.json \
  -v /my/host/path:/data \
  docker-image-manager
```

---

## 📄 설정 파일 (`config.json`)

모든 설정은 JSON 파일에 저장되며, 웹 UI를 통해 관리할 수 있습니다.

### 기본 구조

```json
{
  "default_keep_tags": 5,
  "sources": [],
  "image_policies": {}
}
```

### 소스(Sources) 설정

#### Docker Engine (Local)

```json
{
  "id": "auto-generated-uuid",
  "name": "Local Docker Engine",
  "type": "docker_engine",
  "connection": {
    "socket_path": "/var/run/docker.sock"
  },
  "enabled": true
}
```

#### Docker Engine (Remote)

```json
{
  "id": "auto-generated-uuid",
  "name": "Remote Docker Engine",
  "type": "docker_engine",
  "connection": {
    "host": "tcp://192.168.1.100:2375",
    "tls": false
  },
  "enabled": true
}
```

#### Private Registry

```json
{
  "id": "auto-generated-uuid",
  "name": "Private Registry",
  "type": "private_registry",
  "connection": {
    "url": "https://registry.example.com",
    "username": "admin",
    "password": "secret",
    "insecure": false
  },
  "enabled": true
}
```

#### JFrog Artifactory

```json
{
  "id": "auto-generated-uuid",
  "name": "JFrog Artifactory",
  "type": "artifactory",
  "connection": {
    "url": "https://artifactory.example.com",
    "repository": "docker-local",
    "username": "admin",
    "password": "secret",
    "api_key": "",
    "use_registry_api": false
  },
  "enabled": true
}
```

> **💡 `use_registry_api`**: JFrog REST API에 삭제 권한이 없는 경우 `true`로 설정하면 Docker Registry API V2를 대신 사용합니다.

### 이미지 보존 정책

```json
{
  "image_policies": {
    "myapp": {
      "keep_tags": 10,
      "exclude_from_cleanup": false,
      "protected_tags": ["latest", "stable"]
    },
    "nginx": {
      "keep_tags": null,
      "exclude_from_cleanup": true,
      "protected_tags": []
    }
  }
}
```

| 필드 | 설명 |
|------|------|
| `keep_tags` | 보존할 태그 수 (`null`이면 `default_keep_tags` 사용) |
| `exclude_from_cleanup` | `true`면 자동 정리 대상에서 완전 제외 |
| `protected_tags` | 항상 보존할 태그 이름 목록 |

---

## 🖥️ 웹 UI 사용법

### 1. Dashboard

애플리케이션 접속 시 Dashboard가 표시됩니다. 연결된 소스 수, 총 이미지 수, 총 태그 수, 설정된 정책 수를 한눈에 확인할 수 있습니다.

### 2. Sources (소스 관리)

- **소스 추가**: `+ Add Source` 버튼 클릭 → 타입 선택 → 연결 정보 입력 → `Create`
- **연결 테스트**: `🔌 Test` 버튼으로 실제 연결 확인
- **소스 편집**: `✏️ Edit` 버튼으로 연결 정보 수정
- **소스 삭제**: `🗑️` 버튼으로 삭제

### 3. Images (이미지 조회)

- 모든 소스의 이미지를 통합 조회
- 소스 타입별 필터, 이미지 이름 검색 가능
- 이미지 행 클릭 시 태그 상세 정보 확장 표시
  - 태그 이름, 크기, 생성일, 상태(Running/Protected)

### 4. Policies (보존 정책)

- **기본 보존 개수**: 모든 이미지에 적용되는 기본 태그 보존 수 설정
- **이미지별 정책**: 특정 이미지에 대한 커스텀 보존 수, 보호 태그, 자동 삭제 제외 설정
- 웹 UI에서 추가/수정/삭제 가능

### 5. Cleanup (태그 정리)

1. **Preview Cleanup** 클릭 → 삭제 예정 태그와 보존 태그를 미리 확인
   - 🟢 **Running**: 실행 중인 컨테이너 (Docker Engine만)
   - 🔒 **Protected**: 보호 태그로 설정됨
   - ✅ **Keep**: 보존 정책에 의해 유지
   - ❌ **Delete**: 삭제 예정
2. 확인 후 **Execute Cleanup** 클릭 → 실제 삭제 실행
3. 결과에서 성공/실패 건수 확인

---

## 🔒 삭제 안전 장치

| 안전 장치 | 설명 |
|-----------|------|
| **Dry-run 필수** | 삭제 전 반드시 미리보기를 통해 확인 |
| **실행 중 컨테이너 보호** | Docker Engine에서 실행 중인 컨테이너의 이미지는 삭제하지 않음 |
| **Protected Tags** | `latest`, `stable` 등 보호 태그는 절대 삭제하지 않음 |
| **Exclude Images** | `exclude_from_cleanup: true`인 이미지는 정리 대상에서 완전 제외 |
| **최신 우선 보존** | 태그를 생성일 기준 최신순으로 정렬하여 오래된 것부터 삭제 |
| **확인 대화상자** | 실행 시 경고 메시지와 확인 필요 |

---

## 📡 REST API

API 문서는 서버 실행 후 `/docs` (Swagger UI) 또는 `/redoc`에서 확인할 수 있습니다.

### 주요 엔드포인트

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | 헬스 체크 |
| `GET` | `/api/sources` | 소스 목록 조회 |
| `POST` | `/api/sources` | 소스 추가 |
| `PUT` | `/api/sources/{id}` | 소스 수정 |
| `DELETE` | `/api/sources/{id}` | 소스 삭제 |
| `POST` | `/api/sources/{id}/test` | 소스 연결 테스트 |
| `GET` | `/api/images` | 전체 이미지 조회 |
| `GET` | `/api/images/by-source/{id}` | 소스별 이미지 조회 |
| `GET` | `/api/policies` | 전체 정책 조회 |
| `PUT` | `/api/policies/default` | 기본 정책 수정 |
| `PUT` | `/api/policies/{image}` | 이미지별 정책 수정 |
| `DELETE` | `/api/policies/{image}` | 이미지 정책 삭제 |
| `POST` | `/api/cleanup/preview` | 정리 미리보기 (dry-run) |
| `POST` | `/api/cleanup/execute` | 정리 실행 |

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | Python 3.11, FastAPI, uvicorn |
| Frontend | React 18, Vite |
| Docker SDK | `docker` Python SDK (docker.sock) |
| HTTP Client | `httpx` (Registry/Artifactory API) |
| 설정 저장 | JSON 파일 |
| 컨테이너 | Docker, docker-compose |

---

## 🐛 트러블슈팅

### Docker Engine 연결 실패

```bash
# docker.sock 마운트 확인
docker run -v /var/run/docker.sock:/var/run/docker.sock ...

# 권한 확인
ls -la /var/run/docker.sock
```

### Private Registry 삭제 실패

Registry에서 삭제를 활성화해야 합니다:

```yaml
# registry config.yml
storage:
  delete:
    enabled: true
```

### JFrog Artifactory 권한 오류

- Artifactory에서 해당 사용자에게 `Delete/Overwrite` 권한이 필요합니다.
- 권한이 부족한 경우 소스 설정에서 `Use Registry API V2` 옵션을 활성화하세요.

### Remote Docker Engine 연결

원격 Docker Engine의 TCP 소켓이 열려있어야 합니다:

```bash
# Docker daemon 설정 (/etc/docker/daemon.json)
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

> ⚠️ TLS 없이 TCP를 노출하면 보안 위험이 있습니다. 프로덕션 환경에서는 반드시 TLS를 설정하세요.

---

## 📜 라이선스

MIT License
