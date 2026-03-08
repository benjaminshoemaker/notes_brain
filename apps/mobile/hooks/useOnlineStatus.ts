import { useEffect, useState } from "react";

type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModule = {
  fetch: () => Promise<NetInfoState>;
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
};

function getNetInfoModule(): NetInfoModule | null {
  try {
    // Delay native module resolution so Expo Go / mislinked builds do not hard crash.
    const loaded = require("@react-native-community/netinfo");
    const candidate = (loaded?.default ?? loaded) as Partial<NetInfoModule> | undefined;

    if (
      !candidate ||
      typeof candidate.fetch !== "function" ||
      typeof candidate.addEventListener !== "function"
    ) {
      console.warn("NetInfo module is missing expected APIs; defaulting to online state.");
      return null;
    }

    return candidate as NetInfoModule;
  } catch {
    console.warn("NetInfo native module unavailable; defaulting to online state.");
    return null;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isActive = true;
    const netInfo = getNetInfoModule();

    if (!netInfo) {
      return () => {
        isActive = false;
      };
    }

    let unsubscribe = () => {
      // noop
    };

    try {
      Promise.resolve(netInfo.fetch())
        .then((state) => {
          if (!isActive) return;
          const online = Boolean(state.isConnected && state.isInternetReachable !== false);
          setIsOnline(online);
        })
        .catch(() => {
          if (!isActive) return;
          setIsOnline(true);
        });

      unsubscribe = netInfo.addEventListener((state) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        setIsOnline(online);
      });
    } catch {
      console.warn("NetInfo native listeners unavailable; defaulting to online state.");
    }

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}
