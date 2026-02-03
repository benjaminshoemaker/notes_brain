import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isActive = true;

    NetInfo.fetch().then((state) => {
      if (!isActive) return;
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return isOnline;
}
