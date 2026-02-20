# 애플리케이션 설정 저장소 (Config)

`Docker Image Manager` 실행에 필요한 유일한 데이터베이스 공간입니다. 별도의 RDBMS 엔진(MySQL 등)을 사용하지 않고, 오직 JSON 파일 마운트 방식의 NoSQL 구조 엔진을 지원해 이식성(Portability)을 극대화했습니다. 

## 파일별 용도
- `config.json`: 시스템이 가장 먼저 읽게 되는(가장 중요도 높은) 영구 상태 저장소(Persistent Storage)로, 백엔드 앱의 환경변수 `$DIM_CONFIG_PATH` 로 바인딩 되어 맵핑되는 파일입니다.
- **포함하는 설정 범위**:
  1. `auth`: Local Auth(Bcrypt Password) 또는 범용 OAuth (OIDC / Authelia 연동 값 및 Github API Secrets) 정보
  2. `sources`: 마운팅해둔 Docker Socket의 Host 주소 및 ID값 (식별자 UUID)
  3. `image_policies`: 지우지 않고 유지해야 하는 Tag 개수 값 및 `traefik` 등 특정 이미지 네임스페이스의 예외 조항 등
