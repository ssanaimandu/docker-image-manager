# Backend App 패키지

FastAPI 애플리케이션의 메인 로직이 담긴 파이썬 패키지입니다. 

## 주요 파일
- `main.py`: FastAPI 애플리케이션 객체(`app`)가 초기화되는 진입점. 미들웨어 설정(CORS)과 라우터(`routers.*`) 등록을 담당합니다.
- `models.py`: 애플리케이션 내부 데이터 구조와 `config.json`의 스키마를 정의하는 Pydantic V2 기반 모델 집합입니다.
- `config.py`: 파일 시스템 상의 `config.json`을 읽고 쓰는 I/O 계층입니다. 메모리 내 싱글톤 형태로 설정 캐싱 및 락(동시성 제어)을 처리합니다.

## 하위 모듈 디렉토리
- `routers/`: 클라이언트의 요청 경로(HTTP Endpoint)를 처리하는 컨트롤러 역할을 담당.
- `services/`: 다양한 레지스트리(Docker Desktop, 원격 런타임, Artifactory 등)와 실제 통신하고 비즈니스 알고리즘을 수행하는 계층.
- `utils/`: 공통 유틸리티 (인증 헬퍼, 로거 등) 함수 모음 집합.
