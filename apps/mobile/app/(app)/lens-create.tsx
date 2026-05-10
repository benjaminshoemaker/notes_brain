import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, type Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { testIds } from "../../lib/testIds";
import { colors, radii, shadows, spacing } from "../../lib/theme";

const LENS_FORM_ROUTE = "/(app)/lens-form" as Href;
const LENS_LIBRARY_ROUTE = "/(app)/lens-library" as Href;

export default function LensCreateScreen() {
  const router = useRouter();

  return (
    <View testID={testIds.lens.create.screen} style={styles.container}>
      <Stack.Screen
        options={{
          title: "New Lens",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a custom lens"
          testID={testIds.lens.create.customButton}
          onPress={() => {
            router.push(LENS_FORM_ROUTE);
          }}
          style={styles.option}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="create-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Create your own</Text>
            <Text style={styles.optionDescription}>Start with a blank editable lens.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse lens library"
          testID={testIds.lens.create.libraryButton}
          onPress={() => {
            router.push(LENS_LIBRARY_ROUTE);
          }}
          style={styles.option}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="library-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Browse Lens Library</Text>
            <Text style={styles.optionDescription}>Add a curated lens you can edit anytime.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  option: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadows.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentLight,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
