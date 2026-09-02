-- Le NIF est attribué exclusivement par la séquence PostgreSQL à la création.
CREATE OR REPLACE FUNCTION public.protect_assujetti_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.identifiant IS DISTINCT FROM OLD.identifiant THEN
    RAISE EXCEPTION 'Le NIF ne peut pas être modifié après sa génération automatique.';
  END IF;

  IF NEW.cree_par_id IS DISTINCT FROM OLD.cree_par_id THEN
    RAISE EXCEPTION 'Le créateur de l''assujetti ne peut pas être modifié.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_assujetti_identifiers ON public.assujettis;
CREATE TRIGGER protect_assujetti_identifiers
BEFORE UPDATE ON public.assujettis
FOR EACH ROW EXECUTE FUNCTION public.protect_assujetti_identifiers();
