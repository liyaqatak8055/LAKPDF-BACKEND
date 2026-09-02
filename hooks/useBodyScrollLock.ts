import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let previousBodyStyles: Partial<CSSStyleDeclaration> | null = null;

const lockBodyScroll = () => {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;

    previousBodyStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      left: document.body.style.left,
      right: document.body.style.right,
      paddingRight: document.body.style.paddingRight,
    };

    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    document.body.classList.add('modal-open');

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.left = '0';
    document.body.style.right = '0';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
};

const unlockBodyScroll = () => {
  lockCount = Math.max(0, lockCount - 1);

  if (lockCount !== 0) return;

  document.body.classList.remove('modal-open');

  if (previousBodyStyles) {
    document.body.style.overflow = previousBodyStyles.overflow || '';
    document.body.style.position = previousBodyStyles.position || '';
    document.body.style.top = previousBodyStyles.top || '';
    document.body.style.width = previousBodyStyles.width || '';
    document.body.style.left = previousBodyStyles.left || '';
    document.body.style.right = previousBodyStyles.right || '';
    document.body.style.paddingRight = previousBodyStyles.paddingRight || '';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.paddingRight = '';
  }

  window.scrollTo(0, savedScrollY);
};

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
};
