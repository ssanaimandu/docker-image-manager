# Docker Image Manager 인증 연동 가이드

본 문서는 Docker Image Manager (DIM) 애플리케이션에 적용된 인증 시스템의 구현 내역 및 설정 방법을 설명합니다. 인증 기능을 통해 애플리케이션의 보안을 강화하고, 로컬 관리자 계정뿐만 아니라 설치형 분산 인증 시스템인 **Authelia**, **Keycloak** 등 범용 OIDC (OpenID Connect) 서버, 그리고 **GitHub OAuth** 연동을 지원하도록 구성되었습니다.

---

## 1. 구현된 인증 유형

### 1-1. Local 인증 (Username/Password)
- **방식**: JSON Web Token(JWT) 기반 로컬 사용자 인증
- **특징**: `bcrypt` 암호화 알고리즘을 사용한 안전한 비밀번호 검증. 기본 제공되는 관리자 계정 사용.
- **기본 계정**: 아이디 `admin` / 비밀번호 `admin`

### 1-2. 범용 OIDC 인증 (Authelia 지원)
- **방식**: OpenID Connect 기반 Authorization Code 흐름 (Grant Type: `authorization_code`)
- **특징**: 사내 구축된 Authelia 또는 Keycloak 등의 인증 서버를 직접 연결하여 통합 인증이 가능합니다.
- **지원 파라미터**: Authorization URL, Token URL, UserInfo URL 직접 입력 기능 지원. 토큰 발급 후 `userinfo` 엔드포인트를 호출하여 `preferred_username`, `email`, `sub` 필드 중 하나를 취합해 세션을 생성합니다.

### 1-3. GitHub OAuth
- **방식**: GitHub OAuth App 연동 기반 인증
- **특징**: GitHub 사용자를 DIM 인증 세션으로 발급. (소규모 조직/개인 프로젝트용으로 유용)

---

## 2. 주요 수정 내역

### 2-1. 백엔드 (FastAPI)
1. **의존성 추가**: `pyjwt`, `passlib[bcrypt]`, `bcrypt==3.2.2` 패키지가 요구사항에 추가되었습니다.
2. **보안 모듈 생성 (`app/utils/security.py`)**: 단방향 비밀번호 검증, JWT 토큰 생성(`create_access_token`) 및 토큰 종속성 주입(`get_current_user`)을 위한 모듈이 작성되었습니다.
3. **인증 라우터 생성 (`app/routers/auth.py`)**:
    - `POST /api/auth/login`: Local 계정 및 비밀번호 검증 후 JWT 액세스 토큰 반환.
    - `POST /api/auth/oauth`: GitHub 또는 Generic OIDC 콜백 코드를 통해 각각의 인증 서버에서 액세스 토큰과 사용자 정보를 획득하고, 성공 시 DIM 자체 JWT 토큰을 발급하여 반환.
    - `GET /api/auth/status`: 애플리케이션에서 활성화된 인증 수단 및 설정 정보(UI 표출에 필요한 Client ID, Endpoint 등) 제공 (App Secret 키는 제외됨).
4. **API 보호 적용**: 기존의 리소스 엔드포인트(`sources`, `images`, `policies`, `cleanup`) 설정에 `dependencies=[Depends(get_current_user)]`가 추가되어 권한이 없는 접근을 막도록 보호되었습니다.
5. **모델 수정 (`app/models.py`)**: 
   - `AppConfig` 내부에 `auth` 객체가 추가되었습니다. 하위에 `LocalAuth`, `GithubOAuth`, `GenericOIDC` 스키마가 정의되어 있습니다.

### 2-2. 프론트엔드 (React, Vite)
1. **API 클라이언트 확장 (`src/api/client.js`)**: 
   - Axios/Fetch 통신 시 `localStorage`에서 토큰을 확인하여 `Authorization: Bearer <token>` 헤더를 삽입하도록 개선되었습니다.
   - 응답이 `401 Unauthorized`로 떨어지면 유효하지 않은 토큰을 삭제하고 로그인 페이지(`/login`)로 리다이렉션합니다.
2. **로그인 UI 추가 (`src/pages/Login.jsx`)**:
   - `admin` 계정을 입력하여 Local 인증을 수행할 수 있는 폼 추가.
   - 백엔드의 `/api/auth/status` 정보를 읽어들여 OIDC 버튼이나 GitHub 버튼을 동적으로 그려주는 렌더링 추가.
3. **사이드바 로그아웃 추가 (`src/components/Sidebar.jsx`)**: 
   - 좌측 네비게이션 트리 하단에 로그아웃 버튼을 추가하여 토큰 파기 후 로그인 화면으로 전환되도록 지원합니다.
4. **라우팅 조정 (`src/App.jsx`)**: 
   - `/login` 경로를 전역 레이아웃 외부로 분리 설정하였습니다.

---

## 3. 설정 (`config.json`)

루트 디렉토리의 `config/config.json`의 `auth` 항목을 통해 인증 시스템을 활성화하고 구성할 수 있습니다. 

### 인증 비활성화 방법 
`auth.enabled` 파라미터를 `false`로 지정하면 시스템에 누구나 이전처럼 자유롭게 접근할 수 있습니다.

### 통합 예시 설정 (Authelia OIDC & Local 활성화)
```json
{
  "auth": {
    "enabled": true,
    "jwt_secret": "eeb00d23-26...임의의_유니크한_길다란_문자열",
    "local": {
      "username": "admin",
      "password_hash": "$2b$12$/h76Yg0v4uIlB5bnh9yGvO8mMktOQ97zKLX8NOFdILSQbKdaT3FGG" 
    },
    "oauth": {
      "github": {
        "enabled": false,
        "client_id": "",
        "client_secret": ""
      },
      "oidc": {
        "enabled": true,
        "provider_name": "Authelia",
        "client_id": "YOUR_AUTHELIA_CLIENT_ID",
        "client_secret": "YOUR_AUTHELIA_CLIENT_SECRET",
        "authorization_url": "https://auth.yourdomain.com/api/oidc/authorization",
        "token_url": "https://auth.yourdomain.com/api/oidc/token",
        "userinfo_url": "https://auth.yourdomain.com/api/oidc/userinfo",
        "scope": "openid profile email"
      }
    }
  },
  "default_keep_tags": 5,
  "sources": [...기존_연동들...],
  "image_policies": {...기존_정책들...}
}
```

### OIDC (Authelia) 설정 필드 상세 안내

`config.json`의 `auth.oauth.oidc` 하위에 들어가는 각 설정 값들과 **Authelia `configuration.yml`** 설정 간의 매칭 관계입니다.

| DIM 필드명 (`config.json`) | 설명 및 역할 | 매칭되는 Authelia 설정 (`configuration.yml`) 위치 및 내용 |
| :--- | :--- | :--- |
| **`enabled`** | OIDC 인증 활성화 여부 | `true` (DIM 활성화용 플래그) |
| **`provider_name`** | 버튼에 표시될 공급자 이름 | 표시용 레이블 (예: `"Authelia"`) |
| **`client_id`** | 애플리케이션 식별용 공개 ID | `identity_providers.oidc.clients[].client_id` 에 명시된 값 (예: `"docker-image-manager"`) |
| **`client_secret`** | 애플리케이션 식별용 비밀 키 | `identity_providers.oidc.clients[].client_secret` 에 명시된 **해시화된 비밀번호의 원본(평문)** |
| **`authorization_url`** | 권한 부여 엔드포인트 | `https://[Authelia주소]/api/oidc/authorization` |
| **`token_url`** | 토큰 교환 엔드포인트 | `https://[Authelia주소]/api/oidc/token` |
| **`userinfo_url`** | 사용자 정보 조회 엔드포인트 | `https://[Authelia주소]/api/oidc/userinfo` |
| **`scope`** | 토큰 발급 시 요청 권한 범위 | `openid profile email` (공백으로 구분, Authelia `scopes` 목록 중 사용할 스코프 지정) |

#### 📝 Authelia `configuration.yml` 등록 예시

정상적인 인증 연동을 위해 Authelia 쪽에도 DIM을 클라이언트로 등록해야 합니다.

```yaml
identity_providers:
  oidc:
    ## ... 기존 OIDC 설정 ...
    clients:
      - client_id: 'docker-image-manager'       # DIM 설정의 client_id 항목과 동일해야 함
        client_name: 'Docker Image Manager'
        client_secret: '$pbkdf2-sha512$...'     # DIM에 작성한 평문을 Authelia 권장 방식으로 해시화한 값
        public: false                           # client_secret을 사용하므로 false
        authorization_policy: 'two_factor'      # 권한 부여 정책 (설치 환경에 맞게 조정: one_factor 등)
        redirect_uris:
          - 'http://[DIM서버주소]/login'            # 포트가 존재한다면 포트 포함 (예: http://localhost:3000/login)
          # HTTPS를 사용하시는 경우 https:// 로 기재 필수
        scopes:
          - 'openid'
          - 'profile'
          - 'email'
        userinfo_signed_response_alg: 'none'
```

> ⚠️ **Redirect URI 관련 주의사항** <br>
> 콜백 주소는 스펠링 하나라도 틀리거나 포트 번호가 누락되면 `Invalid redirect_uri` 에러가 발생하므로, DIM에 접근할 때 상단 브라우저 주소창에 표시되는 호스트 + `/login`을 정확히 일치시켜 주어야 합니다.

> **비밀번호 해시 값 변경**: 초기 비밀번호 `admin`을 변경하시려면 `passlib.context (bcrypt)` 를 사용하여 사용자 정의 비밀번호를 해시화한 후 `password_hash` 에 대체해서 입력하시면 됩니다.
> 변경 스크립트 예시: 
> `python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt'], deprecated='auto').hash('나의새비밀번호'))"`
