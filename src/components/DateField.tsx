import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { fromIso, prettyDate, toIso } from "../pos/format";
import { Button, COLORS, Icon, Sheet } from "./ui";

/** A tappable date input that opens the platform date picker and stores YYYY-MM-DD. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  minimumDate,
  maximumDate,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(fromIso(value) ?? new Date());

  function show() {
    const current = fromIso(value) ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => onChange(toIso(date)),
      });
      return;
    }
    setDraft(current);
    setOpen(true);
  }

  return (
    <View className="flex-1 gap-1.5">
      {label ? <Text className="text-sm font-medium text-body">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        onPress={show}
        className="h-12 flex-row items-center rounded-lg border border-line bg-surface px-3 active:bg-canvas"
      >
        <Icon name="calendar-outline" size={18} color={COLORS.faint} />
        <Text className={`ml-2 flex-1 text-base ${value ? "text-ink" : "text-faint"}`}>{value ? prettyDate(value) : placeholder}</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <Sheet visible={open} title={label ?? "Choose a date"} onClose={() => setOpen(false)}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_event, date) => setDraft(date)}
          />
          <Button
            label="Done"
            onPress={() => {
              onChange(toIso(draft));
              setOpen(false);
            }}
          />
        </Sheet>
      ) : null}
    </View>
  );
}
