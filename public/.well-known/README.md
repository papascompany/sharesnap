# .well-known (TWA Digital Asset Links)

`assetlinks.json`은 TWA(Trusted Web Activity, Android 앱)에서 도메인 소유권을
검증하기 위한 Digital Asset Links 파일입니다. Next public 정적 서빙으로
`/.well-known/assetlinks.json` 경로에 노출됩니다(미들웨어/proxy 제외 처리 완료).

## 현재 상태

플레이스홀더(빈 배열 `[]`). TWA를 아직 배포하지 않았으므로 검증 대상이 없습니다.

## TODO — 실제 지문 채우기

Play Console에서 앱 서명키(SHA-256 fingerprint)를 발급받은 뒤 아래 형식으로 교체하세요.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.sharesnap.twa",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:...:99"  // TODO: Play Console 서명키 지문으로 교체
      ]
    }
  }
]
```

- `package_name`: 실제 TWA 패키지명으로 교체
- `sha256_cert_fingerprints`: Play App Signing 키 지문(release) — 업로드키와 다를 수 있으니 Play Console 값 사용
- 검증: https://developers.google.com/digital-asset-links/tools/generator
