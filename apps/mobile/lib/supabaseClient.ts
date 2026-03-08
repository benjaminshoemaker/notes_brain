import { createSupabaseClient } from "@notesbrain/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

const SECURESTORE_SAFE_VALUE_LIMIT = 1800;
const ASYNC_POINTER_PREFIX = "__async_storage__:";

function getAsyncMirrorKey(key: string): string {
  return `sb-async-mirror:${key}`;
}

async function readWithOverflowSupport(key: string): Promise<string | null> {
  const secureValue = await SecureStore.getItemAsync(key);

  if (!secureValue) {
    return null;
  }

  if (!secureValue.startsWith(ASYNC_POINTER_PREFIX)) {
    return secureValue;
  }

  const asyncKey = secureValue.slice(ASYNC_POINTER_PREFIX.length);
  if (!asyncKey) {
    return null;
  }

  return AsyncStorage.getItem(asyncKey);
}

async function writeWithOverflowSupport(key: string, value: string): Promise<void> {
  const asyncMirrorKey = getAsyncMirrorKey(key);

  if (value.length > SECURESTORE_SAFE_VALUE_LIMIT) {
    await AsyncStorage.setItem(asyncMirrorKey, value);
    await SecureStore.setItemAsync(key, `${ASYNC_POINTER_PREFIX}${asyncMirrorKey}`);
    return;
  }

  await AsyncStorage.removeItem(asyncMirrorKey);
  await SecureStore.setItemAsync(key, value);
}

async function removeWithOverflowSupport(key: string): Promise<void> {
  const asyncMirrorKey = getAsyncMirrorKey(key);
  const secureValue = await SecureStore.getItemAsync(key);

  if (secureValue?.startsWith(ASYNC_POINTER_PREFIX)) {
    const pointerKey = secureValue.slice(ASYNC_POINTER_PREFIX.length);
    if (pointerKey) {
      await AsyncStorage.removeItem(pointerKey);
    }
  }

  await AsyncStorage.removeItem(asyncMirrorKey);
  await SecureStore.deleteItemAsync(key);
}

// Custom storage adapter that keeps secrets in SecureStore and spills oversized payloads to AsyncStorage.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return readWithOverflowSupport(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await writeWithOverflowSupport(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await removeWithOverflowSupport(key);
  },
};

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
