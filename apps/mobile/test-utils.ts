import { hoyLaPaz } from '@colpa/shared';

/** 'AAAA-MM-DD' de hoy (La Paz) + n días. */
export const enDias = (n: number) => hoyLaPaz(new Date(Date.now() + n * 86_400_000));
