# Backend 디렉토리

이 디렉토리는 Docker Image Manager 애플리케이션의 핵심 비즈니스 로직과 API를 제공하는 **FastAPI 기반 백엔드 서비스** 코드를 포함합니다.

## 구조 및 아키텍처
본 백엔드는 단일 `app` 모듈에 기능별로 디렉토리를 나누어 구성된 모듈러(Modular) 아키텍처를 따릅니다.
- **Python 의존성**: `requirements.txt`에 명시되어 있으며, FastAPI, uvicorn, PyJWT, passlib, docker-py, httpx 등이 포함됩니다.
- **실행 엔트리포인트**: `app/main.py`
- **전역 설정**: `config/config.json` 파일을 마운트하여 런타임에 동적으로 읽어옵니다.

## 주요 특징
- JWT 및 OAuth2(Github, OIDC/Authelia) 인증 연동 지원
- Docker API 연동 (로컬 소켓 및 원격 TCP)
- 설정 값의 영속적인 JSON 파일 저장
- 태그 기반 이미지 정리 정책(Policy) 실행 엔진 탑재
