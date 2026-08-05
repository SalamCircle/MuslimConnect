-- PostgreSQL grants EXECUTE to PUBLIC by default on CREATE FUNCTION.
-- Revoking from PUBLIC removes it from all roles including anon and authenticated.
REVOKE EXECUTE ON FUNCTION public.update_post_like_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_post_save_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_post_comment_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_community_member_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_community_post_count() FROM PUBLIC;
