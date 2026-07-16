import { LegalShell, LegalSection } from "@/modules/legal/components/LegalShell";
import { BUSINESS_INFO } from "@/modules/shared/lib/businessInfo";

export const metadata = {
  title: "개인정보처리방침 — ShareSnap",
};

const S = BUSINESS_INFO.serviceName;

export default function PrivacyPage() {
  return (
    <LegalShell title="개인정보처리방침">
      <p className="text-[13.5px] leading-[1.7] text-muted-foreground">
        {S}은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기
        위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <LegalSection heading="1. 수집하는 개인정보 항목 및 방법">
        <p>서비스는 다음의 개인정보를 수집합니다.</p>
        <p>
          · <strong>계정 정보</strong>: 이메일 주소(이메일 로그인 시), 카카오 계정
          식별자·닉네임·프로필 이미지(카카오 로그인 시)
        </p>
        <p>
          · <strong>이용자가 올린 콘텐츠</strong>: 공유방에 업로드하는 사진(인물의
          얼굴이 포함될 수 있음), 코멘트
        </p>
        <p>
          · <strong>주문·배송 정보</strong>: 수령인 이름, 연락처, 배송지 주소, 주문
          내역
        </p>
        <p>
          · <strong>결제 정보</strong>: 결제 승인 내역(결제수단의 카드번호 등 민감
          정보는 토스페이먼츠㈜가 처리하며 서비스는 저장하지 않음)
        </p>
        <p>
          · <strong>자동 수집 정보</strong>: 서비스 이용 과정에서 생성되는 접속 기록 등
        </p>
        <p>
          수집 방법: 회원가입·로그인, 사진 업로드, 주문·결제 과정에서 이용자가 직접
          입력하거나 서비스 이용 중 자동으로 생성됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="2. 개인정보의 처리 목적">
        <p>· 회원 식별 및 로그인, 서비스 제공 및 운영</p>
        <p>· 공유방 사진 공유, 포토북 편집·제작, 사진 인화 등 기능 제공</p>
        <p>· 주문 처리, 결제, 배송 및 고객 문의 대응</p>
        <p>· 부정 이용 방지 및 서비스 안정성 확보</p>
      </LegalSection>

      <LegalSection heading="3. 개인정보의 보유 및 이용 기간">
        <p>
          서비스는 원칙적으로 이용자의 회원 탈퇴 시 지체 없이 개인정보를 파기합니다.
          다만 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
        <p>· 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</p>
        <p>· 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</p>
        <p>· 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</p>
      </LegalSection>

      <LegalSection heading="4. 개인정보의 제3자 제공">
        <p>
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 주문
          이행을 위해 다음의 경우 필요한 범위에서 제공합니다.
        </p>
        <p>
          · <strong>배송 및 제작</strong>: 포토북·인화물 제작 및 배송을 위해 제작·배송
          수행 업체에 수령인 정보(이름·연락처·주소)를 제공
        </p>
      </LegalSection>

      <LegalSection heading="5. 개인정보 처리의 위탁">
        <p>서비스는 원활한 서비스 제공을 위해 다음 업무를 위탁하고 있습니다.</p>
        <p>· <strong>Supabase</strong>: 데이터베이스·인증·파일 저장 등 인프라 운영</p>
        <p>· <strong>Vercel</strong>: 애플리케이션 호스팅</p>
        <p>· <strong>토스페이먼츠㈜</strong>: 결제 처리</p>
        <p>· <strong>Storige</strong>: 포토북 편집·합성 처리</p>
        <p>
          일부 수탁사는 해외에 서버를 둘 수 있으며, 서비스는 위탁 시 개인정보가 안전하게
          관리되도록 필요한 조치를 취합니다.
        </p>
      </LegalSection>

      <LegalSection heading="6. 정보주체의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요청할 수
          있으며, 회원 탈퇴를 통해 개인정보 수집·이용 동의를 철회할 수 있습니다.
        </p>
        <p>
          권리 행사는 서비스 내 기능 또는{" "}
          {BUSINESS_INFO.email ? (
            <a
              href={`mailto:${BUSINESS_INFO.email}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {BUSINESS_INFO.email}
            </a>
          ) : (
            "고객센터"
          )}
          {" "}로 요청할 수 있으며, 서비스는 지체 없이 조치합니다.
        </p>
      </LegalSection>

      <LegalSection heading="7. 개인정보의 파기">
        <p>
          개인정보는 보유기간이 경과하거나 처리 목적이 달성되면 지체 없이 파기합니다.
          전자적 파일은 복구·재생이 불가능한 방법으로 삭제하며, 이용자가 삭제한 사진은
          저장소에서 삭제됩니다.
        </p>
      </LegalSection>

      <LegalSection heading="8. 개인정보의 안전성 확보조치">
        <p>
          서비스는 개인정보 보호를 위해 접근권한 관리, 전송구간 암호화(HTTPS), 저장소
          접근 통제(행 수준 보안) 등 관리적·기술적 보호조치를 시행합니다.
        </p>
      </LegalSection>

      <LegalSection heading="9. 만 14세 미만 아동의 개인정보">
        <p>
          서비스는 만 14세 미만 아동의 회원가입을 원칙적으로 제한합니다. 공유방에 아동의
          사진이 포함될 수 있으므로, 이용자는 아동이 포함된 사진을 올릴 때 보호자의 동의
          등 필요한 조치를 확인해야 합니다.
        </p>
      </LegalSection>

      <LegalSection heading="10. 개인정보 보호책임자">
        <p>
          서비스는 개인정보 처리에 관한 업무를 총괄하는 개인정보 보호책임자를 두고
          있습니다.
        </p>
        {BUSINESS_INFO.privacyOfficer ? (
          <p>· 책임자: {BUSINESS_INFO.privacyOfficer}</p>
        ) : null}
        {BUSINESS_INFO.email ? (
          <p>
            · 문의:{" "}
            <a
              href={`mailto:${BUSINESS_INFO.email}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              {BUSINESS_INFO.email}
            </a>
          </p>
        ) : null}
      </LegalSection>

      <LegalSection heading="11. 고지의 의무">
        <p>
          본 개인정보처리방침의 내용 추가·삭제·수정이 있을 경우 시행 전 서비스 화면을
          통해 공지합니다.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
