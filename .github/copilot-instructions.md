# NAIS2 Copilot Instructions

## Project Overview
**NAIS2 (NovelAI Image Studio 2)** - Tauri 2.0 + React 18 데스크톱 앱으로 NovelAI API를 통한 AI 이미지 생성 도구입니다.

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Desktop**: Tauri 2.0 (Rust backend)
- **State**: Zustand with IndexedDB persistence
- **i18n**: i18next (ko/en/ja)
- **UI**: Radix UI primitives + shadcn/ui patterns

### Directory Structure
```
src/
├── components/     # React 컴포넌트 (layout/, ui/, feature별 폴더)
├── stores/         # Zustand 스토어 (generation-store.ts가 핵심)
├── services/       # API 서비스 (novelai-api.ts, smart-tools.ts)
├── hooks/          # Custom hooks (useSceneGeneration.ts 등)
├── lib/            # 유틸리티 (wildcard-processor.ts, metadata-parser.ts)
├── pages/          # 라우트별 페이지 컴포넌트
└── i18n/locales/   # 번역 파일 (ko.json, en.json, ja.json)
src-tauri/
├── src/lib.rs      # Rust 백엔드 (API 프록시, CORS 우회)
└── python/         # Python sidecar (tagger_server.py)
```

## Key Patterns

### State Management (Zustand)
모든 스토어는 `src/stores/`에 위치하며, 대부분 IndexedDB로 persist됩니다:
```typescript
// 패턴: persist + IndexedDB storage
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/indexed-db'

export const useMyStore = create<MyState>()(
    persist(
        (set, get) => ({ /* state & actions */ }),
        { name: 'store-key', storage: createJSONStorage(() => indexedDBStorage) }
    )
)
```

### API 호출 패턴
- **DEV 모드**: `window.fetch` 직접 사용 (CORS 허용)
- **PROD 모드**: Rust `invoke()` 통해 CORS 우회 필수
```typescript
if (!import.meta.env.DEV) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke<ResultType>('rust_command_name', { params })
} else {
    await CLIENT_FETCH(url, options)
}
```

### Generation Flow
1. `useGenerationStore.generate()` → Main Mode 단일 이미지 생성
2. `useSceneGeneration` hook → Scene Mode 배치 생성 (App.tsx에서 전역 실행)
3. `generatingMode: 'main' | 'scene' | null` 로 충돌 방지

### 다국어 처리
```typescript
// 항상 useTranslation 훅 사용
const { t } = useTranslation()
t('key.path', '기본값')  // fallback 포함 권장

// 새 키 추가시 3개 파일 모두 업데이트:
// src/i18n/locales/{ko,en,ja}.json
```

### UI 컴포넌트
- `src/components/ui/` → shadcn/ui 스타일 기본 컴포넌트
- `cn()` 유틸리티로 Tailwind 클래스 병합: `cn("base-class", conditionalClass && "applied")`
- Context menu 허용: `data-allow-context-menu` 속성 추가

## Development Commands
```bash
npm run tauri:dev    # 개발 서버 (hot reload)
npm run tauri:build  # 프로덕션 빌드
npm run lint         # ESLint 검사
```

## Common Tasks

### 새 스토어 추가
1. `src/stores/my-store.ts` 생성 (위 Zustand 패턴 참고)
2. persist 필요시 IndexedDB storage 사용
3. 다른 스토어 참조: `useOtherStore.getState()` (React 외부에서)

### 새 페이지 추가
1. `src/pages/MyPage.tsx` 생성
2. `src/App.tsx`에 Route 추가
3. `src/components/layout/ThreeColumnLayout.tsx` navItems 배열에 추가

### Rust 명령 추가
1. `src-tauri/src/lib.rs`에 `#[tauri::command]` 함수 추가
2. `tauri::Builder`의 `.invoke_handler()` 에 등록
3. Frontend에서 `invoke<T>('command_name', { args })`

## Important Notes
- **NovelAI API**: image.novelai.net (이미지 생성) / api.novelai.net (인증)
- **Streaming**: 이미지 생성 중 프리뷰를 위해 msgpack 디코딩 사용
- **Wildcard**: 프롬프트 내 `(옵션1/옵션2)` 형식 랜덤 선택 지원
- **Vibe Transfer**: PNG 메타데이터에 encodedVibe 캐싱으로 API 절약
