# refund-runbook.md — 결제 취소·환불 운영 절차

> 감사(docs/service-flow-audit.md P0-C·P1) 대응. 결제 라이브 후 환불 문의를 처리하는 표준 절차.
> 코드 경로: `cancelPayment`(paymentServer.ts) · `/api/payments/webhook` · `/admin/orders`.

## 원칙 (약관 §9 / 전자상거래법 §17②)

- 포토북·인화는 **주문제작 상품**이다. **제작 착수(주문 상태 `printing`) 이후에는 청약철회(환불)가 제한**된다.
- 제작 착수 **전**(주문 상태 `paid`)에는 취소·전액 환불이 가능하다.
- 결제 화면에서 이 사실을 사전 고지하고 동의 체크를 받는다(CheckoutForm).

## 경로 A — 앱 내 취소 (권장, 즉시 반영)

제작 착수 전(주문 상태 `paid`) 주문에 한해:

1. 관리자로 `/admin/orders` 접속(ADMIN_EMAILS 계정).
2. 대상 주문의 **[결제 취소(환불)]** 버튼 클릭 → 확인.
3. 서버가 토스 취소 API(`/v1/payments/{paymentKey}/cancel`)를 호출하고, 성공 시:
   - `payments.status = canceled`
   - 주문 상태 → `confirmed`, `paid_at = null` (재결제 가능 상태로 롤백)
4. 목록이 자동 새로고침되며 결제 상태가 "결제 취소"로 표시된다.

> 버튼은 **결제 완료 + 주문 상태 `paid`** 일 때만 노출된다. `printing` 이후에는 노출되지 않는다(청약철회 제한).

## 경로 B — 토스 대시보드에서 취소 (앱 밖)

앱 버튼을 쓸 수 없거나 부분 취소가 필요한 경우:

1. 토스페이먼츠 대시보드에서 해당 결제를 취소.
2. 토스가 웹훅(`/api/payments/webhook`)으로 `CANCELED`를 전송 → 서버가 자동으로:
   - `payments.status = canceled`
   - 주문 상태 → `confirmed` 롤백
3. 즉, **대시보드 취소만으로 앱 DB 정합성이 유지**된다(웹훅 미도착 시 경로 A로 보강).

> ⚠️ 웹훅 URL을 토스 개발자센터에 등록해야 경로 B의 자동 동기화가 작동한다:
> `https://sharesnap-three.vercel.app/api/payments/webhook`

## 제작 착수(`printing`) 이후 환불 요청

- 원칙적으로 청약철회 제한 대상이다. 상품 하자·오배송 등 서비스 귀책이 명확한 경우에 한해 개별 판단하여 경로 B(토스 대시보드)로 처리한다.
- 처리 후 주문 상태는 상황에 맞게 관리자 화면에서 수동 조정한다.

## 문의 접수 창구

- 이용약관·개인정보처리방침·footer에 게재된 문의 이메일(`businessInfo.ts`의 `email`).
- 사용자 대면 "취소 요청" 버튼(주문 상세)은 후속 과제 — 현재는 문의 이메일로 접수 후 경로 A/B로 처리한다.

## 잔여(후속)

- 사용자 주문 상세에 "취소 요청" 버튼(관리자 큐 접수).
- 주문 상태에 명시적 `canceled` 값 추가(현재는 `confirmed` 롤백으로 표현, 결제 상태로 취소 여부 판별).
- 부분 취소(수량 일부) UI.
