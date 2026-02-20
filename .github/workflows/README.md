# 지속적인 통합/배포 파이프라인 (GitHub Workflows)

이 디렉토리는 `Docker Image Manager` 깃허브 소스 저장소에 동작을 자동으로 트리거해주는 **GitHub Actions (CI/CD)** YAML 스크립트 모음집 역할 영역입니다. 서버 개발이나 로컬 컴퓨터 스크립트가 아니며, GitHub 서버 생태계에서 작동(Run Runner)합니다.

## 등록된 워크플로우 종류
- `docker-publish.yml`: 애플리케이션(`main` 브랜치 소스 포함 릴리즈 태그)을 바탕으로 **DockerHub (또는 타 컨테이너 레지스트리)**에 Docker 스펙의 이미지를 구워서 게시(`Push`)하는 핵심 행동 체인입니다.
  - 새 버전의 릴리즈(v1.0 등)가 발행([published])되거나,
  - `workflow_dispatch` 설정에 의해 유저가 Actions 패널 메뉴에서 [Run workflow] 버튼을 클릭해 '수동 호출'할 때 실행되는 2가지 트리거 방식을 가집니다.
  - `secrets.DOCKERHUB_USERNAME` 변수값을 참조합니다.

해당 폴더를 읽어 다른 저장소로 옮길 경우 파이프라인의 핵심 보안, 실행 문법과 배포 흐름을 즉시 파악할 수 있도록 작성되었습니다.
