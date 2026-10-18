-- Marca só as contas criadas a partir de agora como precisando enviar foto
-- de perfil obrigatoriamente. Contas que já existem ficam com false (valor
-- padrão da coluna), então não são bloqueadas retroativamente.
ALTER TABLE public.profiles ADD COLUMN requires_avatar_setup boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, username, requires_avatar_setup)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 0, 5),
    true
  );
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Falha ao criar o perfil para o novo usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;
