# 쇼핑몰 (MongoDB + Express + React + TS)

> ⚠️ 참고: 이 코드는 **벤치마킹/학습용 레이아웃**과 **간단한 로그인(ADMIN/USER Role)** 을 포함합니다.
> 운영 시에는 도메인/보안/이미지/결제 등을 보강하세요.

## 폴더 구조
```
shopping-mall-mongo-auth/
  frontend/   # Vite + React + Tailwind + React Query + Zustand
  backend/    # Express + Mongoose + JWT(refresh cookie) + Role(Admin/User)
```

## 빠른 시작

### 0) MongoDB 준비
- 로컬 몽고 실행 또는 MongoDB Atlas 연결 문자열 준비
- `.env`에 `MONGODB_URI` 채우기

### 1) 백엔드
```
cd backend
npm i
npm run dev
```
- 기본 포트: http://localhost:4000
- 환경변수: `.env.sample` 참고해 `.env` 생성

### 2) 프런트엔드
```
cd ../frontend
npm i
npm run dev
```
- 개발 서버: http://localhost:5173
- 프록시(`/api` → 4000) 설정되어 있음

### 3) 관리자 계정 생성
```
cd backend
npm run seed
```
- 이메일: `admin@example.com`, 비번: `admin1234`(운영에서 반드시 변경)

## API 요약
- `POST /api/auth/register` `{ email, password }`
- `POST /api/auth/login` `{ email, password }` → `accessToken` 반환 + `rt`(httpOnly) 쿠키
- `POST /api/auth/refresh` → 새 `accessToken`
- `POST /api/auth/logout` → 리프레시 무효화
- `GET /api/auth/me` (Bearer) → 내 정보
- `GET /api/products` 공개
- `POST /api/products` (ADMIN 전용) 예시
