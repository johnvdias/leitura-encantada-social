-- Remove a função e o gatilho antigos para garantir uma substituição limpa.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Cria uma nova função, mais robusta, para lidar com a criação de novos usuários.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com os privilégios do definidor, necessário para acessar auth.users.
AS $$
BEGIN
  -- Tenta inserir o novo perfil.
  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (
    NEW.id,
    -- Usa o display_name dos metadados, se disponível, senão usa a parte local do email.
    NEW.raw_user_meta_data ->> 'display_name',
    -- Define o username inicial como a parte local do email, garantindo que seja único.
    split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 0, 5)
  );
  RETURN NEW;

EXCEPTION
  -- Captura qualquer exceção (ex: violação de chave única se o username já existir) e a registra.
  -- Isso impede que um erro na criação do perfil impeça o login do usuário.
  WHEN OTHERS THEN
    RAISE WARNING 'Falha ao criar o perfil para o novo usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recria o gatilho para chamar a nova função após a inserção de um novo usuário.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria um perfil para um novo usuário e lida com possíveis erros de forma graciosa.';
