import { Component, type ReactNode, useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShareIntentProvider } from "expo-share-intent";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

import { queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabaseClient";
import { OfflineBanner } from "../components/OfflineBanner";
import { ShareHandler } from "../components/ShareHandler";

type ErrorBoundaryProps = {
  children: ReactNode;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Unexpected error:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>We hit an unexpected error. Try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={this.handleReset}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle auth state changes if needed
      console.log("Auth state changed:", event, session?.user?.email);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <RootErrorBoundary onReset={reset}>
                <OfflineBanner />
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                />
                <ShareHandler />
                <StatusBar style="auto" />
              </RootErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  errorText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
