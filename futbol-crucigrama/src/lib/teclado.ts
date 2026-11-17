import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Ayudas para cuando se abre el teclado del celular en la versión web.

// Desplaza un elemento al principio de la zona visible, después de que el
// teclado termina de abrirse (si no, el navegador vuelve a mover la pantalla).
export function scrollToTop(target: unknown) {
  if (Platform.OS !== 'web') return;
  const el = target as { scrollIntoView?: (opts: object) => void } | null;
  setTimeout(() => el?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }), 350);
}

function isTextField(el: Element | null) {
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

// true mientras hay un campo de texto con foco (o sea, el teclado está abierto).
export function useTyping() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const update = () => setTimeout(() => setTyping(isTextField(document.activeElement)), 50);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  return typing;
}
