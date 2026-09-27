import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackDropOffStepForPath, trackPageView } from "../utils/analytics";
import { isToolRoute, recordToolOpen } from "../utils/toolUsage";

export const RouteAnalyticsTracker: React.FC = () => {
  const location = useLocation();
  const previousPathRef = useRef<string>("");

  useEffect(() => {
    const currentPath = location.pathname;
    if (previousPathRef.current && previousPathRef.current !== currentPath) {
      trackDropOffStepForPath(previousPathRef.current);
    }

    trackPageView({
      path: currentPath,
      title: document.title || "LAK PDF",
    });

    if (isToolRoute(currentPath) && previousPathRef.current !== currentPath) {
      recordToolOpen(currentPath, "route_visit");
    }

    previousPathRef.current = currentPath;
  }, [location.pathname]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const currentPath = window.location.pathname || "";
      trackDropOffStepForPath(currentPath);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return null;
};
