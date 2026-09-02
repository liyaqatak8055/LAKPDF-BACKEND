import React, { useEffect, useRef, useState, useCallback } from "react";
import { AD_CONFIG } from "../config/adsense";
import { logger } from "../utils/logger";

interface AdUnitProps {
  /** Google AdSense ad slot ID */
  slotId: string;
  /** Additional CSS classes */
  className?: string;
  /** Ad format type */
  format?: "auto" | "rectangle" | "horizontal" | "vertical" | "fluid";
  /** Ad size */
  size?: string;
  /** Whether to lazy load the ad */
  lazy?: boolean;
  /** Delay before loading ad (ms) */
  delay?: number;
  /** Minimum container width required (px) */
  minWidth?: number;
  /** Ad layout for mobile optimization */
  layout?: "inline" | "card" | "minimal";
  /** Keep space reserved even if ad is blocked to avoid CLS */
  reserveSpace?: boolean;
}

/**
 * Performance-optimized AdUnit component for Google AdSense
 * Features: Lazy loading, error boundaries, mobile-safe sizing
 */
export const AdUnit: React.FC<AdUnitProps> = ({
  slotId,
  className = "",
  format = "auto",
  size,
  lazy = true,
  delay = AD_CONFIG.LOADING.DEFAULT_DELAY,
  minWidth = AD_CONFIG.SAFETY.MIN_WIDTH_MOBILE,
  layout = "inline",
  reserveSpace = true,
}) => {
  const adRef = useRef<HTMLDivElement | null>(null);
  const loaded = useRef(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(!lazy);
  const [hasError, setHasError] = useState(false);

  const MAX_RETRIES = 2;

  const layoutStyles = {
    inline: "max-w-[360px]",
    card: "max-w-[300px] md:max-w-[336px]",
    minimal: "max-w-[320px]",
  };
  const minHeightByLayout = {
    inline: 100,
    card: 280,
    minimal: 100,
  };

  useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0,
        rootMargin: "200px 0px",
      }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isVisible]);

  const generateQueryId = () => {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  };

  const loadAd = useCallback(() => {
    if (!adRef.current || loaded.current || hasError) return;

    const containerWidth = adRef.current.clientWidth;
    if (containerWidth < minWidth) {
      retryCount.current += 1;

      if (retryCount.current > MAX_RETRIES) {
        logger.debug("[AdUnit] Container too small, hiding ad", {
          width: containerWidth,
          minWidth,
          slotId,
        });
        return;
      }

      retryTimer.current = window.setTimeout(loadAd, 1000);
      return;
    }

    try {
      // @ts-ignore - adsbygoogle is loaded from external script
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        // @ts-ignore
        window.adsbygoogle.push({
          google_query_id: generateQueryId(),
          ad_client: AD_CONFIG.CLIENT_ID,
          ad_slot: slotId,
          format,
          layout,
        });
        loaded.current = true;
        logger.debug("[AdUnit] Ad loaded successfully", { slotId });
      }
    } catch {
      logger.debug("[AdUnit] AdSense blocked (AdBlock enabled)");
      setHasError(true);
    }
  }, [slotId, format, layout, minWidth, hasError]);

  useEffect(() => {
    if (!isVisible) return;

    const timer = window.setTimeout(loadAd, delay);

    return () => {
      clearTimeout(timer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [isVisible, delay, loadAd]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes("adsbygoogle") ||
        event.message?.includes("gpt") ||
        event.message?.includes("google") ||
        event.message?.includes("SecurityError") ||
        event.message?.includes("cross-origin") ||
        event.message?.includes("iframe") ||
        event.message?.includes("doubleclick") ||
        event.message?.includes("googlesyndication")) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason?.toString() || "";
      if (reason.includes("adsbygoogle") ||
        reason.includes("google") ||
        reason.includes("SecurityError") ||
        reason.includes("cross-origin") ||
        reason.includes("iframe")) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  if (hasError) {
    if (!reserveSpace) return null;
    return (
      <div className={`w-full flex justify-center my-4 ${className}`} aria-hidden="true">
        <div
          className={`w-full ${layoutStyles[layout]}`}
          style={{ minWidth: `${minWidth}px`, minHeight: `${minHeightByLayout[layout]}px` }}
        />
      </div>
    );
  }

  return (
    <div className={`w-full flex justify-center my-4 ${className}`} role="region" aria-label="Advertising">
      <div
        ref={adRef}
        className={`w-full ${layoutStyles[layout]} ad-container`}
        style={{ minWidth: `${minWidth}px`, minHeight: `${minHeightByLayout[layout]}px` }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: `${minHeightByLayout[layout]}px`,
          }}
          data-ad-client={AD_CONFIG.CLIENT_ID}
          data-ad-slot={slotId}
          data-ad-format={format}
          data-full-width-responsive="true"
          data-page-url={typeof window !== "undefined" ? window.location.href : ""}
        />
      </div>
    </div>
  );
};

export const AdBanner: React.FC<{ slotId: string; className?: string }> = ({ slotId, className = "" }) => (
  <AdUnit
    slotId={slotId}
    className={className}
    format="horizontal"
    minWidth={320}
    layout="minimal"
    delay={2000}
  />
);

export const AdRectangle: React.FC<{ slotId: string; className?: string }> = ({ slotId, className = "" }) => (
  <AdUnit
    slotId={slotId}
    className={className}
    format="rectangle"
    minWidth={300}
    layout="card"
    delay={2500}
  />
);

export const AdMobile: React.FC<{ slotId: string; className?: string }> = ({ slotId, className = "" }) => (
  <AdUnit
    slotId={slotId}
    className={className}
    format="auto"
    minWidth={280}
    layout="inline"
    delay={3000}
  />
);

export default AdUnit;
