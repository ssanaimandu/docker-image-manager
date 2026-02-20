# 비즈니스 서비스 & 추상화 (Services)

실질적인 인프라스트럭처 조회 및 비즈니스 엔진(알고리즘) 계층입니다. 다양한 도커/레지스트리 환경을 동일한 추상화 함수로 제공합니다.

## 핵심 컴포넌트
- `docker_engine.py`: `docker_client()` (Docker-py) 모듈을 이용해 `Local Socket(/var/run/docker.sock)` 및 `Remote TCP` 데몬과 직접 통신하여 이미지를 조회 및 태그 삭제하는 구현부입니다.
- `private_registry.py` & `artifactory.py`: Docker 공식 Registry V2 API 혹은 JFrog와 같이 별도의 REST 통신이 필요한 원격 저장소에 대응하기 위해 HTTP Client(httpx)를 활용하는 모듈입니다. (확장 대응)
- `cleanup.py`: 가장 핵심적인 알고리즘이 내장되어 있습니다. `preview/execute` 로직에서 등록된 Policy 설정(유지 개수 등)을 바탕으로 날짜를 소팅하고 태그를 비교하여 "지워야 할 것"과 "보존해야 할 것" 집합을 수학적으로 구분하는 프로세스가 있습니다. (Dry Run 포함)
