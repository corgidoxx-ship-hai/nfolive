REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON public.game_vote_counts FROM anon, authenticated;
REVOKE ALL ON public.public_donation_info FROM anon, authenticated;
GRANT SELECT ON public.game_vote_counts TO anon, authenticated;
GRANT SELECT ON public.public_donation_info TO anon, authenticated;