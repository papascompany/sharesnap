-- 007_create_storage_buckets.sql
-- Storage 버킷 생성 + 정책
-- ⚠ Supabase Dashboard SQL 편집기에서 실행 권장 (storage.* 권한 필요)

insert into storage.buckets (id, name, public)
values
  ('photos', 'photos', false),
  ('thumbnails', 'thumbnails', true),
  ('resources', 'resources', true),
  ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

-- photos: 인증된 사용자가 자신의 폴더(user-id로 시작)에만 업로드 가능
drop policy if exists "photos_user_insert" on storage.objects;
create policy "photos_user_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos_user_select" on storage.objects;
create policy "photos_user_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');
-- 실제 접근 제어는 signedUrl로 처리

drop policy if exists "photos_user_delete" on storage.objects;
create policy "photos_user_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- thumbnails: 공개 읽기, 인증 사용자만 자신의 폴더에 쓰기
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "thumbnails_user_write" on storage.objects;
create policy "thumbnails_user_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- resources: 공개 읽기 (관리자가 업로드)
drop policy if exists "resources_public_read" on storage.objects;
create policy "resources_public_read" on storage.objects
  for select using (bucket_id = 'resources');

-- pdfs: 인증 사용자만 읽기 (signed URL 권장)
drop policy if exists "pdfs_user_read" on storage.objects;
create policy "pdfs_user_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pdfs');
