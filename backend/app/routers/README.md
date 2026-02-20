# API 라우터 (Routers)

FastAPI의 HTTP Endpoint 목록을 모아둔 모듈(`APIRouter`) 그룹입니다. 각 파일은 기능별 도메인으로 분리되어 있으며, 클라이언트(프론트엔드)의 직접적인 요청 응답 처리를 담당합니다.

## 분리된 라우터 목록
- `auth.py`: JWT 토큰 발급, 로컬 로그인 통과 확인, OAuth (GitHub/OIDC) 콜백 및 서버 인증 상태 조회 관련 엔드포인트 `/api/auth/*`
- `sources.py`: 레지스트리 연결 정보 조회, 추가, 수정, 테스트 등 소스 설정 관리 엔드포인트 `/api/sources/*`
- `images.py`: 각 레지스트리 소스에 등록된 컨테이너 이미지 및 속성 값(태그, 날짜 리스트) 패칭 `/api/images/*`
- `policies.py`: 시스템 기본 이미지 보관 개수 설정 변경 및 개별 앱(이미지)별 맞춤형 정리 정책(가비지 컬렉션 규칙 등) 관리 `/api/policies/*`
- `cleanup.py`: 정책 기반으로 정리 대상인 이미지를 계산하는 **Preview(미리보기)**, 그리고 실제로 레지스트리에서 지우는 알고리즘인 **Execute(실행)** 트리거 라우터. `/api/cleanup/*`

## 권한 보호
- `auth.py`를 제외한 대부분의 라우터는 코드 내에 `Depends(get_current_user)`가 적용되어 있어 올바른 `Bearer <token>` 헤더가 없으면 401 코드를 반환하도록 보호되어 있습니다.
