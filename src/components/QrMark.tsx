import qrcode from "qrcode-generator";
import { View } from "react-native";

export function QrMark({ value }: { value: string }) {
  const code = qrcode(0, "M");
  code.addData(value);
  code.make();
  const count = code.getModuleCount();
  const cell = 5;
  return (
    <View className="self-center rounded-2xl bg-paper p-3">
      {Array.from({ length: count }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: count }, (_, column) => (
            <View
              key={column}
              style={{
                width: cell,
                height: cell,
                backgroundColor: code.isDark(row, column) ? "#022c22" : "#ffffff",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
