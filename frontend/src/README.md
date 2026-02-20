# 프론트엔드 앱 엔진 (src)

이 디렉토리는 브라우저 단에서 렌더링되는 **React (Vite 런타임)** 기반 클라이언트 애플리케이션의 핵심 소스 코드를 담고 있습니다.

## 기술 스택
- **프레임워크**: React.js 18+ (함수형 컴포넌트, 훅스 기반)
- **번들러**: Vite.js
- **라우팅**: React Router DOM (v6)
- **상태 관리/통신**: `fetch` API 기반 커스텀 헬퍼 래퍼(`client.js`), 표준 React State (`useState`, `useEffect`)

## 폴더 설계
- `api/`: 백엔드 FastAPI 런타임으로 통신하는 HTTP Helper 및 Auth Interceptor
- `components/`: 애플리케이션 전역에서 사용되는 재사용성 높은 레이아웃 (카드, 로딩바, 사이드바, 토스트) UI 조각
- `pages/`: 라우터 URL(`.app/`) 엔드포인트에 1:1 대응하는 화면 진입점 컴포넌트
- `App.jsx`: 애플리케이션 최상위 브랜치(Route Configuator)
- `index.css`: 모던 'Dark Glass' 및 그라데이션, CSS Grid/Flexbox 유틸리티 클래스 정의 변수 선언부 (테마 엔진)
