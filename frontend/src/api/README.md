# API 클라이언트 (API)

프론트엔드 React 앱이 외부 백엔드 서버(FastAPI)와 원활하게 JSON 데이터를 주고 받기 위한 `Fetch API`의 추상화된 래퍼(Wrapper) 코드 패턴입니다.

## 내부 기능 (client.js)
1. **Request Interceptor**: 로컬의 `localStorage` 스토리지에 보관된 **`dim_token`** (JWT Token)을 스캔하여, 존재할 경우 모든 송신되는 HTTP Request의 Header에 `Authorization: Bearer <token>` 형태로 안전하게 이어 붙이는(Injected) 보안 레이아웃입니다.  
2. **Response Validator (401 Redirector)**: 모든 요청의 응답 코드(Status)를 1차 필터링합니다. 인증이 만료되었거나 부적합해 **401 에러**가 서버로부터 튀어나왔을 시 오류 화면이 아닌, 현재 저장된 불량 토큰을 쓰레기통에 바로 삭제하고 브라우저 `window.location.href '/login'` 코드를 강제 호출함으로써 사용자 세션을 만료 시키는 로직을 내장하고 있습니다.
