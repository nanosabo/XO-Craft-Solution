import { RefObject, useEffect, useState } from "react";

interface ScrollFade {
  top: boolean;
  bottom: boolean;
}

/**
 * Tracks whether the scroll container has content hidden above or below.
 * Re-checks on scroll, resize and when the tab content is replaced.
 */
const useScrollFade = (ref: RefObject<HTMLElement>): ScrollFade => {
  const [fade, setFade] = useState<ScrollFade>({
    top: false,
    bottom: false,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      const next = {
        top: element.scrollTop > 1,
        bottom: maxScroll - element.scrollTop > 1,
      };

      setFade((prev) =>
        prev.top === next.top && prev.bottom === next.bottom ? prev : next,
      );
    };

    update();
    element.addEventListener("scroll", update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);

    const contentObserver = new ResizeObserver(update);
    let observedContent: Element | null = null;

    const observeContent = () => {
      const content = element.firstElementChild;

      if (content === observedContent) return;

      if (observedContent) contentObserver.unobserve(observedContent);
      observedContent = content;

      if (content) contentObserver.observe(content);
      update();
    };

    observeContent();

    const mutationObserver = new MutationObserver(observeContent);
    mutationObserver.observe(element, { childList: true });

    return () => {
      element.removeEventListener("scroll", update);
      resizeObserver.disconnect();
      contentObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  return fade;
};

export default useScrollFade;
