-- 013_delete_policies_cleanup.sql
-- 감사(docs/service-flow-audit.md) 대응 — 삭제 파기 정책 공백 2건
--   P0-D: 삭제한 사진의 공개 썸네일 3종(thumb/medium/print 3600px)이 DELETE RLS 부재로 영구 잔존
--   P2:   유령 draft 인화주문 — print_orders DELETE 정책 부재로 롤백 delete가 조용히 실패
-- ⚠ storage.* 정책은 Supabase Dashboard SQL 편집기에서 실행 권장(storage 스키마 권한 필요).

-- ============================================================
-- 1) thumbnails 버킷 DELETE 정책 — 본인 폴더(파일 경로 첫 세그먼트=uid)만 삭제 허용
--    (007의 thumbnails_user_write와 동일한 foldername[1]=uid 패턴)
--    이 정책이 있어야 photoService.deletePhoto의 Storage 삭제가 실제로 통과된다.
--    ※ 방장이 '타인' 사진을 삭제하는 경로(RLS는 허용하나 storage 폴더는 업로더 소유)는
--      후속 service_role 서버 라우트로 일원화 필요 — 본 마이그레이션 범위 밖(문서화).
-- ============================================================
drop policy if exists "thumbnails_user_delete" on storage.objects;
create policy "thumbnails_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 2) print_orders — 본인 소유 + draft 상태만 DELETE 허용
--    printOrderService의 '항목 저장 실패 시 주문 롤백 delete'가 정책상 통과되도록.
--    draft 한정이라 결제/진행 주문 이력 보존 원칙은 유지된다.
-- ============================================================
drop policy if exists "print_orders_owner_draft_delete" on public.print_orders;
create policy "print_orders_owner_draft_delete" on public.print_orders
  for delete to authenticated
  using (user_id = auth.uid() and status = 'draft');

-- ============================================================
-- 3) (선택·수동) 지금까지 쌓인 고아 썸네일 1회 정리
--    photos 테이블에 참조가 없는 thumbnails 객체를 회수한다.
--    ⚠ 되돌릴 수 없으므로 먼저 SELECT로 대상 건수를 확인한 뒤 DELETE를 실행할 것.
--    경로 규칙: thumbnails 객체 name = '<uid>/<...>' 이고, photos의 thumbnail_path/medium_path/print_path와 매칭.
--
--    -- (a) 정리 대상 미리보기
--    -- select o.name
--    --   from storage.objects o
--    --   where o.bucket_id = 'thumbnails'
--    --     and not exists (
--    --       select 1 from public.photos p
--    --       where o.name in (p.thumbnail_path, p.medium_path, p.print_path)
--    --     );
--
--    -- (b) 확인 후 실제 삭제
--    -- delete from storage.objects o
--    --   where o.bucket_id = 'thumbnails'
--    --     and not exists (
--    --       select 1 from public.photos p
--    --       where o.name in (p.thumbnail_path, p.medium_path, p.print_path)
--    --     );
