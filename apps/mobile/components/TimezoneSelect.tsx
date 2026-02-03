import { View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";

type TimezoneSelectProps = {
  value: string;
  timezones: string[];
  onChange: (timezone: string) => void;
  disabled?: boolean;
};

export function TimezoneSelect({ value, timezones, onChange, disabled }: TimezoneSelectProps) {
  return (
    <View style={styles.container}>
      <Picker
        enabled={!disabled}
        selectedValue={value}
        onValueChange={(itemValue) => onChange(String(itemValue))}
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
    borderColor: "#d1d5db",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  picker: {
    width: "100%",
    height: 48,
  },
});
