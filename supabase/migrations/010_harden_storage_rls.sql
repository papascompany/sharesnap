-- 010_harden_storage_rls.sql
-- photos 버킷 SELECT(읽기) RLS 강화 — 감사 지적 대응
--
-- [배경] 007에서 photos_user_select는 "인증 사용자면 photos 버킷 전체 select 허용"이었다.
--   실제 접근 제어를 전적으로 signedUrl 발급 로직에 위임한 형태(주석: "실제 접근 제어는
--   signedUrl로 처리")라, 정책 자체로는 임의의 인증 사용자가 타인의 원본 사진을 직접
--   열람/열거할 수 있는 구멍이 있었다.
--
-- [강화] photos 버킷 원본은 "본인이 올린 폴더(첫 세그먼트 = auth.uid())"만 직접 접근 허용.
--   storage.objects RLS는 경로 기반이라 "같은 방 멤버" 검사를 정확히 하려면 path↔room
--   매핑 조인이 필요해 비용·복잡도가 크고 오설정 시 앱이 깨진다. 따라서 보수적으로
--   "본인 업로드분만 직접 접근, 타인 사진은 공개 thumbnails 버킷 또는 signedUrl 경유"
--   원칙(007 insert/delete 정책과 동일한 foldername[1]=uid 패턴)으로 좁힌다.
--
-- [현 앱 동작에 미치는 영향 = 없음]
--   업로드 경로 계약: photos 버킷에는 원본만, 경로 = {userId}/{roomId}/{photoId}.jpg
--     (photoService.uploadPhoto — userId가 첫 세그먼트). 썸네일/중간/인쇄용 리사이즈본은
--     전부 공개 thumbnails 버킷(getPublicUrl)에 올라간다.
--   • 갤러리/뷰어/포토북 externalPhotos 등 모든 "표시"는 공개 thumbnails 버킷 public URL을
--     쓰므로 이 정책의 영향을 받지 않는다(타인 사진도 정상 노출 유지).
--   • photos 버킷 원본 signedUrl(getPhotoUrl, bucket=photos)은 현재 앱에서 호출처가 없고,
--     호출되더라도 발급 주체가 본인일 때만 유효 → 본인 원본은 계속 접근 가능.
--   • upload(insert)/delete 정책은 007 그대로 유지(본인 폴더만). select만 강화한다.
--
-- ⚠ Supabase Dashboard SQL 편집기에서 실행 권장 (storage.* 권한 필요).

-- photos: 본인이 올린 폴더(첫 세그먼트 = uid)만 직접 SELECT 허용
--   (007의 "authenticated 전체 select"를 폐기하고 대체)
drop policy if exists "photos_user_select" on storage.objects;
create policy "photos_user_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- 타인 사진은 공개 thumbnails 버킷(getPublicUrl) 또는 소유자가 발급한 signedUrl 경유로 접근.
