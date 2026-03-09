import { Platform, StyleSheet, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { colors, radii } from "../lib/theme";

type TimezoneSelectProps = {
  value: string;
  timezones: string[];
  onChange: (timezone: string) => void;
  disabled?: boolean;
  testID?: string;
};

export function TimezoneSelect({ value, timezones, onChange, disabled, testID }: TimezoneSelectProps) {
  return (
    <View style={styles.container}>
      <Picker
        testID={testID}
        enabled={!disabled}
        selectedValue={value}
        onValueChange={(itemValue) => onChange(String(itemValue))}
        dropdownIconColor={colors.textSecondary}
        style={styles.picker}
      >
        {timezones.map((timezone) => (
          <Picker.Item key={timezone} label={timezone} value={timezone} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    minHeight: Platform.OS === "android" ? 52 : 48,
    justifyContent: "center",
  },
  picker: {
    width: "100%",
    height: Platform.OS === "android" ? 52 : 48,
    color: colors.text,
  },
});
