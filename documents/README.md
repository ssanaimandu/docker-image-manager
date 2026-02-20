# 기술문서 저장소 (Documents)

`Docker Image Manager`(DIM) 애플리케이션의 개발 히스토리, 설정 매뉴얼, 그리고 인증 등 특정 시스템 아키텍처에 관련된 상세 설명/가이드 문서들을 포함합니다.

## 보유 문서 소개
- `LOGIN.md`: 가장 핵심적인 `Local`, `GitHub OAuth`, 그리고 범용 `OIDC / Authelia` 인증 설정 방법을 서술합니다. 내부적으로 Auth Guard (Vite + FastAPI + JWT)가 어떻게 동작하며, 브라우저가 어떤 플로우를 타고 토큰을 `localStorage`에 삽입하는지 상세한 과정을 요약합니다. 또한 패스워드를 갱신(`Bcrypt`)하는 로직 및 `configuration.yml`(Authelia 측 설정)을 `DIM`과 어떻게 매칭하는지 표의 형태로 제공하고 있습니다.

(추가로 필요한 정책 설계, 시스템 라이프사이클 구조도 같은 파일들이 훗날 이곳에 관리되는 아카이브 저장소입니다.)
