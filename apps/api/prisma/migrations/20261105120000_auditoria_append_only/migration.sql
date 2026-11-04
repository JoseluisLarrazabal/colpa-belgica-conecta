-- RF-10: el registro de auditoría es solo de inserción; ni la API ni SQL directo pueden modificarlo o borrarlo.
CREATE FUNCTION registro_auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'registro_auditoria es de solo inserción';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registro_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON "registro_auditoria"
  FOR EACH ROW EXECUTE FUNCTION registro_auditoria_inmutable();
