import './env';
import { crearApp } from './app';

const puerto = Number(process.env['PORT'] ?? 3000);
crearApp().listen(puerto, () => console.log(`API escuchando en :${puerto}`));
