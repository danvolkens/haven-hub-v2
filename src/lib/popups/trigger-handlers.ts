type TriggerCallback = () => void;

// Exit Intent Detection
export function setupExitIntent(callback: TriggerCallback): () => void {
  const handleMouseLeave = (e: MouseEvent) => {
    // Only trigger when mouse leaves through top of viewport
    if (e.clientY <= 0) {
      callback();
    }
  };

  document.addEventListener('mouseleave', handleMouseLeave);

  return () => {
    document.removeEventListener('mouseleave', handleMouseLeave);
  };
}

// Scroll Depth Detection
export function setupScrollDepth(percentage: number, callback: TriggerCallback): () => void {
  let triggered = false;

  const handleScroll = () => {
    if (triggered) return;

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const scrollPercentage = (currentScroll / scrollHeight) * 100;

    if (scrollPercentage >= percentage) {
      triggered = true;
      callback();
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

// Time on Page Detection
export function setupTimeOnPage(seconds: number, callback: TriggerCallback): () => void {
  const timer = setTimeout(callback, seconds * 1000);

  return () => {
    clearTimeout(timer);
  };
}

// Page Views Detection (uses sessionStorage)
export function setupPageViews(count: number, callback: TriggerCallback): () => void {
  const key = 'haven_page_views';
  const currentViews = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
  sessionStorage.setItem(key, String(currentViews));

  if (currentViews >= count) {
    // Small delay to allow page to render
    const timer = setTimeout(callback, 500);
    return () => clearTimeout(timer);
  }

  return () => {};
}

// Click Trigger
export function setupClickTrigger(selector: string, callback: TriggerCallback): () => void {
  const handleClick = (e: Event) => {
    const target = e.target as Element;
    if (target.matches(selector) || target.closest(selector)) {
      callback();
    }
  };

  document.addEventListener('click', handleClick);

  return () => {
    document.removeEventListener('click', handleClick);
  };
}
