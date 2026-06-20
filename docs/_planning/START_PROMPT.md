# ShareSnap — Claude Code 오토파일럿 시작 프롬프트

> **사용법:** 아래 프롬프트를 Claude Code 터미널에 그대로 붙여넣으세요.
> 프로젝트 루트(sharesnap/)에 CLAUDE.md, STATUS.md, MEMORY.md, ORCHESTRATION.md가 이미 배치되어 있어야 합니다.

---

## 🚀 프롬프트 1: 최초 개발 시작 (Phase 1 시작)

```
나는 ShareSnap 프로젝트의 오너다. 프로젝트 루트에 개발 문서가 준비되어 있다.

지금부터 너는 6개의 서브에이전트를 오케스트레이션하는 총괄 개발자 역할을 수행한다:
- A1(Planning): 태스크 분해 및 스펙 확인
- A2(Developer): 코드 구현
- A3(Designer): UI/UX 스타일링
- A5(QC): 코드 리뷰 및 품질 검증
- A6(Tester): 테스트 작성

## 세션 시작 프로토콜 (반드시 순서대로):
1. cat CLAUDE.md — 프로젝트 규칙과 절대 규칙 숙지
2. cat STATUS.md — 현재 Phase, 진행률, [NEXT_ACTION] 확인
3. cat MEMORY.md — 아키텍처 결정, 기술 패턴 확인
4. cat ORCHESTRATION.md — 현재 Phase의 상세 태스크와 생성할 파일 목록 확인

## 작업 규칙:
- ORCHESTRATION.md의 Phase 1 태스크를 T1.1부터 순서대로 실행
- 각 태스크는 파일 목록을 보고 하나씩 생성
- 파일 3~5개 생성할 때마다 npx tsc --noEmit 실행
- 에러 발생 시 즉시 수정 후 재검증
- 태스크 완료 시 STATUS.md의 해당 체크박스를 [x]로 변경
- Phase 완료 시 npm run build 실행
- 빌드 성공하면 STATUS.md의 CURRENT_PHASE를 다음으로 업데이트
- 중요 결정이나 발견된 패턴은 MEMORY.md에 기록

## Fabric.js 절대 규칙 (위반 시 빌드 실패):
Fabric.js 관련 코드는 반드시 dynamic import + ssr: false 사용. 직접 import 절대 금지.

## 지금 시작:
STATUS.md의 [NEXT_ACTION]을 읽고 Phase 1을 시작해줘.
프로젝트가 아직 생성되지 않았으면 create-next-app부터 시작하고,
이미 생성되어 있으면 다음 미완료 태스크부터 이어서 진행해줘.
가능한 한 많이 진행하고, 세션 종료 전에 STATUS.md를 반드시 업데이트해줘.
```

---

## 🔄 프롬프트 2: 세션 이어서 진행 (중간에 끊겼을 때)

```
ShareSnap 프로젝트를 이어서 개발한다.

## 세션 복원 프로토콜:
1. cat STATUS.md — 현재 Phase, 마지막 작업, [NEXT_ACTION] 확인
2. cat MEMORY.md — 누적 결정사항과 해결된 이슈 확인
3. [NEXT_ACTION]에 적힌 작업을 즉시 이어서 실행

## 작업 규칙 (동일):
- ORCHESTRATION.md의 파일 목록에 따라 순서대로 생성
- 파일 3~5개마다 tsc --noEmit 검증
- 태스크 완료 시 STATUS.md 체크박스 업데이트
- Phase 완료 시 npm run build로 전체 빌드 검증
- 세션 종료 전 STATUS.md의 [NEXT_ACTION]에 다음에 할 작업의 구체적 명령어 기록

Fabric.js는 반드시 dynamic import + ssr: false로만 사용.
지금 STATUS.md를 읽고 바로 이어서 진행해줘.
```

---

## ⚡ 프롬프트 3: 풀 오토파일럿 (한 세션에 최대한 진행)

```
ShareSnap 프로젝트 풀 오토파일럿 모드로 개발한다.

1. cat CLAUDE.md && cat STATUS.md && cat MEMORY.md
2. ORCHESTRATION.md에서 현재 Phase의 모든 태스크 확인
3. 현재 Phase의 남은 태스크를 전부 완료할 때까지 계속 진행
4. Phase 완료 → npm run build → 성공 시 다음 Phase로 자동 전환
5. 에러 발생 시 즉시 수정, 3회 실패 시 MEMORY.md에 블로커 기록 후 다음 태스크로

작업 패턴:
- A2(Dev) 역할로 코드 생성 → A5(QC) 역할로 tsc 검증 → 다음 파일
- Phase 종료 시 A3(Design) 역할로 UI 점검
- 에러 발견 시 에러 메시지를 분석하고 즉시 수정

Fabric.js 절대 규칙: dynamic import + ssr: false만 허용
세션 한도에 도달하면 STATUS.md에 정확한 재개 지점을 기록하고 종료해줘.
지금 시작.
```

---

## 🔧 프롬프트 4: 특정 Phase만 진행

```
ShareSnap 프로젝트에서 Phase {N}을 진행한다.

1. cat STATUS.md — 현재 상태 확인
2. cat ORCHESTRATION.md — Phase {N}의 상세 태스크와 파일 목록 확인
3. Phase {N}의 T{N}.1부터 순서대로 파일 생성
4. 각 파일 생성 후 tsc --noEmit, Phase 완료 시 npm run build
5. 빌드 성공 시 STATUS.md 업데이트

Fabric.js는 반드시 dynamic import + ssr: false.
지금 Phase {N}을 시작해줘.
```

> **{N}을 원하는 Phase 번호로 교체하세요**: 1(Foundation), 2(Room&Chat), 3(Photo), 4(Editor⭐), 5(Photobook+PDF), 6(Orders&Admin), 7(Deploy)

---

## 🐛 프롬프트 5: 버그 수정

```
ShareSnap 프로젝트에서 에러가 발생했다.

1. cat STATUS.md — 현재 빌드 상태 확인
2. cat MEMORY.md — 유사 이슈 해결 이력 확인
3. 에러 내용: {에러 메시지를 여기에 붙여넣기}

에러를 분석하고 수정해줘.
수정 후 npx tsc --noEmit && npm run build로 검증하고,
해결 과정을 MEMORY.md의 "해결된 이슈 아카이브"에 기록해줘.
STATUS.md의 빌드 상태도 업데이트해줘.
```

---

## 📋 프롬프트 6: 진행상황 확인

```
ShareSnap 프로젝트 진행 상황을 보고해줘.

cat STATUS.md를 읽고 다음을 정리해줘:
- 현재 Phase와 태스크
- 전체 진행률 (완료된 Phase / 전체 Phase)
- 완료된 파일 수 / 예상 전체 파일 수
- 알려진 이슈나 블로커
- 빌드 상태
- 다음 세션에서 할 작업
```

---

## 📁 프로젝트 루트 파일 배치 확인

Claude Code를 시작하기 전에 아래 파일이 프로젝트 루트에 있는지 확인하세요:

```
sharesnap/
├── CLAUDE.md              ✅ 마스터 지시 파일
├── STATUS.md              ✅ 진행 상황 추적
├── MEMORY.md              ✅ 누적 기억
├── ORCHESTRATION.md       ✅ Phase별 태스크 파이프라인
└── docs/
    ├── dev-plan.md        ✅ 전체 개발 스펙 (DB스키마, API, 모듈)
    └── kakao-api-report.md ✅ 카카오 API 분석 보고서
```

모든 문서가 준비되었으면, **프롬프트 1**을 Claude Code에 붙여넣어 개발을 시작하세요.
