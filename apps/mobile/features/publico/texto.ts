/** Sin persistencia local todavía: solo se avisa de lo que es cierto. */
export const SIN_RED_HABITANTE = 'Sin conexión · lo que ve puede no estar al día';

/** Instante de respuesta más antiguo entre las lecturas mostradas: el sello no debe aparentar más frescura de la real. */
export const masAntiguo = (...generadoEn: (string | undefined)[]): Date | null => {
  const t = generadoEn.filter((g): g is string => !!g).map((g) => Date.parse(g));
  return t.length ? new Date(Math.min(...t)) : null;
};
